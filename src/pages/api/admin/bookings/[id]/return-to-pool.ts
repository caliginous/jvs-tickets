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
            return res.status(400).json({ error: "Valid booking ID is required" });
        }

        const adminIdentity = (session as any).userName || (session as any).email || "admin";

        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                tickets: {
                    select: { eventTicketTypeId: true }
                },
                orderItems: {
                    select: { eventTicketTypeId: true, quantity: true }
                }
            }
        });

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        if (order.status !== "REFUNDED" && order.status !== "CANCELLED") {
            return res.status(400).json({
                error: `Only REFUNDED or CANCELLED orders can have inventory returned to pool. Current status: ${order.status}`
            });
        }

        if (order.inventoryReturnedToPool) {
            return res.status(400).json({ error: "Inventory has already been returned to pool" });
        }

        await prisma.order.update({
            where: { id },
            data: {
                inventoryReturnedToPool: true,
                inventoryReturnedAt: new Date(),
                inventoryReturnedBy: adminIdentity,
            }
        });

        console.log(`[return-to-pool] Order ${id} inventory returned to pool`);

        // Derive affected ticket types from tickets (primary) or orderItems (fallback).
        // The Stripe checkout flow creates tickets but not always orderItems.
        const ticketTypeIds = order.tickets.map(t => t.eventTicketTypeId);
        const orderItemTypeIds = order.orderItems.map(item => item.eventTicketTypeId);
        const affectedTicketTypes = ticketTypeIds.length > 0 ? ticketTypeIds : orderItemTypeIds;

        // Trigger waitlist allocation for each affected ticket type
        let allocationResult = null;
        try {
            const allocationResults = [];
            for (const ticketTypeId of Array.from(new Set(affectedTicketTypes))) {
                const result = await allocateWaitlistOffers({
                    eventDateId: order.eventDateId,
                    eventTicketTypeId: ticketTypeId,
                    actor: 'system:return-to-pool',
                    sourceOrderId: id,
                });
                allocationResults.push({ ticketTypeId, ...result });
            }
            allocationResult = allocationResults;
        } catch (allocError) {
            console.error(`[return-to-pool] Waitlist allocation failed for order ${id}:`, allocError);
        }

        return res.status(200).json({
            success: true,
            message: "Inventory returned to pool successfully",
            orderId: id,
            eventDateId: order.eventDateId,
            affectedTicketTypes,
            waitlistAllocation: allocationResult,
        });

    } catch (error: any) {
        console.error("[return-to-pool] Error:", error);
        return res.status(500).json({
            error: "Internal server error",
            details: error.message
        });
    }
}
