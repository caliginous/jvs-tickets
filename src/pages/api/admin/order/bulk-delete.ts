import { NextApiRequest, NextApiResponse } from "next";
import {
    serverAuthenticate
} from "../../../../constants/serverUtil";
import prisma from "../../../../lib/prisma";
import { PermissionSection, PermissionType } from "../../../../constants/interfaces";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const user = await serverAuthenticate(req, res, {
        permission: PermissionSection.Orders,
        permissionType: PermissionType.Write
    });
    if (!user) return;

    if (req.method !== "POST") {
        res.status(405).end("Method not allowed");
        return;
    }

    try {
        const { orderIds } = req.body;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            res.status(400).json({ error: "Order IDs array is required" });
            return;
        }

        const results = [];
        const errors = [];

        for (const orderId of orderIds) {
            try {
                // Find the order with all related data
                const order = await prisma.order.findUnique({
                    where: { id: orderId },
                    include: {
                        tickets: true,
                        task: true,
                        user: true,
                        eventDate: {
                            include: {
                                event: true
                            }
                        }
                    }
                });

                if (!order) {
                    errors.push({ orderId, error: "Order not found" });
                    continue;
                }

                // Process refund if order was paid
                if (order.status === "PAID" && order.paymentResult) {
                    try {
                        // Here you would integrate with your payment provider (Stripe, etc.)
                        // to process the refund. For now, we'll just log it.
                        console.log(`Processing refund for order ${orderId}: £${order.finalTotal || order.originalTotal}`);
                        
                        // TODO: Implement actual refund logic with your payment provider
                        // Example for Stripe:
                        // const refund = await stripe.refunds.create({
                        //     payment_intent: order.paymentResult.paymentIntentId,
                        //     amount: order.finalTotal || order.originalTotal // Amount is already in pence
                        // });
                        
                    } catch (refundError) {
                        console.error(`Failed to process refund for order ${orderId}:`, refundError);
                        errors.push({ orderId, error: "Refund failed" });
                        continue;
                    }
                }

                // Delete related tickets
                if (order.tickets.length > 0) {
                    await prisma.ticket.deleteMany({
                        where: {
                            orderId: orderId
                        }
                    });
                }

                // Delete related task if exists
                if (order.task?.id) {
                    await prisma.task.delete({
                        where: {
                            id: order.task.id
                        }
                    });
                }

                // Delete the order
                await prisma.order.delete({
                    where: {
                        id: orderId
                    }
                });

                results.push({
                    orderId,
                    success: true,
                    customerName: order.user ? `${order.user.firstName} ${order.user.lastName}` : "Unknown",
                    eventTitle: order.eventDate?.event?.title || "Unknown Event",
                    amount: order.finalTotal || order.originalTotal || 0
                });

            } catch (error) {
                console.error(`Failed to delete order ${orderId}:`, error);
                errors.push({ orderId, error: error.message });
            }
        }

        res.status(200).json({
            success: true,
            results,
            errors,
            summary: {
                total: orderIds.length,
                successful: results.length,
                failed: errors.length
            }
        });

    } catch (error) {
        console.error("Bulk delete error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
