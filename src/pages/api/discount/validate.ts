import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { code, eventId, orderTotal } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Discount code is required" });
    }

    // Find the discount code
    const discountCode = await prisma.discountCode.findUnique({
      where: { code: code.toUpperCase() }
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
    if (discountCode.minimumOrderValue && orderTotal < discountCode.minimumOrderValue) {
      return res.status(400).json({ 
        error: `Minimum order value of £${discountCode.minimumOrderValue} required` 
      });
    }

    // Sanitize applies lists to avoid stray empty values (appliesToCategories removed - Category deprecated)
    const appliesToEvents = (discountCode.appliesToEvents || []).filter((v) => v && v.trim() !== '');

    // Check if code applies to specific events
    if (appliesToEvents.length > 0 && eventId) {
      const providedId = eventId.toString();
      let applies = appliesToEvents.includes(providedId);

      // If not directly matching, try to map EventDate ID -> Event ID for robustness
      if (!applies) {
        const numericId = parseInt(providedId, 10);
        if (!Number.isNaN(numericId)) {
          try {
            const eventDate = await prisma.eventDate.findUnique({
              where: { id: numericId },
              select: { eventId: true }
            });
            if (eventDate) {
              applies = appliesToEvents.includes(eventDate.eventId.toString());
            }
          } catch (_) {
            // Ignore lookup errors and fall through to failure
          }
        }
      }

      if (!applies) {
        return res.status(400).json({ error: "Discount code does not apply to this event" });
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discountCode.discountType === "percentage") {
      discountAmount = (orderTotal * discountCode.discountValue) / 100;
      // Apply maximum discount limit if set
      if (discountCode.maximumDiscount && discountAmount > discountCode.maximumDiscount) {
        discountAmount = discountCode.maximumDiscount;
      }
    } else {
      discountAmount = discountCode.discountValue;
    }

    const finalTotal = Math.max(0, orderTotal - discountAmount);

    res.status(200).json({
      valid: true,
      discountCode: {
        id: discountCode.id,
        code: discountCode.code,
        description: discountCode.description,
        discountType: discountCode.discountType,
        discountValue: discountCode.discountValue,
        discountAmount: Math.round(discountAmount * 100) / 100, // Round to 2 decimal places
        originalTotal: orderTotal,
        finalTotal: Math.round(finalTotal * 100) / 100,
        savings: Math.round(discountAmount * 100) / 100
      }
    });
  } catch (error) {
    console.error("Error validating discount code:", error);
    res.status(500).json({ error: "Failed to validate discount code" });
  }
}
