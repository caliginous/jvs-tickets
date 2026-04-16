import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { send } from '../../../lib/send';
import { checkCapacityForOrder } from '../../../lib/services/ticketing/availability';
import { validateClaimSession } from '../../../lib/services/waitlist/claimSessionValidator';
import { computeOrderTotals, PricingError } from '../../../lib/services/pricing/computeOrderTotals';

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

        const eventDateIdParsed = parseInt(eventDateId);

        // TRUSTED FREE-EVENT CHECK: recompute totals from DB prices. Reject if any price > 0
        // in the catalog, regardless of what the client sent.
        try {
            const pricing = await computeOrderTotals({
                eventDateId: eventDateIdParsed,
                tickets: tickets.map((t: any) => ({
                    ticketTypeId: t.ticketTypeId || t.eventTicketTypeId,
                    amount: t.amount
                }))
            });
            if (pricing.originalTotal !== 0) {
                console.error('❌ free-event endpoint called for paid event', {
                    eventDateId: eventDateIdParsed,
                    originalTotal: pricing.originalTotal
                });
                return res.status(400).json({ error: 'This endpoint is only for free events' });
            }
        } catch (e) {
            if (e instanceof PricingError) {
                return res.status(e.status).json({ error: e.message });
            }
            throw e;
        }

        console.log('✅ Free event validation passed');

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

        // Validate ticket type IDs
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

        // WAITLIST CLAIM SESSION: check for controlled capacity bypass
        const { claimSessionToken } = req.body;
        let claimSessionValidation: Awaited<ReturnType<typeof validateClaimSession>> | null = null;

        if (claimSessionToken) {
            console.log('🎫 Validating waitlist claim session for free event...');
            claimSessionValidation = await validateClaimSession({
                claimSessionToken,
                eventDateId: eventDateIdParsed,
                tickets: capacityItems,
            });

            if (!claimSessionValidation.valid) {
                const validationError = 'error' in claimSessionValidation ? claimSessionValidation.error : 'Validation failed';
                console.error(`❌ Claim session validation failed: ${validationError}`);
                return res.status(400).json({ error: validationError });
            }

            console.log('✅ Waitlist claim session validated for free event - bypassing capacity check');
        }

        // CAPACITY CHECK: Use canonical availability service (skipped for valid claim sessions)
        if (!claimSessionValidation?.valid) {
            console.log('🔒 Checking ticket capacity for free event...');
            
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

        const orderId = `free-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const cancellationSecret = Math.random().toString(36).substr(2, 15);

        // Build ticket row data
        const ticketRowInputs: Array<{ eventTicketTypeId: number; amount: number }> = [];
        for (const ticketData of tickets) {
            const eventTicketTypeId = ticketData.ticketTypeId || ticketData.eventTicketTypeId;
            if (!eventTicketTypeId) throw new Error('ticketTypeId or eventTicketTypeId required');
            for (let i = 0; i < ticketData.amount; i++) {
                ticketRowInputs.push({ eventTicketTypeId, amount: ticketData.amount });
            }
        }

        let order: any;
        let createdTickets: any[] = [];

        if (claimSessionValidation?.valid) {
            // WAITLIST PATH: order + tickets + offer fulfilment in ONE transaction
            const result = await prisma.$transaction(async (tx) => {
                // Re-validate inside transaction
                const cs = await tx.waitlistClaimSession.findUnique({ where: { id: claimSessionValidation.claimSession.id } });
                if (!cs || cs.usedAt || new Date() >= cs.expiresAt) throw new Error('Claim session no longer valid');
                const offer = await tx.waitlistOffer.findUnique({ where: { id: claimSessionValidation.offer.id } });
                if (!offer || offer.status !== 'ACTIVE' || new Date() >= offer.expiresAt) throw new Error('Offer no longer valid');

                const newOrder = await tx.order.create({
                    data: {
                        id: orderId,
                        userId: user.id,
                        eventDateId: eventDateIdParsed,
                        paymentType: 'Free',
                        status: 'CONFIRMED',
                        shipping: JSON.stringify({ type: 'download', firstName: customerData.firstName, lastName: customerData.lastName, email: customerEmail }),
                        locale: 'en-GB',
                        originalTotal: 0,
                        finalTotal: 0,
                        idempotencyKey: orderId,
                        cancellationSecret,
                        customFields: customerData.customFields ? JSON.stringify(customerData.customFields) : null,
                    }
                });

                const txTickets = [];
                for (const input of ticketRowInputs) {
                    const t = await tx.ticket.create({
                        data: {
                            orderId: newOrder.id,
                            eventTicketTypeId: input.eventTicketTypeId,
                            amount: 1,
                            currency: 'GBP',
                            secret: Math.random().toString(36).substring(2, 15),
                            firstName: customerData.firstName,
                            lastName: customerData.lastName,
                        }
                    });
                    txTickets.push(t);
                }

                // Create order items for admin UI / invoices
                for (const ticketData of tickets) {
                    const eventTicketTypeId = ticketData.ticketTypeId || ticketData.eventTicketTypeId;
                    await tx.orderItem.create({
                        data: {
                            orderId: newOrder.id,
                            eventTicketTypeId,
                            quantity: ticketData.amount,
                            unitPrice: 0,
                            currency: 'GBP',
                        }
                    });
                }

                await tx.waitlistClaimSession.update({ where: { id: cs.id }, data: { usedAt: new Date() } });
                await tx.waitlistOffer.update({ where: { id: offer.id }, data: { status: 'CLAIMED', claimedAt: new Date() } });
                await tx.waitlistEntry.update({
                    where: { id: offer.waitlistEntryId },
                    data: { status: 'FULFILLED', fulfillmentOrderId: newOrder.id },
                });
                await tx.waitlistAuditLog.create({
                    data: { waitlistEntryId: offer.waitlistEntryId, waitlistOfferId: offer.id, eventDateId: eventDateIdParsed, action: 'OFFER_CLAIMED', metadataJson: JSON.stringify({ orderId: newOrder.id }) },
                });
                await tx.waitlistAuditLog.create({
                    data: { waitlistEntryId: offer.waitlistEntryId, waitlistOfferId: offer.id, eventDateId: eventDateIdParsed, action: 'ENTRY_FULFILLED', metadataJson: JSON.stringify({ orderId: newOrder.id }) },
                });

                return { order: newOrder, tickets: txTickets };
            });

            order = result.order;
            createdTickets = result.tickets;
            console.log(`✅ Created free order ${order.id} and fulfilled waitlist offer ${claimSessionValidation.offer.id} in single transaction`);
        } else {
            // NORMAL PATH: standard order + ticket creation
            order = await prisma.order.create({
                data: {
                    id: orderId,
                    userId: user.id,
                    eventDateId: eventDateIdParsed,
                    paymentType: 'Free',
                    status: 'CONFIRMED',
                    shipping: JSON.stringify({ type: 'download', firstName: customerData.firstName, lastName: customerData.lastName, email: customerEmail }),
                    locale: 'en-GB',
                    originalTotal: 0,
                    finalTotal: 0,
                    idempotencyKey: orderId,
                    cancellationSecret,
                    customFields: customerData.customFields ? JSON.stringify(customerData.customFields) : null,
                }
            });

            for (const input of ticketRowInputs) {
                const ticket = await prisma.ticket.create({
                    data: {
                        orderId: order.id,
                        eventTicketTypeId: input.eventTicketTypeId,
                        amount: 1,
                        currency: 'GBP',
                        secret: Math.random().toString(36).substring(2, 15),
                        firstName: customerData.firstName,
                        lastName: customerData.lastName,
                    }
                });
                createdTickets.push(ticket);
            }

            console.log(`✅ Created ${createdTickets.length} free tickets for order ${order.id}`);
        }

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
        return res.status(500).json({ error: 'Failed to process registration' });
    }
}
