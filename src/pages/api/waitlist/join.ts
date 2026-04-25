import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { computeAvailability } from "../../../lib/services/ticketing/availability";
import { getTurnstileConfig, verifyTurnstileToken } from "../../../lib/turnstileVerify";

const MAX_WAITLIST_QUANTITY = 10;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const turnstileCfg = getTurnstileConfig();
        const siteKey = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "").trim();
        const secret = (process.env.TURNSTILE_SECRET_KEY || "").trim();
        if ((siteKey && !secret) || (!siteKey && secret)) {
            console.error(
                "[waitlist/join] Turnstile misconfigured: set both NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY"
            );
            return res.status(503).json({ error: "Waitlist is temporarily unavailable. Please try again later." });
        }

        const { eventDateId, eventTicketTypeId, email, firstName, lastName, phone, quantity, turnstileToken } = req.body;

        if (turnstileCfg.enabled) {
            if (!turnstileToken) {
                return res.status(400).json({ error: "Please complete the security verification." });
            }
            const ok = await verifyTurnstileToken(turnstileToken, turnstileCfg.secret);
            if (!ok) {
                return res.status(400).json({ error: "Security verification failed. Please try again." });
            }
        }

        if (!eventDateId || !eventTicketTypeId || !email || !quantity) {
            return res.status(400).json({ error: "Missing required fields: eventDateId, eventTicketTypeId, email, quantity" });
        }

        const requestedQuantity = parseInt(quantity, 10);
        if (isNaN(requestedQuantity) || requestedQuantity < 1) {
            return res.status(400).json({ error: "Quantity must be at least 1" });
        }
        if (requestedQuantity > MAX_WAITLIST_QUANTITY) {
            return res.status(400).json({ error: `Quantity cannot exceed ${MAX_WAITLIST_QUANTITY}` });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email address" });
        }

        // Validate ticket type belongs to event date
        const ticketType = await prisma.eventTicketType.findFirst({
            where: {
                id: eventTicketTypeId,
                event: {
                    dates: { some: { id: eventDateId } }
                },
                isActive: true,
            }
        });

        if (!ticketType) {
            return res.status(400).json({ error: "Invalid ticket type for this event date" });
        }

        // If tickets are actually available, don't allow waitlist join
        const availability = await computeAvailability(eventDateId);
        const typeAvailability = availability.ticketTypes.find(
            t => t.eventTicketTypeId === eventTicketTypeId
        );

        if (typeAvailability && typeAvailability.available !== null && typeAvailability.available >= requestedQuantity) {
            return res.status(400).json({
                error: "Tickets are currently available for this event. Please proceed to purchase directly."
            });
        }

        // Application-level duplicate check (friendly message before DB constraint)
        const existingEntry = await prisma.waitlistEntry.findFirst({
            where: {
                email: email.toLowerCase().trim(),
                eventDateId,
                eventTicketTypeId,
                status: { in: ['ACTIVE', 'OFFERED'] },
            }
        });

        if (existingEntry) {
            return res.status(409).json({
                error: "You already have an active waitlist entry for this ticket type. We'll notify you when tickets become available."
            });
        }

        const entry = await prisma.waitlistEntry.create({
            data: {
                eventDateId,
                eventTicketTypeId,
                email: email.toLowerCase().trim(),
                firstName: firstName || null,
                lastName: lastName || null,
                phone: phone || null,
                requestedQuantity,
                status: 'ACTIVE',
                source: 'public',
            }
        });

        // Audit log
        await prisma.waitlistAuditLog.create({
            data: {
                waitlistEntryId: entry.id,
                eventDateId,
                eventTicketTypeId,
                action: 'JOINED_WAITLIST',
                actor: email.toLowerCase().trim(),
                metadataJson: JSON.stringify({ requestedQuantity }),
            }
        });

        console.log(`[waitlist/join] Entry ${entry.id} created for ${email} - event date ${eventDateId}, ticket type ${eventTicketTypeId}, qty ${requestedQuantity}`);

        return res.status(201).json({
            success: true,
            message: "You have been added to the waitlist. We'll notify you when tickets become available.",
            entryId: entry.id,
        });

    } catch (error: any) {
        // Handle partial unique index violation (race condition)
        if (error.code === 'P2002' && error.meta?.target?.includes('waitlist_entry_active_unique')) {
            return res.status(409).json({
                error: "You already have an active waitlist entry for this ticket type."
            });
        }

        console.error("[waitlist/join] Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
