import { NextApiRequest, NextApiResponse } from 'next';
import { serverAuthenticate } from '../../../../constants/serverUtil';
import { PermissionSection, PermissionType } from '../../../../constants/interfaces';
import prisma from '../../../../lib/prisma';
import { capacityConsumingStatusFilter } from '../../../../lib/services/ticketing/capacityWhere';

/**
 * Events report — aggregates sold / revenue per event using SQL-level groupBy
 * rather than loading the full order graph into memory. Previously this route
 * pulled every event -> every date -> every order -> every ticket -> every ticket
 * type in one query, which grows O(orders*tickets) and OOMs at scale.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const sessionUser = await serverAuthenticate(req, res, {
        permission: PermissionSection.Orders,
        permissionType: PermissionType.Read,
    });
    if (!sessionUser) return;

    try {
        // 1. Events + their dates + ticket-type metadata (cheap: no order/ticket join)
        const events = await prisma.event.findMany({
            orderBy: { id: 'asc' },
            select: {
                id: true,
                title: true,
                description: true,
                coverImage: true,
                isActive: true,
                venue: {
                    select: { name: true, address: true, city: true, postcode: true },
                },
                dates: {
                    select: { id: true, date: true, totalTicketLimit: true },
                },
                ticketTypes: {
                    where: { isActive: true },
                    orderBy: { sortOrder: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        currency: true,
                        isActive: true,
                    },
                },
            },
        });

        const dateIds = events.flatMap((e) => e.dates.map((d) => d.id));
        if (dateIds.length === 0) {
            return res.status(200).json([]);
        }

        // 2. Per-date sold/held/revenue aggregated in the DB.
        //    `held` = REFUNDED/CANCELLED where inventoryReturnedToPool is false.
        //    Use two grouped queries: one for tickets-sold counts, one for revenue/held.
        const capacityConsumingWhere = capacityConsumingStatusFilter();

        const [ticketCounts, orderAgg] = await Promise.all([
            prisma.ticket.groupBy({
                by: ['orderId'],
                where: {
                    order: {
                        eventDateId: { in: dateIds },
                        OR: capacityConsumingWhere,
                    },
                },
                _sum: { amount: true },
            }),
            prisma.order.findMany({
                where: {
                    eventDateId: { in: dateIds },
                    OR: capacityConsumingWhere,
                },
                select: {
                    id: true,
                    eventDateId: true,
                    status: true,
                    inventoryReturnedToPool: true,
                    finalTotal: true,
                    originalTotal: true,
                },
            }),
        ]);

        const amountByOrderId = new Map<string, number>();
        for (const row of ticketCounts) {
            amountByOrderId.set(row.orderId, row._sum.amount ?? 0);
        }

        type DateAgg = {
            totalOrders: number;
            totalTicketsSold: number;
            totalRevenuePence: number;
            heldCapacityOrders: number;
            heldCapacityTickets: number;
        };
        const byDate = new Map<number, DateAgg>();
        for (const order of orderAgg) {
            const agg = byDate.get(order.eventDateId) ?? {
                totalOrders: 0,
                totalTicketsSold: 0,
                totalRevenuePence: 0,
                heldCapacityOrders: 0,
                heldCapacityTickets: 0,
            };
            const ticketsForOrder = amountByOrderId.get(order.id) ?? 0;
            agg.totalOrders += 1;
            agg.totalTicketsSold += ticketsForOrder;

            const isHeld =
                (order.status === 'REFUNDED' || order.status === 'CANCELLED') &&
                !order.inventoryReturnedToPool;
            if (isHeld) {
                agg.heldCapacityOrders += 1;
                agg.heldCapacityTickets += ticketsForOrder;
            } else {
                agg.totalRevenuePence += order.finalTotal ?? order.originalTotal ?? 0;
            }
            byDate.set(order.eventDateId, agg);
        }

        const now = new Date();
        const eventsWithOrders = events.map((event) => {
            let totalOrders = 0;
            let totalTicketsSold = 0;
            let totalRevenuePence = 0;
            let heldCapacityOrders = 0;
            let heldCapacityTickets = 0;

            for (const date of event.dates) {
                const agg = byDate.get(date.id);
                if (!agg) continue;
                totalOrders += agg.totalOrders;
                totalTicketsSold += agg.totalTicketsSold;
                totalRevenuePence += agg.totalRevenuePence;
                heldCapacityOrders += agg.heldCapacityOrders;
                heldCapacityTickets += agg.heldCapacityTickets;
            }

            const nextDate = event.dates
                .filter((d) => d.date && new Date(d.date) > now)
                .sort(
                    (a, b) =>
                        new Date(a.date as Date).getTime() - new Date(b.date as Date).getTime(),
                )[0];

            return {
                id: event.id,
                title: event.title,
                description: event.description,
                coverImage: event.coverImage,
                isActive: event.isActive,
                venue: event.venue ?? null,
                dates: event.dates.map((d) => ({
                    id: d.id,
                    date: d.date,
                    totalTicketLimit: d.totalTicketLimit,
                })),
                ticketTypes: event.ticketTypes,
                totalOrders,
                totalTicketsSold,
                totalRevenue: Math.round((totalRevenuePence / 100) * 100) / 100,
                heldCapacityOrders,
                heldCapacityTickets,
                nextDate: nextDate?.date ?? null,
            };
        });

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
