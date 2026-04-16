import prisma from "../../prisma";

export interface TicketInput {
    ticketTypeId: number;
    amount: number;
    // Display fields (client-supplied) — not used for pricing
    name?: string;
    price?: unknown;
    categoryId?: unknown;
}

export interface TrustedTicketLine {
    ticketTypeId: number;
    amount: number;
    /** Price per unit in pence (or smallest currency unit), from the DB. */
    unitPrice: number;
    /** Display name from DB. */
    name: string;
    currency: string;
}

export interface PricingResult {
    lines: TrustedTicketLine[];
    /** Total in pence before discount. */
    originalTotal: number;
    /** Total in pence after validated discount. */
    finalTotal: number;
    /** Discount in pence actually applied. */
    discountAmount: number;
    /** The resolved discount code record, if one was applied. */
    appliedDiscount: null | {
        id: string;
        code: string;
        discountType: string;
        discountValue: number;
    };
    currency: string;
}

export interface ComputeTotalsOptions {
    eventDateId: number;
    tickets: TicketInput[];
    /** Optional discount code supplied by the client — will be re-validated against DB. */
    discountCode?: string | null;
}

export class PricingError extends Error {
    status: number;
    constructor(message: string, status = 400) {
        super(message);
        this.status = status;
    }
}

/**
 * Trusted server-side pricing: never trusts any monetary field from the client.
 * Prices are always loaded from the DB.
 *
 * @throws PricingError on any invalid input or unresolvable ticket type.
 */
export async function computeOrderTotals(
    options: ComputeTotalsOptions
): Promise<PricingResult> {
    const { eventDateId, tickets, discountCode } = options;

    if (!Array.isArray(tickets) || tickets.length === 0) {
        throw new PricingError("No tickets provided");
    }

    // Normalise client input
    const normalised = tickets.map((t) => ({
        ticketTypeId: Number(t.ticketTypeId ?? (t as any).categoryId),
        amount: Math.max(0, Math.floor(Number(t.amount) || 0))
    }));

    if (normalised.some((t) => !Number.isFinite(t.ticketTypeId) || t.ticketTypeId <= 0)) {
        throw new PricingError("Invalid ticket type ID");
    }
    if (normalised.every((t) => t.amount === 0)) {
        throw new PricingError("All ticket quantities are zero");
    }

    const eventDate = await prisma.eventDate.findUnique({
        where: { id: eventDateId },
        select: { id: true, eventId: true }
    });

    if (!eventDate) {
        throw new PricingError("Event date not found", 404);
    }

    const ids = Array.from(new Set(normalised.map((t) => t.ticketTypeId)));
    const ticketTypes = await prisma.eventTicketType.findMany({
        where: { id: { in: ids }, eventId: eventDate.eventId, isActive: true },
        select: { id: true, name: true, price: true, currency: true }
    });
    const byId = new Map(ticketTypes.map((tt) => [tt.id, tt]));

    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length > 0) {
        throw new PricingError(
            `Ticket type(s) not found or inactive for this event: ${missing.join(", ")}`
        );
    }

    const lines: TrustedTicketLine[] = normalised
        .filter((t) => t.amount > 0)
        .map((t) => {
            const tt = byId.get(t.ticketTypeId)!;
            return {
                ticketTypeId: tt.id,
                amount: t.amount,
                unitPrice: tt.price,
                name: tt.name,
                currency: tt.currency || "GBP"
            };
        });

    const currencies = new Set(lines.map((l) => l.currency));
    if (currencies.size > 1) {
        throw new PricingError("Mixed currencies are not supported");
    }
    const currency = lines[0]?.currency || "GBP";

    const originalTotal = lines.reduce((sum, l) => sum + l.unitPrice * l.amount, 0);

    let discountAmount = 0;
    let appliedDiscount: PricingResult["appliedDiscount"] = null;

    if (discountCode && typeof discountCode === "string" && discountCode.trim()) {
        const dc = await prisma.discountCode.findUnique({
            where: { code: discountCode.trim().toUpperCase() }
        });
        if (!dc) throw new PricingError("Invalid discount code");
        if (!dc.isActive) throw new PricingError("Discount code is inactive");
        const now = new Date();
        if (now < dc.validFrom) throw new PricingError("Discount code is not yet valid");
        if (dc.validUntil && now > dc.validUntil)
            throw new PricingError("Discount code has expired");
        if (dc.usageLimit && dc.currentUsage >= dc.usageLimit)
            throw new PricingError("Discount code usage limit reached");
        if (dc.minimumOrderValue && originalTotal < dc.minimumOrderValue)
            throw new PricingError(
                `Minimum order value of ${dc.minimumOrderValue} required`
            );

        const appliesToEvents = (dc.appliesToEvents || []).filter(
            (v) => v && v.trim() !== ""
        );
        if (appliesToEvents.length > 0) {
            if (!appliesToEvents.includes(String(eventDate.eventId))) {
                throw new PricingError(
                    "Discount code does not apply to this event"
                );
            }
        }

        if (dc.discountType === "percentage") {
            discountAmount = Math.floor((originalTotal * dc.discountValue) / 100);
            if (dc.maximumDiscount && discountAmount > dc.maximumDiscount) {
                discountAmount = dc.maximumDiscount;
            }
        } else {
            discountAmount = dc.discountValue;
        }
        if (discountAmount > originalTotal) discountAmount = originalTotal;

        appliedDiscount = {
            id: dc.id,
            code: dc.code,
            discountType: dc.discountType,
            discountValue: dc.discountValue
        };
    }

    const finalTotal = Math.max(0, originalTotal - discountAmount);

    return {
        lines,
        originalTotal,
        finalTotal,
        discountAmount,
        appliedDiscount,
        currency
    };
}
