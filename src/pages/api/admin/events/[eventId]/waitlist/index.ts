import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../../../lib/prisma";
import { requireAdmin } from "../../../../../../lib/adminAuth";
import { PermissionType } from "../../../../../../constants/interfaces";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ error: "Method not allowed" });
    }

    const session = await requireAdmin(req, res, PermissionType.Read);
    if (!session) return;

    try {
        const { eventId } = req.query;

        if (!eventId || typeof eventId !== "string") {
            return res.status(400).json({ error: "Valid event ID is required" });
        }

        const eventIdNum = parseInt(eventId, 10);

        const eventDates = await prisma.eventDate.findMany({
            where: { eventId: eventIdNum },
            select: { id: true },
        });

        const eventDateIds = eventDates.map(d => d.id);

        // Active entries grouped by ticket type
        const entries = await prisma.waitlistEntry.findMany({
            where: { eventDateId: { in: eventDateIds } },
            include: {
                eventTicketType: { select: { id: true, name: true } },
                eventDate: { select: { id: true, title: true, date: true } },
                offers: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
            orderBy: [{ createdAt: 'asc' }],
        });

        // Active offers
        const activeOffers = await prisma.waitlistOffer.findMany({
            where: {
                eventDateId: { in: eventDateIds },
                status: 'ACTIVE',
                expiresAt: { gt: new Date() },
            },
            include: {
                waitlistEntry: { select: { email: true, firstName: true, lastName: true } },
                eventTicketType: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Summary counts
        const statusCounts = await prisma.waitlistEntry.groupBy({
            by: ['status'],
            where: { eventDateId: { in: eventDateIds } },
            _count: { id: true },
        });

        const offerStatusCounts = await prisma.waitlistOffer.groupBy({
            by: ['status'],
            where: { eventDateId: { in: eventDateIds } },
            _count: { id: true },
        });

        const summary = {
            entries: Object.fromEntries(statusCounts.map(s => [s.status, s._count.id])),
            offers: Object.fromEntries(offerStatusCounts.map(s => [s.status, s._count.id])),
        };

        // Conversion rate
        const totalOffered = offerStatusCounts.reduce((sum, s) => sum + s._count.id, 0);
        const totalClaimed = offerStatusCounts.find(s => s.status === 'CLAIMED')?._count.id || 0;
        const conversionRate = totalOffered > 0 ? (totalClaimed / totalOffered * 100).toFixed(1) : '0.0';

        return res.status(200).json({
            entries,
            activeOffers,
            summary,
            conversionRate: `${conversionRate}%`,
        });

    } catch (error: any) {
        console.error("[admin/waitlist] Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
