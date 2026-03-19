import crypto from 'crypto';
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";
import { allocateWaitlistOffers } from "../../../../lib/services/waitlist/allocateWaitlistOffers";

async function lazilyExpireOffer(offer: { id: string; waitlistEntryId: string; eventDateId: number; eventTicketTypeId: number; status: string; expiresAt: Date }) {
    if (offer.status !== 'ACTIVE' || new Date() < offer.expiresAt) {
        return false;
    }

    await prisma.waitlistOffer.update({
        where: { id: offer.id },
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
            action: 'OFFER_EXPIRED_LAZY',
            actor: 'system:lazy-expiry',
        },
    });

    // Trigger reallocation for the freed capacity
    allocateWaitlistOffers({
        eventDateId: offer.eventDateId,
        eventTicketTypeId: offer.eventTicketTypeId,
        actor: 'system:lazy-expiry-reallocation',
    }).catch(err => {
        console.error(`[waitlist/claim] Lazy expiry reallocation failed:`, err);
    });

    return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
        return res.status(400).json({ error: "Valid offer token is required" });
    }

    // GET: load offer details for claim page display
    if (req.method === "GET") {
        try {
            const offer = await prisma.waitlistOffer.findUnique({
                where: { offerToken: token },
                include: {
                    eventDate: {
                        include: {
                            event: {
                                include: { venue: true }
                            }
                        }
                    },
                    eventTicketType: true,
                    waitlistEntry: {
                        select: { email: true, firstName: true, lastName: true }
                    },
                },
            });

            if (!offer) {
                return res.status(404).json({ error: "Offer not found" });
            }

            if (await lazilyExpireOffer(offer)) {
                return res.status(410).json({ error: "This offer has expired" });
            }

            if (offer.status !== 'ACTIVE') {
                return res.status(410).json({
                    error: `This offer is no longer active (status: ${offer.status})`
                });
            }

            return res.status(200).json({
                offerId: offer.id,
                eventDateId: offer.eventDateId,
                eventName: offer.eventDate.event.title,
                eventDate: offer.eventDate.date?.toISOString(),
                venueName: offer.eventDate.event.venue?.name,
                ticketTypeName: offer.eventTicketType.name,
                ticketTypeId: offer.eventTicketTypeId,
                ticketPrice: offer.eventTicketType.price,
                currency: offer.eventTicketType.currency,
                quantity: offer.quantity,
                expiresAt: offer.expiresAt.toISOString(),
                entryEmail: offer.waitlistEntry.email,
                entryFirstName: offer.waitlistEntry.firstName,
                entryLastName: offer.waitlistEntry.lastName,
            });

        } catch (error: any) {
            console.error("[waitlist/claim] GET error:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }

    // POST: create claim session for checkout
    if (req.method === "POST") {
        try {
            const offer = await prisma.waitlistOffer.findUnique({
                where: { offerToken: token },
            });

            if (!offer) {
                return res.status(404).json({ error: "Offer not found" });
            }

            if (await lazilyExpireOffer(offer)) {
                return res.status(410).json({ error: "This offer has expired" });
            }

            if (offer.status !== 'ACTIVE') {
                return res.status(410).json({
                    error: `This offer is no longer active (status: ${offer.status})`
                });
            }

            // Check for existing unused claim session
            const existingSession = await prisma.waitlistClaimSession.findFirst({
                where: {
                    waitlistOfferId: offer.id,
                    usedAt: null,
                    expiresAt: { gt: new Date() },
                },
            });

            if (existingSession) {
                return res.status(200).json({
                    claimSessionId: existingSession.id,
                    claimSessionToken: existingSession.token,
                    expiresAt: existingSession.expiresAt.toISOString(),
                });
            }

            const claimSession = await prisma.waitlistClaimSession.create({
                data: {
                    waitlistOfferId: offer.id,
                    token: crypto.randomBytes(32).toString('hex'),
                    expiresAt: offer.expiresAt,
                },
            });

            await prisma.waitlistAuditLog.create({
                data: {
                    waitlistEntryId: offer.waitlistEntryId,
                    waitlistOfferId: offer.id,
                    eventDateId: offer.eventDateId,
                    eventTicketTypeId: offer.eventTicketTypeId,
                    action: 'CLAIM_SESSION_CREATED',
                    metadataJson: JSON.stringify({
                        claimSessionId: claimSession.id,
                        expiresAt: claimSession.expiresAt.toISOString(),
                    }),
                },
            });

            return res.status(201).json({
                claimSessionId: claimSession.id,
                claimSessionToken: claimSession.token,
                expiresAt: claimSession.expiresAt.toISOString(),
            });

        } catch (error: any) {
            console.error("[waitlist/claim] POST error:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
}
