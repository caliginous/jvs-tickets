import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { send } from '../../../lib/send';

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

        // CAPACITY CHECK: Validate capacity for free events
        console.log('🔒 Checking ticket capacity for free event...');
        
        // Step 1: Check GLOBAL ticket limit on EventDate
        const eventDateRecord = eventDateForSaleCheck;
        
        if (eventDateRecord?.totalTicketLimit !== null && eventDateRecord?.totalTicketLimit !== undefined) {
            const totalTicketsRequested = tickets.reduce((sum: number, t: any) => sum + t.amount, 0);
            
            // Count ALL tickets already sold/reserved for this event date (across all ticket types)
            // Include PARTIALLY_REFUNDED as those tickets are still valid
            const totalSoldAndReserved = await prisma.ticket.count({
                where: {
                    order: {
                        eventDateId: eventDateIdParsed,
                        status: { in: ['CONFIRMED', 'PAID', 'COMPLETED', 'PENDING', 'PARTIALLY_REFUNDED'] }
                    }
                }
            });
            
            const globalAvailable = eventDateRecord.totalTicketLimit - totalSoldAndReserved;
            
            console.log(`🌐 Global limit check: limit=${eventDateRecord.totalTicketLimit}, sold=${totalSoldAndReserved}, available=${globalAvailable}, requested=${totalTicketsRequested}`);
            
            if (totalTicketsRequested > globalAvailable) {
                console.error(`❌ Global ticket limit exceeded: requested ${totalTicketsRequested}, available ${globalAvailable}`);
                return res.status(409).json({ 
                    error: globalAvailable <= 0 
                        ? 'Sorry, this event is sold out'
                        : `Sorry, only ${globalAvailable} ticket(s) remaining for this event`,
                    remainingCapacity: globalAvailable
                });
            }
            
            console.log(`✅ Global ticket limit check passed`);
        }
        
        // Step 2: Check individual ticket type capacity limits
        for (const ticket of tickets) {
            const ticketTypeId = ticket.categoryId || ticket.eventTicketTypeId;
            
            if (!ticketTypeId) {
                console.error('❌ No ticket type ID provided');
                return res.status(400).json({ error: 'Ticket type ID required' });
            }
            
            // Get ticket type with capacity
            const ticketType = await prisma.eventTicketType.findUnique({
                where: { id: ticketTypeId },
                select: { capacity: true, name: true }
            });
            
            if (!ticketType) {
                console.error(`❌ Ticket type ${ticketTypeId} not found`);
                return res.status(400).json({ error: 'Ticket type not found' });
            }
            
            // If capacity is set, check availability (including PENDING orders)
            // Include PARTIALLY_REFUNDED as those tickets are still valid
            if (ticketType.capacity !== null) {
                const soldAndReserved = await prisma.ticket.count({
                    where: {
                        eventTicketTypeId: ticketTypeId,
                        order: {
                            status: { in: ['CONFIRMED', 'PAID', 'COMPLETED', 'PENDING', 'PARTIALLY_REFUNDED'] }
                        }
                    }
                });
                
                const available = ticketType.capacity - soldAndReserved;
                
                if (ticket.amount > available) {
                    console.error(`❌ Insufficient capacity for ${ticketType.name}: requested ${ticket.amount}, available ${available}`);
                    return res.status(409).json({ 
                        error: `Sorry, only ${available} ${ticketType.name} ticket(s) remaining`,
                        remainingCapacity: available
                    });
                }
                
                console.log(`✅ Capacity available for ${ticketType.name}: ${ticket.amount} requested, ${available} available`);
            }
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

        // Create tickets using EventTicketTypes (preferred) or fallback to categories
        const createdTickets = [];
        for (const ticketData of tickets) {
            console.log(`Creating tickets for: categoryId=${ticketData.categoryId}, eventTicketTypeId=${ticketData.eventTicketTypeId}`);
            
            let eventTicketTypeId = ticketData.eventTicketTypeId;
            
            // If no eventTicketTypeId provided, try to find one based on categoryId
            if (!eventTicketTypeId && ticketData.categoryId) {
                console.log(`Looking for EventTicketType for categoryId ${ticketData.categoryId}...`);
                
                // Find EventTicketType for this event that matches the legacy category
                const eventTicketType = await prisma.eventTicketType.findFirst({
                    where: {
                        eventId: (await prisma.eventDate.findUnique({
                            where: { id: parseInt(eventDateId) },
                            select: { eventId: true }
                        }))?.eventId,
                        isActive: true
                    },
                    orderBy: { sortOrder: 'asc' }
                });
                
                if (eventTicketType) {
                    eventTicketTypeId = eventTicketType.id;
                    console.log(`Found EventTicketType ${eventTicketTypeId} for event`);
                } else {
                    console.warn(`No EventTicketType found for categoryId ${ticketData.categoryId}, event will fail`);
                }
            }

            const ticketCreateData: any = {
                orderId: order.id,
                amount: ticketData.amount,
                currency: 'GBP'
            };

            // Prefer EventTicketType over legacy category
            if (eventTicketTypeId) {
                ticketCreateData.eventTicketTypeId = eventTicketTypeId;
            } else if (ticketData.categoryId) {
                // Only use categoryId if the category actually exists
                const categoryExists = await prisma.category.findUnique({
                    where: { id: ticketData.categoryId }
                });
                
                if (categoryExists) {
                    ticketCreateData.categoryId = ticketData.categoryId;
                } else {
                    throw new Error(`Category ${ticketData.categoryId} does not exist and no EventTicketType found`);
                }
            } else {
                throw new Error('No valid ticket type or category found');
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
            
            // Increment sold counter for this ticket type (free events are immediately CONFIRMED)
            if (eventTicketTypeId) {
                await prisma.eventTicketType.update({
                    where: { id: eventTicketTypeId },
                    data: { sold: { increment: ticketData.amount } }
                });
                console.log(`Incremented sold count for ticket type ${eventTicketTypeId} by ${ticketData.amount}`);
            }
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
