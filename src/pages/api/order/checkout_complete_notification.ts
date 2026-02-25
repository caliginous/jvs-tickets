import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { PaymentType } from "../../../store/factories/payment/PaymentFactory";
import { send } from "../../../lib/send";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        res.status(405).end("Method Not Allowed");
        return;
    }

    try {
        // Validate request body
        if (!req.body || !req.body.orderId) {
            console.error("[checkout_complete_notification] Missing orderId in request body");
            return res.status(400).json({ error: "Missing orderId in request body" });
        }

        const { orderId }: { orderId: string } = req.body;
        
        // Validate orderId format
        if (typeof orderId !== 'string' || orderId.trim() === '') {
            console.error("[checkout_complete_notification] Invalid orderId format:", orderId);
            return res.status(400).json({ error: "Invalid orderId format" });
        }

        console.log(`[checkout_complete_notification] Processing order: ${orderId}`);

        // Find the order
        const order = await prisma.order.findUnique({
            where: {
                id: orderId
            },
            select: {
                paymentIntent: true,
                paymentType: true,
                invoiceSent: true
            }
        });

        // Check if order exists
        if (!order) {
            console.error(`[checkout_complete_notification] Order not found: ${orderId}`);
            return res.status(404).json({ error: "Order not found" });
        }

        // Validate payment intent
        if (!order.paymentIntent || order.paymentIntent === "") {
            console.error(`[checkout_complete_notification] Invalid payment intent for order: ${orderId}`);
            return res.status(400).json({ error: "Not a valid order!" });
        }

        // Check if we need to send invoice
        // as we get instant feedback from PayPal, we don't need to send invoice again
        if (order.paymentType === PaymentType.PayPal || 
            order.paymentIntent === PaymentType.Invoice || 
            order.invoiceSent) {
            console.log(`[checkout_complete_notification] Skipping invoice for order ${orderId} (type: ${order.paymentType}, invoiceSent: ${order.invoiceSent})`);
            return res.status(200).json({ message: "Invoice not required" });
        }

        // Send the invoice
        console.log(`[checkout_complete_notification] Sending invoice for order: ${orderId}`);
        await send(orderId);

        console.log(`[checkout_complete_notification] Successfully processed order: ${orderId}`);
        res.status(200).json({ message: "Notification processed successfully" });

    } catch (error) {
        // Log the detailed error for debugging
        console.error("[checkout_complete_notification] API Error:", {
            error: error.message,
            stack: error.stack,
            orderId: req.body?.orderId,
            timestamp: new Date().toISOString()
        });

        // Send a clean error response to the client
        res.status(500).json({ 
            error: "An internal server error occurred while processing the checkout notification" 
        });
    }
}
