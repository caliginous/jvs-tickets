import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { send } from "../../../lib/send";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { orderId, secret } = req.query;
    if (!orderId || !secret)
        return res.status(400).end("Missing orderId or secret");

    const order = await prisma.order.findUnique({
        where: {
            id: orderId as string
        },
        select: {
            id: true,
            status: true,
            tickets: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    eventTicketType: {
                        select: {
                            name: true,
                            price: true
                        }
                    }
                }
            },
            cancellationSecret: true
        }
    });
    if (!order)
        return res.status(404).end("Order not found");
    if (order.cancellationSecret !== (secret as string))
        return res.status(401).end("Unauthorized");

    if (req.method === "GET") {
        return res.status(200).json(order.tickets);
    }

    if (req.method === "POST") {
        if (order.status === "CANCELLED") {
            return res.status(400).end("Order is already cancelled");
        }

        // Gated inventory model: do NOT delete tickets.
        // Mark the order as cancelled; capacity stays held until admin returns to pool.
        await prisma.order.update({
            where: { id: orderId as string },
            data: {
                status: "CANCELLED",
                cancelledAt: new Date(),
                cancelledBy: "customer",
                cancellationReason: "Customer requested cancellation",
                inventoryReturnedToPool: false,
                inventoryReturnedAt: null,
                inventoryReturnedBy: null,
            }
        });

        try {
            await send(orderId as string);
        } catch (emailError) {
            console.error(`[cancellation] Failed to send cancellation email for order ${orderId}:`, emailError);
        }

        return res.status(200).end("Order successfully cancelled");
    }
}
