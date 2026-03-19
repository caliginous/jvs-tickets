import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../../../lib/prisma";
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
            include: {
                waitlistEntry: true,
                eventDate: { include: { event: { include: { venue: true, ticketTypes: true } } } },
                eventTicketType: true,
            },
        });

        if (!offer) {
            return res.status(404).json({ error: "Offer not found" });
        }

        if (offer.status !== 'ACTIVE') {
            return res.status(400).json({ error: "Can only resend active offers" });
        }

        if (new Date() >= offer.expiresAt) {
            return res.status(400).json({ error: "Offer has expired" });
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tickets.jvs.org.uk';
        const claimLink = `${baseUrl}/waitlist/claim/${offer.offerToken}`;

        try {
            const { emailTriggerService } = await import('../../../../../../lib/services/emailTriggerService');

            await emailTriggerService.sendWaitlistOffer({
                userEmail: offer.waitlistEntry.email,
                userFirstName: offer.waitlistEntry.firstName || '',
                userLastName: offer.waitlistEntry.lastName || '',
                eventTitle: offer.eventDate?.event?.title || 'Event',
                eventDate: offer.eventDate?.date
                    ? new Date(offer.eventDate.date).toLocaleDateString('en-GB', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    })
                    : 'TBD',
                eventTime: offer.eventDate?.date
                    ? new Date(offer.eventDate.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                    : 'TBD',
                eventLocation: offer.eventDate?.event?.venue?.name || 'Venue TBC',
                ticketTypeName: offer.eventTicketType.name,
                quantity: offer.quantity,
                expiresAt: offer.expiresAt.toISOString(),
                claimLink,
                locale: 'en',
            });
        } catch (emailError) {
            console.error(`[admin/waitlist/resend] Email send failed for offer ${id}:`, emailError);
        }

        await prisma.waitlistAuditLog.create({
            data: {
                waitlistEntryId: offer.waitlistEntryId,
                waitlistOfferId: offer.id,
                eventDateId: offer.eventDateId,
                eventTicketTypeId: offer.eventTicketTypeId,
                action: 'OFFER_EMAIL_RESENT',
                actor: 'admin',
            },
        });

        console.log(`[admin/waitlist/resend] Offer email resent for offer ${id} to ${offer.waitlistEntry.email}`);

        return res.status(200).json({
            success: true,
            message: "Offer email resent",
            email: offer.waitlistEntry.email,
        });

    } catch (error: any) {
        console.error("[admin/waitlist/resend] Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
