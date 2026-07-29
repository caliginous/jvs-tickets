import { NextApiRequest, NextApiResponse } from 'next';
import { serverAuthenticate } from '../../../../../../constants/serverUtil';
import { PermissionSection, PermissionType } from '../../../../../../constants/interfaces';
import prisma from '../../../../../../lib/prisma';
import { orderConsumesCapacity } from '../../../../../../constants/orderStatuses';
import { capacityConsumingStatusFilter } from '../../../../../../lib/services/ticketing/capacityWhere';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Check authentication and permissions
        const sessionUser = await serverAuthenticate(req, res, {
            permission: PermissionSection.Orders,
            permissionType: PermissionType.Read
        });
        
        if (!sessionUser) return;

        const { eventId } = req.query;
        if (!eventId || typeof eventId !== 'string') {
            return res.status(400).json({ message: 'Event ID is required' });
        }

        const eventIdNum = parseInt(eventId);
        if (isNaN(eventIdNum)) {
            return res.status(400).json({ message: 'Event ID must be a valid number' });
        }

        const event = await prisma.event.findUnique({
            where: { id: eventIdNum },
            include: {
                customFields: true,
                dates: {
                    include: {
                        orders: {
                            where: {
                                OR: capacityConsumingStatusFilter(),
                            },
                            include: {
                                user: true,
                                tickets: {
                                    include: {
                                        eventTicketType: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const reportOrders = event.dates.flatMap(eventDate =>
            eventDate.orders.filter(orderConsumesCapacity)
        );
        const attendeeUserIds = Array.from(new Set(reportOrders.map(order => order.userId)));

        // Find each attendee's earliest qualifying booking across all events in one
        // batched query. This avoids an N+1 query for every report row.
        const firstBookings = attendeeUserIds.length > 0
            ? await prisma.order.groupBy({
                by: ['userId'],
                where: {
                    userId: { in: attendeeUserIds },
                    OR: capacityConsumingStatusFilter(),
                },
                _min: { date: true },
            })
            : [];
        const firstBookingDateByUser = new Map(
            firstBookings.map(booking => [booking.userId, booking._min.date?.getTime()])
        );

        const orders = [];
        
        for (const eventDate of event.dates) {
            for (const order of eventDate.orders) {
                if (!orderConsumesCapacity(order)) continue;

                const ticketTypes = order.tickets.map(ticket => {
                    const typeName = ticket.eventTicketType?.name || 'Standard';
                    return `${ticket.amount}× ${typeName}`;
                }).join(', ');
                
                const totalQuantity = order.tickets.reduce((sum, ticket) => sum + ticket.amount, 0);
                const orderTotal = (order.finalTotal || order.originalTotal || 0) / 100;

                const isHeldCapacity = (order.status === 'REFUNDED' || order.status === 'CANCELLED')
                    && !order.inventoryReturnedToPool;
                
                orders.push({
                    id: order.id,
                    customerName: `${order.user.firstName} ${order.user.lastName}`,
                    email: order.user.email,
                    phone: order.user.phone || '',
                    ticketType: ticketTypes,
                    quantity: totalQuantity,
                    total: orderTotal,
                    status: order.status,
                    inventoryStatus: isHeldCapacity ? 'HELD' : 'ACTIVE',
                    isFirstTimeBooker: firstBookingDateByUser.get(order.userId) === order.date.getTime(),
                    arrived: false,
                    customFields: order.customFields
                });
            }
        }

        res.status(200).json({ 
            orders,
            customFields: event.customFields || [] // Include event's custom field definitions
        });
    } catch (error) {
        console.error('Error fetching event orders:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            eventId: req.query.eventId
        });
        res.status(500).json({ 
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
