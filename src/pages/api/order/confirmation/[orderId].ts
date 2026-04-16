import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { serverAuthenticate } from '../../../../constants/serverUtil';
import { timingSafeEqual } from 'crypto';

function safeEqual(a: string | undefined | null, b: string | undefined | null): boolean {
    if (!a || !b) return false;
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return timingSafeEqual(ab, bb);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { orderId, secret } = req.query;

        if (!orderId || typeof orderId !== 'string') {
            return res.status(400).json({ error: 'Order ID is required' });
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: true,
                eventDate: {
                    include: {
                        event: {
                            include: {
                                venue: true
                            }
                        }
                    }
                },
                tickets: {
                    include: {
                        eventTicketType: true
                    }
                }
            }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Authorization: either a matching cancellationSecret (issued when the order was
        // created and returned to the buyer) or an authenticated admin session.
        const suppliedSecret = typeof secret === 'string' ? secret : undefined;
        const isSecretOk = safeEqual(suppliedSecret, order.cancellationSecret);
        const admin = isSecretOk
            ? null
            : await serverAuthenticate(req, res, undefined, false);
        if (!isSecretOk && !admin) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const orderData = {
            id: order.id,
            eventTitle: order.eventDate?.event?.title || 'Event',
            eventDate: order.eventDate?.date?.toISOString() || null,
            venue: order.eventDate?.event?.venue
                ? `${order.eventDate.event.venue.name || ''} - ${order.eventDate.event.venue.address || ''}, ${order.eventDate.event.venue.city || ''} ${order.eventDate.event.venue.postcode || ''}`.trim()
                : 'Venue TBD',
            ticketCount: order.tickets.length,
            totalAmount: order.finalTotal || 0,
            customerEmail: order.user?.email || '',
            isFree: order.paymentType === 'Free' || order.finalTotal === 0,
            status: order.status
        };

        return res.status(200).json(orderData);
    } catch (error) {
        console.error('Error fetching order confirmation:', error);
        return res.status(500).json({ error: 'Failed to fetch order details' });
    }
}
