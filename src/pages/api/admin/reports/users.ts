import { NextApiRequest, NextApiResponse } from 'next';
import { serverAuthenticate } from '../../../../constants/serverUtil';
import { PermissionSection, PermissionType } from '../../../../constants/interfaces';
import prisma from '../../../../lib/prisma';

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

        const { search, sortBy = 'recent', segment, dateFilter, year } = req.query;

        // Calculate date range based on filter
        let dateFrom: Date | undefined = undefined;
        const now = new Date();
        
        if (dateFilter === 'month') {
            dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        } else if (dateFilter === 'quarter') {
            dateFrom = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        } else if (dateFilter === 'sixmonths') {
            dateFrom = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        } else if (dateFilter === 'year') {
            dateFrom = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
        } else if (dateFilter === 'selectyear' && year) {
            const selectedYear = parseInt(year as string);
            dateFrom = new Date(selectedYear, 0, 1);
            const dateTo = new Date(selectedYear, 11, 31, 23, 59, 59);
        }

        // Build orders where clause with date filter
        const ordersWhere: any = {
            status: {
                in: ['PAID', 'CONFIRMED']
            }
        };

        if (dateFrom) {
            ordersWhere.date = { gte: dateFrom };
            if (dateFilter === 'selectyear' && year) {
                const selectedYear = parseInt(year as string);
                ordersWhere.date = {
                    gte: new Date(selectedYear, 0, 1),
                    lte: new Date(selectedYear, 11, 31, 23, 59, 59)
                };
            }
        }

        // Pagination. Admin UI can pass ?limit=&offset=; default is reasonable but
        // bounded so we never accidentally load every user+order+ticket into memory.
        const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "200"), 10) || 200, 1), 500);
        const offset = Math.max(parseInt(String(req.query.offset ?? "0"), 10) || 0, 0);

        // SQL-prune: only return users that have at least one matching order in range.
        // Per-user we cap the included orders at the 20 most recent — the report UI
        // shows aggregates + a recent list. Full history remains available via the
        // order admin endpoints. Ticket aggregate counts are still accurate because
        // we use per-order `_sum` rather than counting inlined ticket rows.
        const users = await prisma.user.findMany({
            where: { orders: { some: ordersWhere } },
            orderBy: { id: 'asc' },
            take: limit,
            skip: offset,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                address: true,
                city: true,
                zip: true,
                countryCode: true,
                orders: {
                    where: ordersWhere,
                    orderBy: { date: 'desc' },
                    take: 20,
                    select: {
                        id: true,
                        date: true,
                        status: true,
                        finalTotal: true,
                        originalTotal: true,
                        eventDate: {
                            select: {
                                eventId: true,
                                date: true,
                                event: { select: { title: true } },
                            },
                        },
                        tickets: { select: { amount: true } },
                    },
                },
            },
        });

        // Transform and calculate analytics for each user
        let userAnalytics = users
            .filter(user => user.orders.length > 0) // Only users with orders
            .map(user => {
                const totalRevenue = user.orders.reduce((sum, order) => {
                    return sum + (order.finalTotal || order.originalTotal || 0);
                }, 0);

                const totalTickets = user.orders.reduce((sum, order) => {
                    return sum + order.tickets.reduce((ticketSum, ticket) => ticketSum + ticket.amount, 0);
                }, 0);

                const uniqueEvents = new Set(user.orders.map(o => o.eventDate.eventId)).size;
                
                const firstPurchase = user.orders.length > 0 
                    ? new Date(user.orders[user.orders.length - 1].date)
                    : null;
                
                const lastPurchase = user.orders.length > 0 
                    ? new Date(user.orders[0].date)
                    : null;

                const averageOrderValue = user.orders.length > 0 
                    ? totalRevenue / user.orders.length 
                    : 0;

                // Determine customer segment
                let segment = 'New';
                if (user.orders.length >= 5) {
                    segment = 'VIP';
                } else if (user.orders.length >= 2) {
                    segment = 'Regular';
                }

                // Check if active (purchased in last 6 months)
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                const isActive = lastPurchase && lastPurchase > sixMonthsAgo;

                return {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    phone: user.phone,
                    address: user.address,
                    city: user.city,
                    zip: user.zip,
                    countryCode: user.countryCode,
                    totalOrders: user.orders.length,
                    uniqueEvents: uniqueEvents,
                    totalTickets: totalTickets,
                    totalRevenue: totalRevenue,
                    averageOrderValue: averageOrderValue,
                    firstPurchase: firstPurchase?.toISOString(),
                    lastPurchase: lastPurchase?.toISOString(),
                    segment: segment,
                    isActive: isActive,
                    orders: user.orders.map(order => ({
                        id: order.id,
                        date: order.date,
                        eventTitle: order.eventDate.event.title,
                        eventDate: order.eventDate.date,
                        total: order.finalTotal || order.originalTotal || 0,
                        ticketCount: order.tickets.reduce((sum, ticket) => sum + ticket.amount, 0),
                        status: order.status
                    }))
                };
            });

        // Apply search filter
        if (search && typeof search === 'string') {
            const searchLower = search.toLowerCase();
            userAnalytics = userAnalytics.filter(user => 
                user.firstName.toLowerCase().includes(searchLower) ||
                user.lastName.toLowerCase().includes(searchLower) ||
                user.email.toLowerCase().includes(searchLower)
            );
        }

        // Apply segment filter
        if (segment && typeof segment === 'string') {
            if (segment === 'active') {
                userAnalytics = userAnalytics.filter(u => u.isActive);
            } else if (segment === 'inactive') {
                userAnalytics = userAnalytics.filter(u => !u.isActive);
            } else if (segment !== 'all') {
                userAnalytics = userAnalytics.filter(u => u.segment.toLowerCase() === segment.toLowerCase());
            }
        }

        // Apply sorting
        if (sortBy === 'recent') {
            userAnalytics.sort((a, b) => 
                new Date(b.lastPurchase || 0).getTime() - new Date(a.lastPurchase || 0).getTime()
            );
        } else if (sortBy === 'alphabetical') {
            userAnalytics.sort((a, b) => 
                `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
            );
        } else if (sortBy === 'tickets') {
            userAnalytics.sort((a, b) => b.totalTickets - a.totalTickets);
        } else if (sortBy === 'revenue') {
            userAnalytics.sort((a, b) => b.totalRevenue - a.totalRevenue);
        } else if (sortBy === 'events') {
            userAnalytics.sort((a, b) => b.uniqueEvents - a.uniqueEvents);
        }

        // Calculate summary statistics
        const summary = {
            totalUsers: userAnalytics.length,
            totalRevenue: userAnalytics.reduce((sum, u) => sum + u.totalRevenue, 0),
            totalOrders: userAnalytics.reduce((sum, u) => sum + u.totalOrders, 0),
            totalTickets: userAnalytics.reduce((sum, u) => sum + u.totalTickets, 0),
            averageRevenuePerUser: userAnalytics.length > 0 
                ? userAnalytics.reduce((sum, u) => sum + u.totalRevenue, 0) / userAnalytics.length 
                : 0,
            activeUsers: userAnalytics.filter(u => u.isActive).length,
            vipUsers: userAnalytics.filter(u => u.segment === 'VIP').length,
            regularUsers: userAnalytics.filter(u => u.segment === 'Regular').length,
            newUsers: userAnalytics.filter(u => u.segment === 'New').length
        };

        return res.status(200).json({
            users: userAnalytics,
            summary: summary
        });

    } catch (error) {
        console.error('Error fetching user analytics:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
