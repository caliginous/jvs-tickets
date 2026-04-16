import prisma from "../../prisma";
import { Prisma } from "@prisma/client";
import { checkCapacityForOrder } from "./availability";

export interface ReserveInputTicket {
    eventTicketTypeId: number;
    amount: number;
    priceCharged: number;
    secret: string;
    firstName: string;
    lastName: string;
}

export interface ReserveOrderData {
    id: string;
    userId: string;
    eventDateId: number;
    paymentType: string;
    shipping: string;
    locale: string;
    idempotencyKey: string;
    cancellationSecret: string;
    originalTotal: number;
    finalTotal: number;
    discountAmount: number;
    discountCodeId?: string | null;
    customFields?: string | null;
    status?: string;
}

/**
 * Atomically reserve capacity and create the PENDING order + tickets.
 *
 * Uses a SERIALIZABLE transaction: concurrent reservations that would both succeed
 * against a stale read will fail one of them with a serialization error, which we
 * translate into a 409 "Capacity changed, please try again" error so the client
 * can retry against fresh data.
 *
 * This closes the TOCTOU gap between `checkCapacityForOrder` and `ticket.create`.
 */
export async function reserveOrderAtomically(params: {
    orderData: ReserveOrderData;
    ticketRows: ReserveInputTicket[];
    items: Array<{ eventTicketTypeId: number; quantity: number }>;
}): Promise<
    | { success: true; orderId: string }
    | { success: false; status: number; error: string; details?: Record<number, number> }
> {
    const { orderData, ticketRows, items } = params;
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const result = await prisma.$transaction(
                async (tx) => {
                    // Recompute availability INSIDE the serializable transaction. Anything
                    // that could have affected availability between the outer check and this
                    // point will now cause a serialization conflict when we create tickets.
                    const capacity = await checkCapacityForOrder(
                        orderData.eventDateId,
                        items
                    );
                    if (capacity.success !== true) {
                        const failure = capacity as {
                            success: false;
                            error: string;
                            details?: Record<number, number>;
                        };
                        return {
                            ok: false as const,
                            status: 409,
                            error: failure.error,
                            details: failure.details,
                        };
                    }

                    await tx.order.create({
                        data: {
                            id: orderData.id,
                            userId: orderData.userId,
                            eventDateId: orderData.eventDateId,
                            paymentType: orderData.paymentType,
                            shipping: orderData.shipping,
                            locale: orderData.locale,
                            idempotencyKey: orderData.idempotencyKey,
                            cancellationSecret: orderData.cancellationSecret,
                            originalTotal: orderData.originalTotal,
                            finalTotal: orderData.finalTotal,
                            discountAmount: orderData.discountAmount,
                            discountCodeId: orderData.discountCodeId ?? null,
                            customFields: orderData.customFields ?? null,
                            status: orderData.status ?? "PENDING",
                        },
                    });

                    for (const row of ticketRows) {
                        await tx.ticket.create({
                            data: {
                                orderId: orderData.id,
                                eventTicketTypeId: row.eventTicketTypeId,
                                amount: row.amount,
                                priceCharged: row.priceCharged,
                                secret: row.secret,
                                firstName: row.firstName,
                                lastName: row.lastName,
                            } as any,
                        });
                    }

                    return { ok: true as const };
                },
                {
                    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                    maxWait: 5000,
                    timeout: 15000,
                }
            );

            if (!result.ok) {
                return {
                    success: false,
                    status: result.status,
                    error: result.error,
                    details: result.details,
                };
            }
            return { success: true, orderId: orderData.id };
        } catch (e: any) {
            // Postgres serialization failure code — retry a few times.
            const pgCode = e?.meta?.code ?? e?.code;
            const isSerialization =
                pgCode === "40001" || pgCode === "P2034" || pgCode === "P2028";
            if (isSerialization && attempt < maxRetries - 1) {
                continue;
            }
            // Unique key violation (idempotencyKey collision) — treat as duplicate.
            if (e?.code === "P2002") {
                return {
                    success: false,
                    status: 409,
                    error: "Duplicate order id; please retry",
                };
            }
            throw e;
        }
    }

    return {
        success: false,
        status: 409,
        error: "Capacity changed during reservation; please try again",
    };
}
