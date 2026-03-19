import { NextApiRequest, NextApiResponse } from 'next';
import { serverAuthenticate } from '../../../../constants/serverUtil';
import { PermissionSection, PermissionType } from '../../../../constants/interfaces';
import prisma from '../../../../lib/prisma';
import { orderConsumesCapacity } from '../../../../constants/orderStatuses';
import { capacityConsumingStatusFilter } from '../../../../lib/services/ticketing/capacityWhere';

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

        // Fetch events with their dates and order data
        // Include both active and inactive events, confirmed orders only
        const events = await prisma.event.findMany({
            include: {
                dates: {
                    include: {
                        orders: {
                            where: {
                                OR: capacityConsumingStatusFilter(),
                            },
                            include: {
                                tickets: {
                                    include: {
                                        eventTicketType: true
                                    }
                                }
                            }
                        }
                    }
                },
                ticketTypes: {
                    where: { isActive: true },
                    orderBy: { sortOrder: 'asc' }
                },
                venue: true
            },
            orderBy: {
                id: 'asc'
            }
        });

        const eventsWithOrders = events.map(event => {
            let totalOrders = 0;
            let totalTicketsSold = 0;
            let totalRevenueInPence = 0;
            let heldCapacityOrders = 0;
            let heldCapacityTickets = 0;

            event.dates.forEach(date => {
                date.orders.forEach(order => {
                    if (!orderConsumesCapacity(order)) return;

                    totalOrders++;
                    order.tickets.forEach(ticket => {
                        totalTicketsSold += ticket.amount;
                    });

                    const isHeld = (order.status === 'REFUNDED' || order.status === 'CANCELLED')
                        && !order.inventoryReturnedToPool;

                    if (isHeld) {
                        heldCapacityOrders++;
                        order.tickets.forEach(ticket => {
                            heldCapacityTickets += ticket.amount;
                        });
                    } else {
                        const orderTotal = order.finalTotal || order.originalTotal || 0;
                        totalRevenueInPence += orderTotal;
                    }
                });
            });

            const totalRevenue = totalRevenueInPence / 100;

            // Get the next upcoming date
            const now = new Date();
            const nextDate = event.dates
                .filter(date => new Date(date.date) > now)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

            return {
                id: event.id,
                title: event.title,
                description: event.description,
                coverImage: event.coverImage,
                isActive: event.isActive, // Add isActive flag for UI
                venue: event.venue ? {
                    name: event.venue.name,
                    address: event.venue.address,
                    city: event.venue.city,
                    postcode: event.venue.postcode
                } : null,
                dates: event.dates.map(date => ({
                    id: date.id,
                    date: date.date,
                    totalTicketLimit: date.totalTicketLimit
                })),
                ticketTypes: event.ticketTypes.map(ticketType => ({
                    id: ticketType.id,
                    name: ticketType.name,
                    price: ticketType.price,
                    currency: ticketType.currency,
                    isActive: ticketType.isActive
                })),
                totalOrders,
                totalTicketsSold,
                totalRevenue: Math.round(totalRevenue * 100) / 100,
                heldCapacityOrders,
                heldCapacityTickets,
                nextDate: nextDate?.date || null
            };
        });

        // Sort events by next date (upcoming first)
        eventsWithOrders.sort((a, b) => {
            if (!a.nextDate && !b.nextDate) return 0;
            if (!a.nextDate) return 1;
            if (!b.nextDate) return -1;
            return new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime();
        });

        res.status(200).json(eventsWithOrders);
    } catch (error) {
        console.error('Error fetching events for reports:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
