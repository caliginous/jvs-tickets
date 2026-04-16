import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../../../lib/prisma';
import { capacityConsumingStatusFilter } from '../../../../../../lib/services/ticketing/capacityWhere';
import { serverAuthenticate, requestMainSiteEventRevalidation } from '../../../../../../constants/serverUtil';
import { PermissionSection, PermissionType } from '../../../../../../constants/interfaces';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const requiredType = req.method === 'GET' ? PermissionType.Read : PermissionType.Write;
    const actor = await serverAuthenticate(req, res, {
        permission: PermissionSection.EventTicketTypes,
        permissionType: requiredType
    });
    if (!actor) return;

    if (req.method === 'GET') {
        try {
            const { id: eventId } = req.query;
            const eventIdNum = parseInt(eventId as string);

            if (isNaN(eventIdNum)) {
                return res.status(400).json({ error: 'Invalid event ID' });
            }

            // Fetch ticket types
            const ticketTypes = await prisma.eventTicketType.findMany({
                where: { eventId: eventIdNum },
                orderBy: { sortOrder: 'asc' },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    price: true,
                    currency: true,
                    capacity: true,
                    isActive: true,
                    isPublic: true,
                    sortOrder: true,
                    publicSortOrder: true,
                    colorHex: true
                }
            });

            const soldCounts = await prisma.ticket.groupBy({
                by: ['eventTicketTypeId'],
                where: {
                    eventTicketTypeId: { in: ticketTypes.map(tt => tt.id) },
                    order: {
                        OR: capacityConsumingStatusFilter(),
                    }
                },
                _count: { id: true }
            });

            const soldMap = new Map(soldCounts.map(s => [s.eventTicketTypeId, s._count.id]));

            // Return ticket types with computed sold values
            const ticketTypesWithSold = ticketTypes.map(tt => ({
                ...tt,
                sold: soldMap.get(tt.id) || 0
            }));

            return res.status(200).json(ticketTypesWithSold);
        } catch (error) {
            console.error('Error fetching ticket types:', error);
            return res.status(500).json({ error: 'Failed to fetch ticket types' });
        }
    }

    if (req.method === 'POST') {
        try {
            const { id: eventId } = req.query;
            const eventIdNum = parseInt(eventId as string);

            if (isNaN(eventIdNum)) {
                return res.status(400).json({ error: 'Invalid event ID' });
            }

            const { name, description, price, currency, capacity, colorHex } = req.body;

            // Get the highest sort order for this event
            const maxSortOrder = await prisma.eventTicketType.aggregate({
                where: { eventId: eventIdNum },
                _max: { sortOrder: true }
            });

            const newTicketType = await prisma.eventTicketType.create({
                data: {
                    eventId: eventIdNum,
                    name,
                    description,
                    price: parseInt(price),
                    currency: currency || 'GBP',
                    capacity: capacity ? parseInt(capacity) : null,
                    colorHex,
                    sortOrder: (maxSortOrder._max.sortOrder || 0) + 1
                }
            });

            // Ticket-type changes affect the JVS events listing (price range,
            // availability) so nudge the marketing site to revalidate.
            const parentEvent = await prisma.event.findUnique({
                where: { id: eventIdNum },
                select: { slug: true },
            });
            requestMainSiteEventRevalidation({
                action: "event_updated",
                eventId: eventIdNum,
                slug: parentEvent?.slug ?? null,
            }).catch(() => {});

            return res.status(201).json({ ...newTicketType, sold: 0 });
        } catch (error) {
            console.error('Error creating ticket type:', error);
            return res.status(500).json({ error: 'Failed to create ticket type' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
