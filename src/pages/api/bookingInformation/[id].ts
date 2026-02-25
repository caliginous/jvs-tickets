import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { computeAvailability } from "../../../lib/services/ticketing/availability";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "GET") return res.status(400).end("Method unsupported");
    const { id } = req.query;
    const eventDateId = parseInt(id as string);
    try {
        const eventDate = await prisma.eventDate.findUnique({
            where: {
                id: eventDateId
            },
            select: {
                event: {
                    select: {
                        ticketTypes: {
                            where: { isActive: true, isPublic: true },
                            orderBy: { publicSortOrder: 'asc' }
                        }
                    }
                }
            }
        });
        if (!eventDate) {
            return res.status(404).end("Event date not found");
        }

        const availability = await computeAvailability(eventDateId);
        const ticketTypes = eventDate.event.ticketTypes;
        const categoryAmount = ticketTypes.map(tt => {
            const typeAvailability = availability.ticketTypes.find(t => t.eventTicketTypeId === tt.id);
            return {
                id: tt.id,
                name: tt.name,
                label: tt.name,
                price: tt.price,
                color: tt.colorHex || null,
                ticketsLeft: typeAvailability?.available ?? null,
                maxAmount: tt.capacity
            };
        });

        return res.status(200).json({ categoryAmount });
    } catch (e) {
        return res.status(500).end("Server error");
    }
}
