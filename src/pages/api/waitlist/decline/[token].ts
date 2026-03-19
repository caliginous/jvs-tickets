import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";
import { allocateWaitlistOffers } from "../../../../lib/services/waitlist/allocateWaitlistOffers";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { token } = req.query;

        if (!token || typeof token !== "string") {
            return res.status(400).json({ error: "Valid offer token is required" });
        }

        const offer = await prisma.waitlistOffer.findUnique({
            where: { offerToken: token },
        });

        if (!offer) {
            return res.status(404).json({ error: "Offer not found" });
        }

        if (offer.status !== 'ACTIVE') {
            return res.status(400).json({
                error: `Offer cannot be declined (status: ${offer.status})`
            });
        }

        // Lazily expire if past due
        if (new Date() >= offer.expiresAt) {
            await prisma.waitlistOffer.update({
                where: { id: offer.id },
                data: { status: 'EXPIRED', expiredAt: new Date() },
            });
            await prisma.waitlistEntry.update({
                where: { id: offer.waitlistEntryId },
                data: { status: 'EXPIRED' },
            });
            return res.status(410).json({ error: "This offer has already expired" });
        }

        await prisma.waitlistOffer.update({
            where: { id: offer.id },
            data: { status: 'DECLINED', declinedAt: new Date() },
        });

        await prisma.waitlistEntry.update({
            where: { id: offer.waitlistEntryId },
            data: { status: 'DECLINED' },
        });

        await prisma.waitlistAuditLog.create({
            data: {
                waitlistEntryId: offer.waitlistEntryId,
                waitlistOfferId: offer.id,
                eventDateId: offer.eventDateId,
                eventTicketTypeId: offer.eventTicketTypeId,
                action: 'OFFER_DECLINED',
                metadataJson: JSON.stringify({ declinedAt: new Date().toISOString() }),
            },
        });

        // Re-allocate freed capacity
        try {
            await allocateWaitlistOffers({
                eventDateId: offer.eventDateId,
                eventTicketTypeId: offer.eventTicketTypeId,
                actor: 'system:decline-reallocation',
            });
        } catch (allocError) {
            console.error(`[waitlist/decline] Reallocation failed after decline:`, allocError);
        }

        return res.status(200).json({
            success: true,
            message: "Offer declined successfully",
        });

    } catch (error: any) {
        console.error("[waitlist/decline] Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
