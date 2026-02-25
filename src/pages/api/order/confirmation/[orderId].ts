import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { orderId } = req.query;

        if (!orderId || typeof orderId !== 'string') {
            return res.status(400).json({ error: 'Order ID is required' });
        }

        // Fetch order with related data
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
                        category: true,
                        eventTicketType: true
                    }
                }
            }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Format response
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
        return res.status(500).json({ 
            error: 'Failed to fetch order details',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}





