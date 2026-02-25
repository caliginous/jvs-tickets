import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import prisma from '../../../lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2022-08-01',
});

interface CartItem {
    eventTicketTypeId: number;
    quantity: number;
}

interface CreateSessionRequest {
    eventId: number;
    eventDateId: number | null;
    items: CartItem[];
    customer?: {
        email?: string;
        name?: string;
    };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { eventId, eventDateId, items, customer }: CreateSessionRequest = req.body;

        // Validate input
        if (!eventId || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Invalid request data' });
        }

        // Validate event exists and is active
        const event = await prisma.event.findFirst({
            where: {
                id: eventId,
                isActive: true
            },
            select: {
                id: true,
                title: true,
                slug: true
            }
        });

        if (!event) {
            return res.status(404).json({ error: 'Event not found or inactive' });
        }

        // Load ticket types and validate
        const ticketTypeIds = items.map(item => item.eventTicketTypeId);
        const ticketTypes = await prisma.eventTicketType.findMany({
            where: {
                id: { in: ticketTypeIds },
                eventId: eventId,
                isActive: true,
                isPublic: true
            },
            select: {
                id: true,
                name: true,
                description: true,
                price: true,
                currency: true,
                capacity: true,
                sold: true
            }
        });

        if (ticketTypes.length !== items.length) {
            return res.status(400).json({ error: 'Invalid ticket types' });
        }

        // Validate currency consistency
        const firstCurrency = ticketTypes[0]?.currency;
        const hasMixedCurrencies = ticketTypes.some(tt => tt.currency !== firstCurrency);
        if (hasMixedCurrencies) {
            return res.status(400).json({ error: 'Mixed currencies not allowed' });
        }
        const currency = firstCurrency;

        // Capacity enforcement and reservation
        const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const reservationExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Use a transaction for capacity checking and order creation
        const result = await prisma.$transaction(async (tx) => {
            // Check capacity for each item
            for (const item of items) {
                const ticketType = ticketTypes.find(tt => tt.id === item.eventTicketTypeId);
                if (!ticketType) {
                    throw new Error(`Ticket type ${item.eventTicketTypeId} not found`);
                }

                if (ticketType.capacity !== null) {
                    const soldNow = await tx.ticket.count({
                        where: {
                            eventTicketTypeId: item.eventTicketTypeId,
                            order: {
                                // Include PARTIALLY_REFUNDED as those tickets are still valid
                                status: { in: ['CONFIRMED', 'PAID', 'COMPLETED', 'PARTIALLY_REFUNDED'] }
                            }
                        }
                    });

                    const available = ticketType.capacity - soldNow;
                    if (soldNow + item.quantity > ticketType.capacity) {
                        throw new Error(`Not enough availability for ${ticketType.name}. Requested: ${item.quantity}, Available: ${available}`);
                    }
                }
            }

            // Calculate total amount
            const totalAmount = items.reduce((total, item) => {
                const ticketType = ticketTypes.find(tt => tt.id === item.eventTicketTypeId)!;
                return total + (ticketType.price * item.quantity);
            }, 0);

            // Create Pending order
            const order = await tx.order.create({
                data: {
                    id: orderId,
                    userId: 'temp_user', // Will be updated when user is created/identified
                    paymentType: 'stripe',
                    status: 'PENDING',
                    eventDateId: eventDateId || 1, // Default if no specific date
                    shipping: 'digital',
                    locale: 'en',
                    idempotencyKey: orderId,
                    cancellationSecret: Math.random().toString(36).substr(2, 15),
                    date: new Date(),
                    finalTotal: totalAmount, // Store in pence (minor units)
                    originalTotal: totalAmount
                }
            });

            // Create order items (reservations)
            for (const item of items) {
                await tx.orderItem.create({
                    data: {
                        orderId: orderId,
                        eventTicketTypeId: item.eventTicketTypeId,
                        quantity: item.quantity,
                        unitPrice: ticketTypes.find(tt => tt.id === item.eventTicketTypeId)!.price,
                        currency: currency
                    }
                });
            }

            return { order, totalAmount, currency };
        });

        // Create Stripe Checkout Session
        const lineItems = items.map(item => {
            const ticketType = ticketTypes.find(tt => tt.id === item.eventTicketTypeId)!;
            return {
                quantity: item.quantity,
                price_data: {
                    currency: ticketType.currency.toLowerCase(),
                    unit_amount: ticketType.price,
                    product_data: {
                        name: `${event.title} — ${ticketType.name}`,
                        description: ticketType.description || undefined,
                        metadata: {
                            eventId: eventId.toString(),
                            eventTicketTypeId: ticketType.id.toString()
                        }
                    }
                }
            };
        });

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            customer_email: customer?.email,
            allow_promotion_codes: true,
            line_items: lineItems,
            success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tickets.jvs.org.uk'}/checkout/success?orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tickets.jvs.org.uk'}/events/${event.slug}?cancelled=1`,
            client_reference_id: orderId,
            metadata: {
                orderId,
                eventId: eventId.toString(),
                eventDateId: eventDateId?.toString() || ''
            },
            expires_at: Math.floor(reservationExpiresAt.getTime() / 1000)
        });

        return res.status(200).json({ 
            sessionId: session.id,
            orderId: orderId
        });

    } catch (error) {
        console.error('Error creating checkout session:', error);
        
        if (error instanceof Error && error.message.includes('Not enough availability')) {
            return res.status(409).json({ 
                error: 'Insufficient availability',
                details: error.message
            });
        }

        return res.status(500).json({ 
            error: 'Failed to create checkout session',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
