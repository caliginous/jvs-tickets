import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../../lib/prisma";
import { allocateWaitlistOffers } from "../../../../../lib/services/waitlist/allocateWaitlistOffers";
import { requireAdmin } from "../../../../../lib/adminAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed" });
    }

    const session = await requireAdmin(req, res);
    if (!session) return;

    try {
        const { id } = req.query;

        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "Valid waitlist entry ID is required" });
        }

        const entry = await prisma.waitlistEntry.findUnique({
            where: { id },
            include: { offers: { where: { status: 'ACTIVE' } } },
        });

        if (!entry) {
            return res.status(404).json({ error: "Waitlist entry not found" });
        }

        if (entry.status === 'REMOVED') {
            return res.status(400).json({ error: "Entry is already removed" });
        }

        // Cancel any active offer
        let offerCancelled = false;
        for (const offer of entry.offers) {
            await prisma.waitlistOffer.update({
                where: { id: offer.id },
                data: { status: 'CANCELLED', cancelledAt: new Date() },
            });
            offerCancelled = true;

            await prisma.waitlistAuditLog.create({
                data: {
                    waitlistEntryId: id,
                    waitlistOfferId: offer.id,
                    eventDateId: offer.eventDateId,
                    eventTicketTypeId: offer.eventTicketTypeId,
                    action: 'OFFER_CANCELLED_BY_ADMIN',
                    actor: 'admin',
                },
            });
        }

        await prisma.waitlistEntry.update({
            where: { id },
            data: { status: 'REMOVED' },
        });

        await prisma.waitlistAuditLog.create({
            data: {
                waitlistEntryId: id,
                eventDateId: entry.eventDateId,
                eventTicketTypeId: entry.eventTicketTypeId,
                action: 'ENTRY_REMOVED_BY_ADMIN',
                actor: 'admin',
            },
        });

        // If an active offer was cancelled, reallocate
        if (offerCancelled) {
            try {
                await allocateWaitlistOffers({
                    eventDateId: entry.eventDateId,
                    eventTicketTypeId: entry.eventTicketTypeId,
                    actor: 'system:admin-remove-reallocation',
                });
            } catch (err) {
                console.error(`[admin/waitlist/remove] Reallocation failed:`, err);
            }
        }

        return res.status(200).json({ success: true, message: "Waitlist entry removed" });

    } catch (error: any) {
        console.error("[admin/waitlist/remove] Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
