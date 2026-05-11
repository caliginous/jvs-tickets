import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";

const toPence = (amountInPounds: number | null | undefined): number | null => {
  if (amountInPounds === null || amountInPounds === undefined) return null;
  return Math.round(Number(amountInPounds) * 100);
};

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { code, eventId, orderTotal, ticketTypeIds } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Discount code is required" });
    }

    const normalizedCode = String(code).trim().toUpperCase();
    const orderTotalPounds = Number(orderTotal);
    if (!Number.isFinite(orderTotalPounds) || orderTotalPounds < 0) {
      return res.status(400).json({ error: "Invalid order total" });
    }
    const orderTotalPence = Math.round(orderTotalPounds * 100);

    // Find the discount code
    const discountCode = await prisma.discountCode.findFirst({
      where: { code: { equals: normalizedCode, mode: "insensitive" } }
    });

    if (!discountCode) {
      return res.status(404).json({ error: "Invalid discount code" });
    }

    // Check if code is active
    if (!discountCode.isActive) {
      return res.status(400).json({ error: "Discount code is inactive" });
    }

    // Check validity period
    const now = new Date();
    if (now < discountCode.validFrom) {
      return res.status(400).json({ error: "Discount code is not yet valid" });
    }

    if (discountCode.validUntil && now > discountCode.validUntil) {
      return res.status(400).json({ error: "Discount code has expired" });
    }

    // Check usage limit
    if (discountCode.usageLimit && discountCode.currentUsage >= discountCode.usageLimit) {
      return res.status(400).json({ error: "Discount code usage limit reached" });
    }

    // Check minimum order value
    const minimumOrderValuePence = toPence(discountCode.minimumOrderValue);
    if (minimumOrderValuePence !== null && orderTotalPence < minimumOrderValuePence) {
      return res.status(400).json({ 
        error: `Minimum order value of £${discountCode.minimumOrderValue} required` 
      });
    }

    // Sanitize applies lists to avoid stray empty values (appliesToCategories removed - Category deprecated)
    const appliesToEvents = (discountCode.appliesToEvents || []).filter((v) => v && v.trim() !== '');

    // Check if code applies to specific events
    if (appliesToEvents.length > 0 && eventId) {
      const candidateEventIds = new Set<string>([eventId.toString()]);

      // Map EventDate ID -> Event ID for robustness.
      const numericId = parseInt(eventId.toString(), 10);
      if (!Number.isNaN(numericId)) {
        try {
          const eventDate = await prisma.eventDate.findUnique({
            where: { id: numericId },
            select: { eventId: true }
          });
          if (eventDate) {
            candidateEventIds.add(eventDate.eventId.toString());
          }
        } catch (_) {
          // Ignore lookup errors and keep checking other candidate IDs.
        }
      }

      // The checkout also sends selected ticket type IDs. Map those to parent
      // Event IDs too, so discount validation still works if the page uses an
      // EventDate ID while discount admin stores parent Event IDs.
      const ticketIds = Array.isArray(ticketTypeIds)
        ? ticketTypeIds.map((id) => parseInt(String(id), 10)).filter((id) => !Number.isNaN(id))
        : [];
      if (ticketIds.length > 0) {
        try {
          const ticketTypes = await prisma.eventTicketType.findMany({
            where: { id: { in: ticketIds } },
            select: { eventId: true }
          });
          for (const tt of ticketTypes) {
            candidateEventIds.add(tt.eventId.toString());
          }
        } catch (_) {
          // Ignore lookup errors and fall through to failure if nothing matches.
        }
      }

      let applies = false;
      for (const candidate of Array.from(candidateEventIds)) {
        if (appliesToEvents.includes(candidate)) {
          applies = true;
          break;
        }
      }

      if (!applies) {
        // Some older/admin flows passed the parent Event ID directly in eventId.
        const providedId = eventId.toString();
        if (!Number.isNaN(numericId)) {
          applies = appliesToEvents.includes(providedId);
        }
      }

      if (!applies) {
        return res.status(400).json({ error: "Discount code does not apply to this event" });
      }
    }

    // Calculate discount amount
    let discountAmountPence = 0;
    if (discountCode.discountType === "percentage") {
      discountAmountPence = Math.floor((orderTotalPence * discountCode.discountValue) / 100);
      // Apply maximum discount limit if set
      const maximumDiscountPence = toPence(discountCode.maximumDiscount);
      if (maximumDiscountPence !== null && discountAmountPence > maximumDiscountPence) {
        discountAmountPence = maximumDiscountPence;
      }
    } else {
      // Fixed discounts are stored/displayed in pounds in the admin UI.
      discountAmountPence = toPence(discountCode.discountValue) ?? 0;
    }

    if (discountAmountPence > orderTotalPence) discountAmountPence = orderTotalPence;
    const finalTotalPence = Math.max(0, orderTotalPence - discountAmountPence);
    const discountAmount = discountAmountPence / 100;
    const finalTotal = finalTotalPence / 100;

    res.status(200).json({
      valid: true,
      discountCode: {
        id: discountCode.id,
        code: discountCode.code,
        description: discountCode.description,
        discountType: discountCode.discountType,
        discountValue: discountCode.discountValue,
        discountAmount: roundMoney(discountAmount),
        originalTotal: roundMoney(orderTotalPounds),
        finalTotal: roundMoney(finalTotal),
        savings: roundMoney(discountAmount)
      }
    });
  } catch (error) {
    console.error("Error validating discount code:", error);
    res.status(500).json({ error: "Failed to validate discount code" });
  }
}
