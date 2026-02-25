import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { slug } = req.query;

        if (!slug || typeof slug !== 'string') {
            return res.status(400).json({ error: 'Invalid slug' });
        }

        // Find the event by slug
        const event = await prisma.event.findFirst({
            where: {
                slug: slug,
                isActive: true
            },
            select: {
                id: true
            }
        });

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Fetch ticket types for this event
        const ticketTypes = await prisma.eventTicketType.findMany({
            where: {
                eventId: event.id,
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
                sold: true,
                isActive: true,
                isPublic: true,
                publicSortOrder: true,
                colorHex: true
            },
            orderBy: [
                { publicSortOrder: 'asc' },
                { name: 'asc' }
            ]
        });

        // Calculate availability for each ticket type
        const ticketTypesWithAvailability = ticketTypes.map(type => {
            const available = type.capacity === null 
                ? 999999 // Large number for unlimited capacity
                : Math.max(type.capacity - type.sold, 0);

            return {
                id: type.id,
                name: type.name,
                description: type.description,
                price: type.price,
                currency: type.currency,
                capacity: type.capacity,
                sold: type.sold,
                available,
                isActive: type.isActive,
                isPublic: type.isPublic,
                publicSortOrder: type.publicSortOrder,
                colorHex: type.colorHex
            };
        });

        // Filter out sold-out types
        const availableTicketTypes = ticketTypesWithAvailability.filter(type => type.available > 0);

        return res.status(200).json(availableTicketTypes);

    } catch (error) {
        console.error('Error fetching public ticket types by slug:', error);
        return res.status(500).json({ 
            error: 'Failed to fetch ticket types',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
