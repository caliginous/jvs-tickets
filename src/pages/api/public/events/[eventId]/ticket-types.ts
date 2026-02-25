import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../../lib/prisma';
import { computeAvailability } from '../../../../../lib/services/ticketing/availability';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { eventId, eventDateId } = req.query;
        const eventIdNum = parseInt(eventId as string);

        if (isNaN(eventIdNum)) {
            return res.status(400).json({ error: 'Invalid event ID' });
        }

        // Find the event and its dates
        const event = await prisma.event.findUnique({
            where: { id: eventIdNum },
            select: {
                id: true,
                isActive: true,
                dates: {
                    orderBy: { date: 'asc' },
                    select: { id: true, date: true }
                },
                ticketTypes: {
                    where: { isActive: true, isPublic: true },
                    select: {
                        id: true,
                        description: true,
                        publicSortOrder: true,
                        colorHex: true
                    }
                }
            }
        });

        if (!event || !event.isActive) {
            return res.status(404).json({ error: 'Event not found or inactive' });
        }

        // Determine which eventDateId to use
        let targetDateId: number;
        if (eventDateId && typeof eventDateId === 'string') {
            targetDateId = parseInt(eventDateId);
            if (isNaN(targetDateId)) {
                return res.status(400).json({ error: 'Invalid eventDateId' });
            }
        } else {
            // Default to the next upcoming date, or the first date if all past
            const now = new Date();
            const futureDate = event.dates.find(d => d.date && new Date(d.date) > now);
            const targetDate = futureDate || event.dates[0];
            
            if (!targetDate) {
                return res.status(404).json({ error: 'No event dates found' });
            }
            targetDateId = targetDate.id;
        }

        // Get computed availability from the canonical service
        const availability = await computeAvailability(targetDateId);

        // Enrich with additional ticket type info and filter for public display
        const ticketTypesWithAvailability = availability.ticketTypes.map(tt => {
            const extraInfo = event.ticketTypes.find(t => t.id === tt.eventTicketTypeId);
            return {
                id: tt.eventTicketTypeId,
                name: tt.name,
                description: extraInfo?.description || null,
                price: tt.price,
                currency: tt.currency,
                capacity: tt.capacity,
                sold: tt.sold, // Computed from Ticket rows, not DB column
                available: tt.available ?? 999999,
                isSoldOut: tt.isSoldOut,
                isAvailable: !tt.isSoldOut,
                publicSortOrder: extraInfo?.publicSortOrder ?? 0,
                colorHex: extraInfo?.colorHex || null
            };
        }).sort((a, b) => a.publicSortOrder - b.publicSortOrder);

        return res.status(200).json({
            eventDateId: availability.eventDateId,
            globalRemaining: availability.globalRemaining,
            totalSold: availability.totalSold,
            totalLimit: availability.totalLimit,
            ticketTypes: ticketTypesWithAvailability
        });

    } catch (error) {
        console.error('Error fetching public ticket types:', error);
        return res.status(500).json({ 
            error: 'Failed to fetch ticket types',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
