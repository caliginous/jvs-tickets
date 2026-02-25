import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../../../lib/prisma';
import { getAdminServerSideProps } from '../../../../../../constants/serverUtil';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const { id: eventId } = req.query;
            const eventIdNum = parseInt(eventId as string);

            if (isNaN(eventIdNum)) {
                return res.status(400).json({ error: 'Invalid event ID' });
            }

            const ticketTypes = await prisma.eventTicketType.findMany({
                where: { eventId: eventIdNum },
                orderBy: { sortOrder: 'asc' }
            });

            return res.status(200).json(ticketTypes);
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

            return res.status(201).json(newTicketType);
        } catch (error) {
            console.error('Error creating ticket type:', error);
            return res.status(500).json({ error: 'Failed to create ticket type' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
