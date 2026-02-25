import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { send } from '../../../lib/send';
import { checkCapacityForOrder } from '../../../lib/services/ticketing/availability';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('=== FREE EVENT REGISTRATION API START ===');
        console.log('Request body:', req.body);

        const { tickets, eventDateId, eventName, eventDate, customerEmail, customerData } = req.body;

        // Validate required fields
        if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
            return res.status(400).json({ error: 'Tickets are required' });
        }

        if (!eventDateId || !customerEmail) {
            return res.status(400).json({ error: 'Event date and customer email are required' });
        }

        if (!customerData || !customerData.firstName || !customerData.lastName) {
            return res.status(400).json({ error: 'Customer data incomplete' });
        }

        // Verify this is indeed a free event
        const totalAmount = tickets.reduce((sum, ticket) => sum + (ticket.price * ticket.amount), 0);
        if (totalAmount !== 0) {
            return res.status(400).json({ error: 'This endpoint is only for free events' });
        }

        console.log('✅ Free event validation passed');

        const eventDateIdParsed = parseInt(eventDateId);

        // TICKET SALE END DATE CHECK: Validate sales haven't ended
        console.log('🕐 Checking ticket sale end date...');
        
        const eventDateForSaleCheck = await prisma.eventDate.findUnique({
            where: { id: eventDateIdParsed },
            select: { ticketSaleEndDate: true, totalTicketLimit: true }
        });
        
        if (eventDateForSaleCheck?.ticketSaleEndDate) {
            const now = new Date();
            const saleEndDate = new Date(eventDateForSaleCheck.ticketSaleEndDate);
            
            if (now > saleEndDate) {
                console.error(`❌ Ticket sales have ended: sale ended at ${saleEndDate.toISOString()}, current time ${now.toISOString()}`);
                return res.status(409).json({ 
                    error: 'Sorry, ticket sales for this event have ended',
                    saleEndDate: saleEndDate.toISOString()
                });
            }
            console.log(`✅ Ticket sale end date check passed: sales end at ${saleEndDate.toISOString()}`);
        }

        // CAPACITY CHECK: Use canonical availability service
        console.log('🔒 Checking ticket capacity for free event...');
        
        // Validate ticket type IDs first
        for (const ticket of tickets) {
            const ticketTypeId = ticket.ticketTypeId || ticket.eventTicketTypeId;
            if (!ticketTypeId) {
                console.error('❌ No ticket type ID provided');
                return res.status(400).json({ error: 'ticketTypeId or eventTicketTypeId required' });
            }
        }
        
        const capacityItems = tickets.map((t: any) => ({
            eventTicketTypeId: t.ticketTypeId || t.eventTicketTypeId,
            quantity: t.amount
        }));
        
        const capacityCheck = await checkCapacityForOrder(eventDateIdParsed, capacityItems);
        
        if (!capacityCheck.success) {
            const errorMessage = 'error' in capacityCheck ? capacityCheck.error : 'Capacity check failed';
            const errorDetails = 'details' in capacityCheck ? capacityCheck.details : undefined;
            console.error(`❌ Capacity check failed: ${errorMessage}`);
            return res.status(409).json({ 
                error: errorMessage,
                details: errorDetails
            });
        }
        
        console.log('✅ All capacity checks passed, creating order...');

        // Create or find user
        let user = await prisma.user.findFirst({
            where: { email: customerEmail }
        });

        if (!user) {
            console.log('Creating new user for free event registration...');
            user = await prisma.user.create({
                data: {
                    firstName: customerData.firstName,
                    lastName: customerData.lastName,
                    email: customerEmail,
                    phone: customerData.phone || '',
                    address: customerData.address || '',
                    zip: customerData.zip || '',
                    city: customerData.city || '',
                    countryCode: customerData.countryCode || 'GB',
                    regionCode: customerData.regionCode || '',
                    // Also save to user for convenience (autofill on return)
                    customFields: customerData.customFields ? JSON.stringify(customerData.customFields) : null
                }
            });
        } else {
            // Update existing user's custom fields for autofill convenience
            console.log('Updating existing user custom fields...');
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    customFields: customerData.customFields ? JSON.stringify(customerData.customFields) : null
                }
            });
        }

        // Create order for free event
        const orderId = `free-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const order = await prisma.order.create({
            data: {
                id: orderId,
                userId: user.id,
                eventDateId: parseInt(eventDateId),
                paymentType: 'Free',
                status: 'CONFIRMED', // Free events are automatically confirmed
                shipping: JSON.stringify({
                    type: 'download',
                    firstName: customerData.firstName,
                    lastName: customerData.lastName,
                    email: customerEmail
                }),
                locale: 'en-GB',
                originalTotal: 0,
                finalTotal: 0,
                idempotencyKey: orderId,
                cancellationSecret: Math.random().toString(36).substr(2, 15),
                // Store custom fields on the order for this specific purchase
                customFields: customerData.customFields ? JSON.stringify(customerData.customFields) : null
            }
        });

        // Create tickets using EventTicketTypes
        const createdTickets = [];
        for (const ticketData of tickets) {
            const eventTicketTypeId = ticketData.ticketTypeId || ticketData.eventTicketTypeId;
            
            console.log(`Creating tickets for eventTicketTypeId=${eventTicketTypeId}`);
            
            if (!eventTicketTypeId) {
                console.error('No ticket type ID provided');
                throw new Error('ticketTypeId or eventTicketTypeId required');
            }

            const ticketCreateData: any = {
                orderId: order.id,
                amount: ticketData.amount,
                currency: 'GBP',
                eventTicketTypeId
            };

            // Validate ticket type exists (should not reach here given earlier check)
            if (!eventTicketTypeId) {
                throw new Error('No valid ticket type (eventTicketTypeId) found');
            }

            for (let i = 0; i < ticketData.amount; i++) {
                const ticket = await prisma.ticket.create({
                    data: {
                        ...ticketCreateData,
                        secret: Math.random().toString(36).substring(2, 15),
                        firstName: customerData.firstName,
                        lastName: customerData.lastName
                    }
                });
                createdTickets.push(ticket);
            }
            
            // NOTE: EventTicketType.sold is deprecated and no longer updated.
            // Availability is computed dynamically from Ticket rows via availability service.
        }

        console.log(`✅ Created ${createdTickets.length} free tickets for order ${order.id}`);

        // Send confirmation email using modern email system
        try {
            const { EmailTriggerService } = await import('../../../lib/services/emailTriggerService');
            const emailService = new EmailTriggerService();

            // Get event details for email
            const eventData = await prisma.eventDate.findUnique({
                where: { id: parseInt(eventDateId) },
                include: { 
                    event: {
                        include: {
                            venue: true
                        }
                    }
                }
            });

            if (eventData && eventData.event) {
                console.log(`Sending modern confirmation email for free event ${order.id}...`);
                console.log(`Event data:`, {
                    title: eventData.event.title,
                    date: eventData.date,
                    venue: eventData.event.venue?.name
                });
                
                const emailResult = await emailService.sendBookingConfirmation({
                    userEmail: customerEmail,
                    userFirstName: customerData.firstName,
                    userLastName: customerData.lastName,
                    eventTitle: eventData.event.title,
                    eventDate: eventData.date ? eventData.date.toLocaleDateString('en-GB', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        timeZone: 'Europe/London'
                    }) : 'Date TBD',
                    eventTime: eventData.date ? eventData.date.toLocaleTimeString('en-GB', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        timeZone: 'Europe/London'
                    }) : 'Time TBD',
                    eventLocation: eventData.event.venue?.name || 'Venue TBD',
                    bookingId: order.id,
                    seats: createdTickets.length,
                    locale: 'en-GB',
                    total: 'FREE',
                    eventBespokeMessage: eventData.event.bespokeMessage || undefined
                });

                console.log(`Modern email result:`, emailResult);
                
                if (emailResult.success) {
                    console.log(`✅ Modern confirmation email sent for free event registration ${order.id}`);
                } else {
                    console.warn(`⚠️ Modern email failed (${emailResult.error}), trying legacy system...`);
                    await send(order.id);
                    console.log(`✅ Legacy email sent as fallback for order ${order.id}`);
                }
            } else {
                console.warn(`⚠️ Event data not found, using legacy email system`);
                await send(order.id);
            }
        } catch (emailError) {
            console.warn(`⚠️ Modern email system failed, trying legacy:`, emailError.message);
            try {
                await send(order.id);
                console.log(`✅ Legacy confirmation email sent for free event registration ${order.id}`);
            } catch (legacyError) {
                console.warn(`⚠️ Both email systems failed:`, legacyError.message);
                // Don't fail the registration for email issues
            }
        }

        // Track free event registration
        console.log(`[analytics/free_event_registration] ${JSON.stringify({
            transaction_id: order.id,
            event_name: eventName || 'Unknown Event',
            event_date: eventDate,
            ticket_count: createdTickets.length,
            customer_email: customerEmail,
            registration_type: 'free_event'
        })}`);

        return res.status(200).json({
            success: true,
            orderId: order.id,
            message: 'Free event registration successful',
            tickets: createdTickets.length
        });

    } catch (error) {
        console.error('❌ Error processing free event registration:', error);
        return res.status(500).json({ 
            error: 'Failed to process registration',
            details: error.message 
        });
    }
}
