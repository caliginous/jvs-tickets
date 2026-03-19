import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../../../lib/prisma";
import { allocateWaitlistOffers } from "../../../../../../lib/services/waitlist/allocateWaitlistOffers";
import { requireAdmin } from "../../../../../../lib/adminAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed" });
    }

    const session = await requireAdmin(req, res);
    if (!session) return;

    try {
        const { id } = req.query;
        const { eventTicketTypeId } = req.body;

        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "Valid event ID is required" });
        }

        const eventDates = await prisma.eventDate.findMany({
            where: { eventId: parseInt(id, 10) },
            select: { id: true },
        });

        if (eventDates.length === 0) {
            return res.status(404).json({ error: "No event dates found for this event" });
        }

        const results = [];
        for (const ed of eventDates) {
            const result = await allocateWaitlistOffers({
                eventDateId: ed.id,
                eventTicketTypeId: eventTicketTypeId ? parseInt(eventTicketTypeId, 10) : undefined,
                actor: 'admin:manual',
            });
            results.push({ eventDateId: ed.id, ...result });
        }

        return res.status(200).json({
            success: true,
            results,
        });

    } catch (error: any) {
        console.error("[admin/waitlist/allocate] Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
