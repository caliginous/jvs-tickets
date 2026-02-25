import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PUT") {
        res.setHeader("Allow", "PUT");
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { id } = req.query;
        const { paymentIntent, finalTotal, originalTotal, paymentResult } = req.body;

        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "Valid order ID is required" });
        }

        // Update the order with Stripe session data
        const updatedOrder = await prisma.order.update({
            where: { id },
            data: {
                paymentIntent,
                finalTotal,
                originalTotal,
                paymentResult,
                status: "PENDING", // Keep as pending until webhook confirms payment
            },
        });

        console.log(`[order/update] ✅ Order ${id} updated successfully with Stripe data`);

        return res.status(200).json({
            success: true,
            order: updatedOrder,
        });

    } catch (error) {
        console.error(`[order/update] ❌ Error updating order:`, error);
        
        if (error instanceof Error) {
            return res.status(500).json({ error: error.message });
        }
        
        return res.status(500).json({ error: "Internal server error" });
    }
}
