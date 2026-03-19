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

        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "Valid offer ID is required" });
        }

        const offer = await prisma.waitlistOffer.findUnique({
            where: { id },
        });

        if (!offer) {
            return res.status(404).json({ error: "Offer not found" });
        }

        if (offer.status !== 'ACTIVE') {
            return res.status(400).json({ error: `Offer cannot be expired (status: ${offer.status})` });
        }

        await prisma.waitlistOffer.update({
            where: { id },
            data: { status: 'EXPIRED', expiredAt: new Date() },
        });

        await prisma.waitlistEntry.update({
            where: { id: offer.waitlistEntryId },
            data: { status: 'EXPIRED' },
        });

        await prisma.waitlistAuditLog.create({
            data: {
                waitlistEntryId: offer.waitlistEntryId,
                waitlistOfferId: offer.id,
                eventDateId: offer.eventDateId,
                eventTicketTypeId: offer.eventTicketTypeId,
                action: 'OFFER_MANUALLY_EXPIRED',
                actor: 'admin',
            },
        });

        // Trigger reallocation
        try {
            await allocateWaitlistOffers({
                eventDateId: offer.eventDateId,
                eventTicketTypeId: offer.eventTicketTypeId,
                actor: 'system:admin-expire-reallocation',
            });
        } catch (err) {
            console.error(`[admin/waitlist/expire] Reallocation failed:`, err);
        }

        return res.status(200).json({ success: true, message: "Offer expired" });

    } catch (error: any) {
        console.error("[admin/waitlist/expire] Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
