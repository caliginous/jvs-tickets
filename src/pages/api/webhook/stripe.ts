import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import prisma from "../../../lib/prisma";
import { send } from "../../../lib/send";
import { parseAmountFromMetadata, validatePenceAmount } from "../../../lib/amountUtils";

/**
 * Stripe Webhook Handler
 * 
 * This webhook processes Stripe events and automatically extracts customer billing address information
 * from successful payments. The address data is stored in the order.shipping field as JSON.
 * 
 * Supported Events:
 * - checkout.session.completed: Extracts address from session.customer_details.address
 * - payment_intent.succeeded: Extracts address from charges[0].billing_details.address  
 * - charge.succeeded: Extracts address from charge.billing_details.address
 * 
 * Address Fields Extracted:
 * - line1, line2: Street address
 * - city, state: City and state/province
 * - postal_code: ZIP/postal code
 * - country: Country code
 * - email: Customer email
 * - name: Customer full name
 * - phone: Customer phone number
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2022-08-01"
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;



// Utility function to extract and format billing address from Stripe data
function extractBillingAddress(data: any): any {
    if (!data) return null;
    
    // Handle different Stripe object types
    let address = null;
    let email = null;
    let name = null;
    let phone = null;
    
    if (data.billing_details?.address) {
        // Direct billing_details structure (from PaymentIntent/Charge)
        address = data.billing_details.address;
        email = data.billing_details.email;
        name = data.billing_details.name;
        phone = data.billing_details.phone;
    } else if (data.customer_details?.address) {
        // Checkout session structure
        address = data.customer_details.address;
        email = data.customer_details.email;
        name = data.customer_details.name;
        phone = data.customer_details.phone;
    }
    
    if (!address) return null;
    
    return {
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        postal_code: address.postal_code,
        country: address.country,
        email: email,
        name: name,
        phone: phone
    };
}

// Aggressive raw body reading that bypasses all middleware
function getRawBody(req: NextApiRequest): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        // Check if body is already parsed (indicating middleware interference)
        if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
            console.error("[webhook/stripe] ❌ Body already parsed by middleware - this will cause signature verification to fail!");
            console.error("[webhook/stripe] Body keys:", Object.keys(req.body));
            reject(new Error("Body already parsed by middleware"));
            return;
        }

        const chunks: Uint8Array[] = [];
        
        req.on('data', (chunk: Uint8Array) => {
            chunks.push(chunk);
        });
        
        req.on('end', () => {
            const rawBody = Buffer.concat(chunks);
            console.log(`[webhook/stripe] Raw body read successfully: ${rawBody.length} bytes`);
            resolve(rawBody);
        });
        
        req.on('error', (err) => {
            console.error("[webhook/stripe] Error reading raw body:", err);
            reject(err);
        });
    });
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        res.status(405).end("Method Not Allowed");
        return;
    }
    


    try {
        const rawBody = await getRawBody(req);

        const sig = req.headers["stripe-signature"];
        if (!sig) {
            return res.status(400).json({ error: "Missing stripe-signature header" });
        }
        const signature = Array.isArray(sig) ? sig[0] : sig;
        if (!signature) {
            return res.status(400).json({ error: "Invalid stripe-signature header" });
        }

        if (!webhookSecret) {
            console.error("[webhook/stripe] STRIPE_WEBHOOK_SECRET is not configured");
            return res.status(500).json({ error: "Server misconfigured" });
        }
        const trimmedWebhookSecret = webhookSecret.trim();

        let event: Stripe.Event;
        try {
            event = stripe.webhooks.constructEvent(rawBody, signature, trimmedWebhookSecret);
        } catch (err: any) {
            console.error("[webhook/stripe] Signature verification failed");
            return res.status(400).json({ error: "Invalid signature" });
        }

        console.log(`[webhook/stripe] Verified event: ${event.id} (${event.type})`);

        // IDEMPOTENCY: record the event id; return 200 immediately on duplicate delivery.
        try {
            await prisma.webhookEventLog.create({
                data: {
                    provider: "stripe",
                    eventId: event.id,
                    eventType: event.type,
                }
            });
        } catch (e: any) {
            // P2002 — unique constraint violation = already processed.
            if (e?.code === "P2002") {
                console.log(`[webhook/stripe] Duplicate event ${event.id}; returning 200`);
                return res.status(200).json({ duplicate: true });
            }
            console.warn("[webhook/stripe] Idempotency log insert failed, continuing:", e?.message);
        }

        // Extract orderId from metadata for various event types
        let orderId: string | null = null;
        
        // Handle checkout session completed (Stripe Checkout)
        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;
            console.log(`[webhook/stripe] Processing checkout.session.completed for session: ${session.id}`);
            console.log(`[webhook/stripe] Session payment status: ${session.payment_status}`);
            console.log(`[webhook/stripe] Session amount total: ${session.amount_total}`);
            
            // Extract metadata for email triggers
            const metadata = session.metadata;
            console.log(`[webhook/stripe] Session metadata:`, JSON.stringify(metadata, null, 2));
            if (metadata) {
                // Try to get customer data from metadata first, then fall back to session data
                const userEmail = metadata.customerEmail || metadata.userEmail || session.customer_email;
                const userFirstName = metadata.customerFirstName || (session.customer_details?.name?.split(' ')[0] || 'Customer');
                const userLastName = metadata.customerLastName || (session.customer_details?.name?.split(' ').slice(1).join(' ') || 'Customer');
                // Get real event data from database instead of hardcoded metadata
                let eventTitle = 'JVS Event';
                let eventDate = 'TBD';
                let eventLocation = 'JVS Events';
                let eventBespokeMessage = '';
                let seats = parseInt(metadata.seats || '1');
                let total = metadata.total || (session.amount_total || 0).toString();
                
                // Try to get actual event details from database
                const eventDateId = metadata?.eventDateId;
                if (eventDateId) {
                    try {
                        const eventDateRecord = await prisma.eventDate.findUnique({
                            where: { id: parseInt(eventDateId) },
                            include: {
                                event: {
                                    include: {
                                        venue: true
                                    }
                                }
                            }
                        });
                        
                        if (eventDateRecord) {
                            eventTitle = eventDateRecord.event.title || metadata.eventTitle || 'JVS Event';
                            eventDate = eventDateRecord.date ? new Date(eventDateRecord.date).toLocaleDateString('en-GB', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                timeZone: 'Europe/London'
                            }) : metadata.eventDate || 'TBD';
                            eventLocation = eventDateRecord.event.venue?.name || eventDateRecord.event.venue?.address || metadata.eventLocation || 'JVS Events';
                            eventBespokeMessage = eventDateRecord.event.bespokeMessage || '';
                        }
                    } catch (dbError) {
                        console.warn('[webhook/stripe] Could not fetch event details from database, using metadata:', dbError.message);
                        // Fall back to metadata values
                        eventTitle = metadata.eventTitle || 'JVS Event';
                        eventDate = metadata.eventDate || 'TBD';
                        eventLocation = metadata.eventLocation || 'JVS Events';
                    }
                }
                
                console.log(`[webhook/stripe] Customer data for email:`, {
                    userEmail,
                    userFirstName,
                    userLastName,
                    eventTitle,
                    eventDate,
                    eventLocation,
                    seats,
                    total
                });
                
                if (userEmail && userFirstName && userLastName) {
                    console.log(`[webhook/stripe] Sending booking confirmation email to: ${userEmail}`);
                    
                    try {
                        // Import and use the email service
                        const { emailTriggerService } = await import('../../../lib/services/emailTriggerService');
                        
                        // Use the orderId from metadata if available, otherwise try to find it
                        let orderId = metadata?.orderId || 'TBD';
                        
                        // If we don't have orderId in metadata, try to find it by other means
                        if (orderId === 'TBD' && eventDateId) {
                            try {
                                const order = await prisma.order.findFirst({
                                    where: { 
                                        eventDateId: parseInt(eventDateId),
                                        paymentResult: { contains: `"stripeSessionId":"${session.id}"` }
                                    }
                                });
                                if (order) {
                                    orderId = order.id;
                                }
                            } catch (orderError) {
                                console.warn('[webhook/stripe] Could not find order for booking ID:', orderError.message);
                            }
                        }
                        
                        // Get the total amount from the session
                        const totalAmount = session.amount_total ? `£${(session.amount_total / 100).toFixed(2)}` : 'TBD'; // Stripe amounts are in pence, convert for email display
                        
                        const emailResult = await emailTriggerService.sendBookingConfirmation({
                            userEmail,
                            userFirstName,
                            userLastName,
                            eventTitle,
                            eventDate: eventDate || 'TBD',
                            eventTime: eventDate ? new Date(eventDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }) : 'TBD',
                            eventLocation: 'JVS Events',
                            bookingId: orderId,
                            seats,
                            locale: metadata.locale || 'en',
                            total: totalAmount,
                            eventBespokeMessage: eventBespokeMessage
                        });
                        
                        if (emailResult.success) {
                            console.log('✅ [webhook/stripe] Booking confirmation email sent successfully');
                        } else {
                            console.error('❌ [webhook/stripe] Failed to send booking confirmation email:', emailResult.error);
                        }
                    } catch (emailError) {
                        console.error('❌ [webhook/stripe] Error sending email:', emailError);
                    }
                } else {
                    console.warn('[webhook/stripe] Missing customer data for email trigger');
                }
            }
            
                    // Check if we need to create a new order from Stripe metadata
        const eventDateId = metadata?.eventDateId;
        const orderId = metadata?.orderId;
        
        if (orderId) {
            // We have the orderId directly from metadata - use it
            try {
                const order = await prisma.order.findUnique({
                    where: { id: orderId }
                });
                
                if (order) {
                    console.log(`[webhook/stripe] Found order ${order.id} by orderId, updating status to PAID`);
                    
                    // Extract billing address information from the session
                    const billingAddress = extractBillingAddress(session);
                    if (billingAddress) {
                        console.log(`[webhook/stripe] Extracted billing address from session for order ${order.id}:`, billingAddress);
                    }
                    
                    // Update the order with the webhook event data and billing address
                    await prisma.order.update({
                        where: { id: order.id },
                        data: { 
                            paymentResult: JSON.stringify({
                                ...JSON.parse(order.paymentResult || '{}'),
                                webhookEvent: event,
                                webhookProcessedAt: new Date().toISOString()
                            }),
                            status: "PAID",
                            shipping: billingAddress ? JSON.stringify(billingAddress) : undefined
                        }
                    });
                    
                    console.log(`[webhook/stripe] ✅ Order ${order.id} updated successfully to PAID status`);
                    
                    // Track successful purchase for analytics
                    try {
                        const eventData = await prisma.eventDate.findUnique({
                            where: { id: order.eventDateId },
                            include: { event: true }
                        });
                        
                        const ticketCount = await prisma.ticket.count({
                            where: { orderId: order.id }
                        });

                        // Log purchase data for analytics
                        console.log(`[analytics/purchase] ${JSON.stringify({
                            transaction_id: order.id,
                            event_title: eventData?.event?.title || 'Unknown Event',
                            event_date: eventData?.date?.toISOString() || 'Unknown Date',
                            value: (order.finalTotal || 0) / 100,
                            currency: 'GBP',
                            ticket_count: ticketCount,
                            payment_method: 'stripe'
                        })}`);
                    } catch (analyticsError) {
                        console.warn(`[webhook/stripe] Analytics tracking failed:`, analyticsError.message);
                    }
                    
                    // Check if this is a new per-event ticket types order
                    if (order.eventDateId) {
                        try {
                            // Check if tickets already exist (from PENDING order creation)
                            const existingTickets = await prisma.ticket.findMany({
                                where: { orderId: order.id }
                            });
                            
                            if (existingTickets.length > 0) {
                                // Tickets already exist from PENDING order - availability is computed from Ticket rows
                                // NOTE: EventTicketType.sold is deprecated and no longer updated.
                                // Availability is computed dynamically via availability service.
                                console.log(`[webhook/stripe] Order ${order.id} already has ${existingTickets.length} tickets (from PENDING order)`);
                                console.log(`[webhook/stripe] ✅ Confirmed ${existingTickets.length} tickets for order ${order.id}`);
                            } else {
                                // No tickets yet, create them (backward compatibility for old orders)
                                const orderItems = await prisma.orderItem.findMany({
                                    where: { orderId: order.id },
                                    include: { eventTicketType: true }
                                });
                                
                                if (orderItems.length > 0) {
                                    console.log(`[webhook/stripe] Creating tickets for order ${order.id} with ${orderItems.length} items (legacy order)`);
                                    
                                    // Create tickets for each order item
                                    // NOTE: EventTicketType.sold is deprecated and no longer updated.
                                    // Availability is computed dynamically from Ticket rows via availability service.
                                    for (const item of orderItems) {
                                        // Guard: eventTicketTypeId is required for Phase 3 compatibility
                                        if (!item.eventTicketTypeId) {
                                            console.error(`[webhook/stripe] ❌ OrderItem ${item.id} is missing eventTicketTypeId - cannot create ticket`);
                                            continue;
                                        }
                                        
                                        for (let i = 0; i < item.quantity; i++) {
                                            await prisma.ticket.create({
                                                data: {
                                                    orderId: order.id,
                                                    eventTicketTypeId: item.eventTicketTypeId,
                                                    priceCharged: item.unitPrice,
                                                    currency: item.currency,
                                                    amount: 1,
                                                    secret: Math.random().toString(36).substr(2, 15),
                                                    firstName: billingAddress?.name?.split(' ')[0] || 'Customer',
                                                    lastName: billingAddress?.name?.split(' ').slice(1).join(' ') || 'Customer'
                                                }
                                            });
                                        }
                                    }
                                    
                                    console.log(`[webhook/stripe] ✅ Created ${orderItems.reduce((sum, item) => sum + item.quantity, 0)} tickets for order ${order.id}`);
                                }
                            }
                        } catch (ticketError) {
                            console.error(`[webhook/stripe] Error handling tickets for order ${order.id}:`, ticketError);
                        }
                    }
                    
                    // Email will be sent by the original template system below
                } else {
                    console.warn(`[webhook/stripe] Order ${orderId} not found in database`);
                }
            } catch (orderError) {
                console.error(`[webhook/stripe] Error updating order ${orderId}:`, orderError);
            }
        } else if (eventDateId && (metadata?.customerEmail || metadata?.userEmail)) {
            // No existing order, create one from Stripe metadata
            const customerEmail = metadata?.customerEmail || metadata?.userEmail;
            console.log(`[webhook/stripe] Creating new order from Stripe metadata for event ${eventDateId}`);
            
            try {
                // Create or update user with latest custom fields
                let user = await prisma.user.findUnique({
                    where: { email: customerEmail }
                });
                
                if (!user) {
                    // Create new user
                    user = await prisma.user.create({
                        data: {
                            firstName: metadata.customerFirstName || 'Customer',
                            lastName: metadata.customerLastName || 'Customer',
                            email: customerEmail,
                            phone: metadata.customerPhone || '',
                            address: metadata.customerAddress || 'Address not provided',
                            zip: metadata.customerZip || 'ZIP not provided',
                            city: metadata.customerCity || 'City not provided',
                            countryCode: metadata.customerCountryCode || 'GB',
                            regionCode: metadata.customerRegionCode || '',
                            customFields: metadata.customerCustomFields || null,
                        }
                    });
                    console.log(`[webhook/stripe] Created new user: ${user.id}`);
                } else {
                    // Update existing user with latest info including custom fields and phone
                    user = await prisma.user.update({
                        where: { email: customerEmail },
                        data: {
                            firstName: metadata.customerFirstName || user.firstName,
                            lastName: metadata.customerLastName || user.lastName,
                            phone: metadata.customerPhone || user.phone,
                            address: metadata.customerAddress || user.address,
                            zip: metadata.customerZip || user.zip,
                            city: metadata.customerCity || user.city,
                            countryCode: metadata.customerCountryCode || user.countryCode,
                            regionCode: metadata.customerRegionCode || user.regionCode,
                            customFields: metadata.customerCustomFields || user.customFields,
                        }
                    });
                    console.log(`[webhook/stripe] Updated existing user: ${user.id} with custom fields and phone`);
                }
                
                // Parse ticket information from metadata
                let tickets = [];
                try {
                    if (metadata.tickets) {
                        tickets = JSON.parse(metadata.tickets);
                    }
                } catch (e) {
                    console.error(`[webhook/stripe] Error parsing tickets from metadata:`, e);
                }
                
                // Look up discount code if present
                let discountCodeId = null;
                if (metadata.discountCode) {
                    try {
                        const discountCode = await prisma.discountCode.findUnique({
                            where: { code: metadata.discountCode }
                        });
                        if (discountCode) {
                            discountCodeId = discountCode.id;
                            console.log(`[webhook/stripe] Found discount code: ${metadata.discountCode} -> ID: ${discountCodeId}`);
                        }
                    } catch (discountError) {
                        console.error(`[webhook/stripe] Error looking up discount code:`, discountError);
                    }
                }
                
                // Create the order
                const order = await prisma.order.create({
                    data: {
                        eventDateId: parseInt(eventDateId),
                        userId: user.id,
                        paymentType: 'stripe',
                        locale: 'en',
                        shipping: JSON.stringify(extractBillingAddress(session) || {}),
                        idempotencyKey: `stripe-webhook-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
                        cancellationSecret: Math.random().toString(36).substring(2, 15),
                        paymentResult: JSON.stringify({
                            webhookEvent: event,
                            webhookProcessedAt: new Date().toISOString(),
                            stripeSessionId: session.id
                        }),
                        status: "PAID",
                        // Use Stripe's amount_total as the source of truth (already in pence)
                        finalTotal: session.amount_total || parseAmountFromMetadata(metadata.finalTotal || metadata.total || '0'),
                        originalTotal: session.amount_total || parseAmountFromMetadata(metadata.originalTotal || metadata.total || '0'),
                        // Store custom fields on the order for this specific purchase
                        customFields: metadata.customerCustomFields || null,
                        // Handle discount information if present
                        ...(discountCodeId && {
                            discountCodeId: discountCodeId
                        })
                    }
                });
                
                console.log(`[webhook/stripe] ✅ Created new order ${order.id} from Stripe metadata`);
                
                // Create tickets using eventTicketTypeId from metadata
                for (const ticket of tickets) {
                    const eventTicketTypeId = ticket.ticketTypeId || ticket.eventTicketTypeId;
                    
                    // Guard: eventTicketTypeId is required for Phase 3 compatibility
                    if (!eventTicketTypeId) {
                        console.error(`[webhook/stripe] ❌ Ticket metadata is missing ticketTypeId/eventTicketTypeId for order ${order.id} - cannot create ticket`);
                        console.error(`[webhook/stripe] Ticket data:`, JSON.stringify(ticket));
                        continue;
                    }
                    
                    console.log(`[webhook/stripe] Creating ticket with EventTicketType ${eventTicketTypeId}`);
                    await prisma.ticket.create({
                        data: {
                            orderId: order.id,
                            eventTicketTypeId,
                            amount: ticket.amount,
                            secret: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
                        }
                    });
                }
                
                console.log(`[webhook/stripe] ✅ Created ${tickets.length} tickets for order ${order.id}`);
                
            } catch (createError) {
                console.error(`[webhook/stripe] Error creating order from metadata:`, createError);
            }
        } else if (eventDateId) {
            // No existing order and no customer data in metadata - cannot create order
            console.log(`[webhook/stripe] ❌ Cannot create order: eventDateId ${eventDateId} but missing customer data in metadata`);
            console.log(`[webhook/stripe] Required metadata: customerEmail OR userEmail, customerFirstName, customerLastName`);
            console.log(`[webhook/stripe] Available metadata:`, JSON.stringify(metadata, null, 2));
        }
        }
        // Handle payment success events
        else if (event.type === "payment_intent.succeeded") {
            const pi = event.data.object as Stripe.PaymentIntent;
            orderId = (pi.metadata as any)?.orderId ?? null;
            
            if (orderId) {
                console.log(`[webhook/stripe] Processing payment_intent.succeeded for order: ${orderId}`);
                
                // Extract billing address information from the payment intent
                const billingAddress = extractBillingAddress(pi.charges?.data[0]);
                if (billingAddress) {
                    console.log(`[webhook/stripe] Extracted billing address for order ${orderId}:`, billingAddress);
                }
                
                // Update order status to paid and store billing address
                await prisma.order.update({
                    where: { id: orderId },
                    data: { 
                        paymentResult: JSON.stringify(event),
                        status: "PAID",
                        shipping: billingAddress ? JSON.stringify(billingAddress) : undefined
                    }
                });
                
                // Email will be sent by the original template system if available
                
                console.log(`[webhook/stripe] ✅ Successfully processed payment_intent.succeeded for order: ${orderId}`);
            }
        } else if (event.type === "charge.succeeded") {
            const charge = event.data.object as Stripe.Charge;
            orderId = (charge.metadata as any)?.orderId ?? null;
            
            if (!orderId && typeof charge.payment_intent === "string") {
                try {
                    const pi = await stripe.paymentIntents.retrieve(
                        charge.payment_intent
                    );
                    orderId = (pi.metadata as any)?.orderId ?? null;
                } catch (err) {
                    console.error("[webhook/stripe] Failed to retrieve payment intent:", err);
                }
            }
            
            if (orderId) {
                console.log(`[webhook/stripe] Processing charge.succeeded for order: ${orderId}`);
                
                // Extract billing address information from the charge
                const billingAddress = extractBillingAddress(charge);
                if (billingAddress) {
                    console.log(`[webhook/stripe] Extracted billing address from charge for order ${orderId}:`, billingAddress);
                }
                
                await prisma.order.update({
                    where: { id: orderId },
                    data: { 
                        paymentResult: JSON.stringify(event),
                        status: "PAID",
                        shipping: billingAddress ? JSON.stringify(billingAddress) : undefined
                    }
                });
                
                // Email will be sent by the original template system if available
                
                console.log(`[webhook/stripe] ✅ Successfully processed charge.succeeded for order: ${orderId}`);
            }
        } 
        // Handle payment failure events
        else if (event.type === "payment_intent.payment_failed") {
            const pi = event.data.object as Stripe.PaymentIntent;
            orderId = (pi.metadata as any)?.orderId ?? null;
            
            if (orderId) {
                console.log(`[webhook/stripe] Processing payment_intent.payment_failed for order: ${orderId}`);
                await prisma.order.update({
                    where: { id: orderId },
                    data: { 
                        paymentResult: JSON.stringify(event),
                        status: "PAYMENT_FAILED"
                    }
                });
                console.log(`[webhook/stripe] ✅ Successfully processed payment_intent.payment_failed for order: ${orderId}`);
            }
        }
        // Handle payment cancellation events
        else if (event.type === "payment_intent.canceled") {
            const pi = event.data.object as Stripe.PaymentIntent;
            orderId = (pi.metadata as any)?.orderId ?? null;
            
            if (orderId) {
                console.log(`[webhook/stripe] Processing payment_intent.canceled for order: ${orderId}`);
                await prisma.order.update({
                    where: { id: orderId },
                    data: { 
                        paymentResult: JSON.stringify(event),
                        status: "CANCELLED",
                        cancelledAt: new Date(),
                        cancelledBy: "stripe",
                        inventoryReturnedToPool: false,
                        inventoryReturnedAt: null,
                        inventoryReturnedBy: null,
                    }
                });
                console.log(`[webhook/stripe] ✅ Successfully processed payment_intent.canceled for order: ${orderId}`);
            }
        }
        // Handle refund events
        else if (event.type === "charge.refunded") {
            const charge = event.data.object as Stripe.Charge;
            orderId = (charge.metadata as any)?.orderId ?? null;
            
            if (!orderId && typeof charge.payment_intent === "string") {
                try {
                    const pi = await stripe.paymentIntents.retrieve(
                        charge.payment_intent
                    );
                    orderId = (pi.metadata as any)?.orderId ?? null;
                } catch (err) {
                    console.error("[webhook/stripe] Failed to retrieve payment intent:", err);
                }
            }
            
            if (orderId) {
                console.log(`[webhook/stripe] Processing charge.refunded for order: ${orderId}`);
                
                // Get the order first
                const order = await prisma.order.findUnique({
                    where: { id: orderId },
                    select: { paymentResult: true }
                });
                
                if (!order) {
                    console.error(`[webhook/stripe] Order ${orderId} not found for refund processing`);
                    return;
                }
                
                // Get refund details
                const refunds = await stripe.refunds.list({
                    charge: charge.id,
                    limit: 1
                });
                
                const refund = refunds.data[0];
                const refundAmountInPence = refund ? refund.amount : 0; // Keep in pence
                const refundReason = refund ? refund.reason : 'unknown';
                
                // Update order status and store refund information properly
                // Gated inventory: refund does not auto-release capacity
                const existingPaymentResult = JSON.parse(order.paymentResult || '{}');
                await prisma.order.update({
                    where: { id: orderId },
                    data: { 
                        paymentResult: JSON.stringify({
                            ...existingPaymentResult,
                            refund: {
                                id: refund?.id,
                                amount: refundAmountInPence,
                                reason: refundReason,
                                timestamp: new Date().toISOString(),
                                stripeRefundId: refund?.id
                            },
                            webhookEvent: event
                        }),
                        status: "REFUNDED",
                        finalTotal: 0,
                        refundAmount: refundAmountInPence,
                        refundId: refund?.id,
                        refundedAt: new Date(),
                        inventoryReturnedToPool: false,
                        inventoryReturnedAt: null,
                        inventoryReturnedBy: null,
                    }
                });
                
                console.log(`[webhook/stripe] ✅ Successfully processed charge.refunded for order: ${orderId}, amount: £${(refundAmountInPence / 100).toFixed(2)}, reason: ${refundReason}`);
            }
        }
        // Handle partial refund events
        else if (event.type === "charge.partially_refunded") {
            const charge = event.data.object as Stripe.Charge;
            orderId = (charge.metadata as any)?.orderId ?? null;
            
            if (!orderId && typeof charge.payment_intent === "string") {
                try {
                    const pi = await stripe.paymentIntents.retrieve(
                        charge.payment_intent
                    );
                    orderId = (pi.metadata as any)?.orderId ?? null;
                } catch (err) {
                    console.error("[webhook/stripe] Failed to retrieve payment intent:", err);
                }
            }
            
            if (orderId) {
                console.log(`[webhook/stripe] Processing charge.partially_refunded for order: ${orderId}`);
                
                // Get the order first
                const order = await prisma.order.findUnique({
                    where: { id: orderId },
                    select: { paymentResult: true }
                });
                
                if (!order) {
                    console.error(`[webhook/stripe] Order ${orderId} not found for partial refund processing`);
                    return;
                }
                
                // Get refund details
                const refunds = await stripe.refunds.list({
                    charge: charge.id,
                    limit: 1
                });
                
                const refund = refunds.data[0];
                const refundAmountInPence = refund ? refund.amount : 0; // Keep in pence
                const refundReason = refund ? refund.reason : 'unknown';
                
                // Update order with partial refund information properly
                const existingPaymentResult = JSON.parse(order.paymentResult || '{}');
                const currentRefunds = existingPaymentResult.refunds || [];
                
                await prisma.order.update({
                    where: { id: orderId },
                    data: { 
                        paymentResult: JSON.stringify({
                            ...existingPaymentResult,
                            refunds: [...currentRefunds, {
                                id: refund?.id,
                                amount: refundAmountInPence, // Store refund amount in pence
                                reason: refundReason,
                                timestamp: new Date().toISOString(),
                                stripeRefundId: refund?.id
                            }],
                            webhookEvent: event
                        }),
                        status: "PARTIALLY_REFUNDED"
                        // No longer misuse discountAmount field
                    }
                });
                
                console.log(`[webhook/stripe] ✅ Successfully processed charge.partially_refunded for order: ${orderId}, refund amount: £${(refundAmountInPence / 100).toFixed(2)}, reason: ${refundReason}`);
            }
        }
        // Handle dispute/chargeback events
        else if (event.type === "charge.dispute.created") {
            const dispute = event.data.object as Stripe.Dispute;
            const charge = dispute.charge as Stripe.Charge;
            
            if (charge && typeof charge.payment_intent === "string") {
                try {
                    const pi = await stripe.paymentIntents.retrieve(
                        charge.payment_intent
                    );
                    orderId = (pi.metadata as any)?.orderId ?? null;
                } catch (err) {
                    console.error("[webhook/stripe] Failed to retrieve payment intent:", err);
                }
            }
            
            if (orderId) {
                console.log(`[webhook/stripe] Processing charge.dispute.created for order: ${orderId}`);
                
                await prisma.order.update({
                    where: { id: orderId },
                    data: { 
                        paymentResult: JSON.stringify(event),
                        status: "DISPUTED"
                    }
                });
                
                console.log(`[webhook/stripe] ✅ Successfully processed charge.dispute.created for order: ${orderId}`);
            }
        }
        // Handle payment intent creation (just logging)
        else if (event.type === "payment_intent.created") {
            const pi = event.data.object as Stripe.PaymentIntent;
            orderId = (pi.metadata as any)?.orderId ?? null;
            console.log(`[webhook/stripe] Payment intent created for order: ${orderId}`);
        }

        // Only log warning for events that should have an orderId but don't
        if (!orderId && !["payment_intent.created", "checkout.session.completed"].includes(event.type)) {
            console.warn(`[webhook/stripe] No orderId found for event ${event.type}`);
        }

        // Mark the event as processed (idempotency).
        try {
            await prisma.webhookEventLog.updateMany({
                where: { provider: "stripe", eventId: event.id },
                data: { processedAt: new Date() },
            });
        } catch (e) {
            console.warn("[webhook/stripe] failed to mark event processed:", (e as any)?.message);
        }

        console.log(`[webhook/stripe] Webhook processing completed successfully`);
        res.status(200).json({ received: true });
    } catch (error: any) {
        // Log the detailed error for debugging
        console.error("[webhook/stripe] Unexpected error:", {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        res.status(500).json({ 
            error: "An internal server error occurred while processing the webhook" 
        });
    }
};

// Disable the body parser for this route
// This is CRITICAL for Stripe webhook signature verification
export const config = {
    api: {
        bodyParser: false
    }
};

// Export the handler directly without any middleware wrappers
// This ensures the raw body is preserved exactly as Stripe sent it
export default handler;
