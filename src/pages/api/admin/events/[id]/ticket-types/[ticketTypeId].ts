import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id: eventId, ticketTypeId } = req.query;
    const eventIdNum = parseInt(eventId as string);
    const ticketTypeIdNum = parseInt(ticketTypeId as string);

    if (isNaN(eventIdNum) || isNaN(ticketTypeIdNum)) {
        return res.status(400).json({ error: 'Invalid event ID or ticket type ID' });
    }

    if (req.method === 'GET') {
        try {
            const ticketType = await prisma.eventTicketType.findFirst({
                where: {
                    id: ticketTypeIdNum,
                    eventId: eventIdNum
                }
            });

            if (!ticketType) {
                return res.status(404).json({ error: 'Ticket type not found' });
            }

            return res.status(200).json(ticketType);
        } catch (error) {
            console.error('Error fetching ticket type:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                eventId: eventIdNum,
                ticketTypeId: ticketTypeIdNum
            });
            return res.status(500).json({ 
                error: 'Failed to fetch ticket type',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    if (req.method === 'PUT') {
        try {
            const { name, description, price, currency, capacity, colorHex, isActive, sortOrder } = req.body;

            // Validate required fields
            if (!name || price === undefined) {
                return res.status(400).json({ 
                    error: 'Missing required fields: name and price are required' 
                });
            }

            // Validate price is a valid number
            const priceNum = parseInt(price);
            if (isNaN(priceNum) || priceNum < 0) {
                return res.status(400).json({ 
                    error: 'Invalid price: must be a positive number' 
                });
            }

            // Test database connection first
            try {
                await prisma.$connect();
            } catch (connError) {
                console.error('Database connection failed:', connError);
                return res.status(500).json({ 
                    error: 'Database connection failed',
                    details: 'Unable to connect to database'
                });
            }

            const updatedTicketType = await prisma.eventTicketType.update({
                where: {
                    id: ticketTypeIdNum
                },
                data: {
                    name,
                    description,
                    price: priceNum,
                    currency: currency || 'GBP',
                    capacity: capacity ? parseInt(capacity) : null,
                    colorHex,
                    isActive: Boolean(isActive),
                    sortOrder: sortOrder ? parseInt(sortOrder) : undefined
                }
            });

            return res.status(200).json(updatedTicketType);
        } catch (error) {
            console.error('Error updating ticket type:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                eventId: eventIdNum,
                ticketTypeId: ticketTypeIdNum,
                body: req.body
            });
            return res.status(500).json({ 
                error: 'Failed to update ticket type',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    if (req.method === 'DELETE') {
        try {
            // Check if there are any tickets using this ticket type
            const ticketCount = await prisma.ticket.count({
                where: { eventTicketTypeId: ticketTypeIdNum }
            });

            if (ticketCount > 0) {
                return res.status(400).json({ 
                    error: `Cannot delete ticket type: ${ticketCount} tickets are using it` 
                });
            }

            await prisma.eventTicketType.delete({
                where: { id: ticketTypeIdNum }
            });

            return res.status(204).end();
        } catch (error) {
            console.error('Error deleting ticket type:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                eventId: eventIdNum,
                ticketTypeId: ticketTypeIdNum
            });
            return res.status(500).json({ 
                error: 'Failed to delete ticket type',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
