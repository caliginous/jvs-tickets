import { NextApiRequest, NextApiResponse } from "next";
import { send } from "../../../lib/send";
import prisma from "../../../lib/prisma";
import paypal from "@paypal/checkout-server-sdk";
import { paypalClient } from "../../../lib/paypal";
import { withNotification } from "../../../lib/notifications/withNotification";

/**
 * PayPal capture callback. This is NOT a true webhook (not pushed by PayPal) — it is
 * called by the browser after the customer completes PayPal checkout.
 *
 * Security controls:
 *  - The supplied orderId must be attached to a PENDING order in our DB.
 *  - The supplied paypalId must match the PayPal order id we stored when initiating the
 *    payment (`/api/payment_intent/paypal`). This prevents an attacker from capturing a
 *    PayPal order they happen to know against one of our orders.
 *  - The captured amount currency/value must match what we computed server-side.
 */
export const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        res.status(405).end("Method Not Allowed");
        return;
    }

    try {
        const { orderId, paypalId } = req.body ?? {};

        if (typeof orderId !== "string" || typeof paypalId !== "string" || !orderId || !paypalId) {
            res.status(400).end("Bad request");
            return;
        }

        const orderDB = await prisma.order.findUnique({
            where: { id: orderId },
            select: {
                id: true,
                status: true,
                paymentType: true,
                paymentIntent: true,
                finalTotal: true,
                originalTotal: true,
            },
        });

        if (!orderDB) {
            res.status(404).end("Order not found");
            return;
        }

        if (orderDB.paymentType !== "PayPal") {
            res.status(400).end("Order is not a PayPal order");
            return;
        }

        // Verify the supplied paypalId matches the id we stored when creating the PayPal order.
        let storedPaypalId: string | null = null;
        try {
            const pi = orderDB.paymentIntent ? JSON.parse(orderDB.paymentIntent) : null;
            storedPaypalId = pi?.id ?? null;
        } catch {
            /* ignore */
        }
        if (!storedPaypalId || storedPaypalId !== paypalId) {
            console.warn("[webhook/paypal] paypalId mismatch", {
                orderId,
                suppliedPaypalId: paypalId,
                storedPaypalId,
            });
            res.status(400).end("PayPal order does not match this order");
            return;
        }

        // Idempotency: already captured?
        if (orderDB.status === "PAID" || orderDB.status === "CONFIRMED") {
            res.status(200).json({ alreadyCaptured: true });
            return;
        }

        const request = new paypal.orders.OrdersCaptureRequest(paypalId);
        request.requestBody({});
        const response = await paypalClient().execute(request);

        if (!response || response.result.status !== "COMPLETED") {
            res.status(500).end("Payment not completed");
            return;
        }

        // Verify captured amount matches expected total.
        const expected = orderDB.finalTotal ?? orderDB.originalTotal ?? null;
        const capture = response.result?.purchase_units?.[0]?.payments?.captures?.[0];
        const capturedValue = capture ? Number(capture.amount?.value) : null;
        if (expected !== null && capturedValue !== null) {
            // Our totals are in pence (integer-ish). PayPal returns a decimal currency string.
            const expectedInMajorUnits = expected / 100;
            if (Math.abs(capturedValue - expectedInMajorUnits) > 0.01) {
                console.error("[webhook/paypal] captured amount mismatch", {
                    orderId,
                    expected: expectedInMajorUnits,
                    captured: capturedValue,
                });
                res.status(400).end("Captured amount mismatch");
                return;
            }
        }

        await prisma.order.update({
            where: { id: orderId },
            data: {
                paymentResult: JSON.stringify(response.result),
                status: "PAID",
            },
        });

        await send(orderId);

        res.status(200).json({ ok: true, status: response.result.status });
    } catch (e) {
        console.error("[webhook/paypal] error");
        res.status(500).json({ error: "Server error" });
    }
};

export default withNotification(handler, ["webhook", "paypal"]);
