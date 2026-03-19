import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../../lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2022-08-01"
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { id } = req.query;
        const { reason = "Customer requested" } = req.body;

        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "Valid booking ID is required" });
        }

        // Get the order
        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                tickets: true,
                user: true,
                eventDate: {
                    include: {
                        event: true
                    }
                }
            }
        });

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Check if order can be cancelled
        if (order.status === "CANCELLED") {
            return res.status(400).json({ error: "Order is already cancelled" });
        }

        if (order.status === "REFUNDED") {
            return res.status(400).json({ error: "Order is already refunded" });
        }

        // Process refund if order was paid
        let refundResult = null;
        console.log(`[CANCELLATION] Order ${id} status: ${order.status}, has paymentResult: ${!!order.paymentResult}`);
        
        if (order.status === "PAID" && order.paymentResult) {
            try {
                // Get payment intent from order metadata or payment result
                let paymentIntentId: string | null = null;
                
                if (order.paymentResult) {
                    try {
                        const paymentResult = JSON.parse(order.paymentResult);
                        
                        console.log(`[CANCELLATION] Payment result for order ${id}:`, JSON.stringify(paymentResult, null, 2));
                        
                        // Handle different payment result formats
                        if (paymentResult.paymentIntent) {
                            paymentIntentId = paymentResult.paymentIntent;
                            console.log(`[CANCELLATION] Found paymentIntent: ${paymentIntentId}`);
                        } else if (paymentResult.data?.object?.id) {
                            paymentIntentId = paymentResult.data.object.id;
                            console.log(`[CANCELLATION] Found payment intent from data.object.id: ${paymentIntentId}`);
                        } else if (paymentResult.id) {
                            paymentIntentId = paymentResult.id;
                            console.log(`[CANCELLATION] Found payment intent from id: ${paymentIntentId}`);
                        } else if (paymentResult.webhookEvent?.data?.object?.payment_intent) {
                            paymentIntentId = paymentResult.webhookEvent.data.object.payment_intent;
                            console.log(`[CANCELLATION] Found payment intent from webhookEvent: ${paymentIntentId}`);
                        } else {
                            console.log(`[CANCELLATION] No payment intent found in payment result. Available fields:`, Object.keys(paymentResult));
                        }
                    } catch (e) {
                        console.error("Failed to parse payment result:", e);
                    }
                }

                if (paymentIntentId) {
                    // Create refund through Stripe
                    const refund = await stripe.refunds.create({
                        payment_intent: paymentIntentId,
                        reason: 'requested_by_customer',
                        metadata: {
                            orderId: id,
                            refundReason: reason,
                            refundedBy: 'admin_cancellation'
                        }
                    });

                    refundResult = {
                        id: refund.id,
                        amount: order.finalTotal || order.originalTotal || 0,
                        status: refund.status
                    };

                    console.log(`[CANCELLATION] Refund created for order ${id}: ${refund.id}`);
                }
            } catch (refundError) {
                console.error(`[CANCELLATION] Failed to process refund for order ${id}:`, refundError);
                // Continue with cancellation even if refund fails
            }
        }

        // Update order status (gated inventory: capacity stays held until admin returns to pool)
        await prisma.order.update({
            where: { id },
            data: {
                status: "CANCELLED",
                cancelledAt: new Date(),
                cancelledBy: "admin",
                cancellationReason: reason,
                inventoryReturnedToPool: false,
                inventoryReturnedAt: null,
                inventoryReturnedBy: null,
                paymentResult: JSON.stringify({
                    ...JSON.parse(order.paymentResult || '{}'),
                    cancellation: {
                        timestamp: new Date().toISOString(),
                        reason: reason,
                        cancelledBy: 'admin',
                        refund: refundResult
                    }
                })
            }
        });

        // Send cancellation email
        try {
            const emailTriggerService = new (await import('../../../../../lib/services/emailTriggerService')).EmailTriggerService();
            
            await emailTriggerService.sendBookingCancellation({
                userEmail: order.user?.email || '',
                userFirstName: order.user?.firstName || 'Customer',
                userLastName: order.user?.lastName || '',
                eventTitle: order.eventDate?.event?.title || 'Event',
                eventDate: order.eventDate?.date?.toLocaleDateString('en-GB') || '',
                eventTime: order.eventDate?.date ? new Date(order.eventDate.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'TBD',
                eventLocation: 'JVS Events',
                bookingId: id,
                seats: order.tickets.length,
                total: `£${order.finalTotal || order.originalTotal || 0}`,
                locale: 'en',
                cancellationReason: reason,
                cancelledBy: 'Admin',
                cancellationDate: new Date().toLocaleDateString('en-GB'),
                refundAmount: refundResult ? `£${refundResult.amount}` : '£0.00'
            });
            
            console.log(`[CANCELLATION] Cancellation email sent for order ${id}`);
        } catch (emailError) {
            console.error(`[CANCELLATION] Failed to send cancellation email for order ${id}:`, emailError);
            // Don't fail the cancellation if email fails
        }

        console.log(`[CANCELLATION] Order ${id} cancelled successfully`);

        return res.status(200).json({
            success: true,
            message: "Booking cancelled successfully",
            orderId: id,
            status: "CANCELLED",
            refund: refundResult
        });

    } catch (error: any) {
        console.error("[CANCELLATION] Error cancelling booking:", error);
        return res.status(500).json({ 
            error: "Internal server error",
            details: error.message 
        });
    }
}
