import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import prisma from "../../../../lib/prisma";
import { toPence } from "../../../../lib/amountUtils";
import { serverAuthenticate } from "../../../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../../../constants/interfaces";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2022-08-01"
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed" });
    }

    const actor = await serverAuthenticate(req, res, {
        permission: PermissionSection.Orders,
        permissionType: PermissionType.Write
    });
    if (!actor) return;

    try {
        const { orderId, amount, reason } = req.body;

        // Validate required fields
        if (!orderId) {
            return res.status(400).json({ error: "Order ID is required" });
        }

        if (amount && (typeof amount !== 'number' || amount <= 0)) {
            return res.status(400).json({ error: "Amount must be a positive number" });
        }

        // Get the order
        const order = await prisma.order.findUnique({
            where: { id: orderId },
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

        // Check if order is eligible for refund
        if (order.status !== "PAID") {
            return res.status(400).json({ 
                error: `Order cannot be refunded. Current status: ${order.status}` 
            });
        }

        // Get payment intent from order metadata or payment result
        let paymentIntentId: string | null = null;
        
        if (order.paymentResult) {
            try {
                const paymentResult = JSON.parse(order.paymentResult);
                
                // Handle different payment result formats
                if (paymentResult.paymentIntent) {
                    // Stripe Checkout session format
                    paymentIntentId = paymentResult.paymentIntent;
                } else if (paymentResult.data?.object?.id) {
                    // Legacy webhook format
                    paymentIntentId = paymentResult.data.object.id;
                } else if (paymentResult.id) {
                    // Direct payment intent ID
                    paymentIntentId = paymentResult.id;
                } else if (paymentResult.webhookEvent?.data?.object?.payment_intent) {
                    // Webhook event format
                    paymentIntentId = paymentResult.webhookEvent.data.object.payment_intent;
                }
                
                console.log(`[REFUND] Parsed payment result:`, {
                    paymentIntentId,
                    paymentResultKeys: Object.keys(paymentResult),
                    hasPaymentIntent: !!paymentResult.paymentIntent,
                    hasWebhookEvent: !!paymentResult.webhookEvent
                });
            } catch (e) {
                console.error("Failed to parse payment result:", e);
            }
        }

        if (!paymentIntentId) {
            console.error(`[REFUND] Payment intent not found for order ${orderId}:`, {
                orderStatus: order.status,
                hasPaymentResult: !!order.paymentResult,
                paymentResultPreview: order.paymentResult ? order.paymentResult.substring(0, 200) + '...' : 'null',
                finalTotal: order.finalTotal,
                originalTotal: order.originalTotal
            });
            return res.status(400).json({ 
                error: "Payment intent not found in order data" 
            });
        }

        // Get order total in pence (all amounts now stored in pence)
        const orderTotalInPence = order.finalTotal || order.originalTotal || 0;
        
        // Calculate refund amount (if not specified, refund full amount)
        // Note: 'amount' comes from frontend in pence (converted by RefundDialog)
        const refundAmount = amount || orderTotalInPence;
        
        if (refundAmount > orderTotalInPence) {
            return res.status(400).json({ 
                error: "Refund amount cannot exceed order total" 
            });
        }

        // Create refund through Stripe
        const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            amount: refundAmount, // Amount is already in pence
            reason: reason || 'requested_by_customer',
            metadata: {
                orderId: orderId,
                refundReason: reason || 'requested_by_customer',
                refundedBy: actor.email || 'admin'
            }
        });

        // Update order status based on refund amount
        const isFullRefund = refundAmount >= (order.finalTotal || order.originalTotal || 0);
        const newStatus = isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED";

        // Update order in database
        await prisma.order.update({
            where: { id: orderId },
            data: {
                status: newStatus,
                paymentResult: JSON.stringify({
                    ...JSON.parse(order.paymentResult || '{}'),
                    refund: {
                        id: refund.id,
                        amount: refundAmount,
                        reason: reason || 'requested_by_customer',
                        timestamp: new Date().toISOString(),
                        stripeRefundId: refund.id
                    }
                }),
                finalTotal: isFullRefund ? 0 : (order.finalTotal || order.originalTotal || 0) - refundAmount,
                discountAmount: refundAmount,
                refundAmount: refundAmount,
                refundId: refund.id,
                refundedAt: new Date(),
                // Gated inventory: refund does not auto-release capacity
                ...(isFullRefund ? {
                    inventoryReturnedToPool: false,
                    inventoryReturnedAt: null,
                    inventoryReturnedBy: null,
                } : {}),
            }
        });

        // Send refund confirmation email
        try {
            const emailTriggerService = new (await import('../../../../lib/services/emailTriggerService')).EmailTriggerService();
            
            await emailTriggerService.sendRefundProcessed({
                userEmail: order.user?.email || '',
                userFirstName: order.user?.firstName || 'Customer',
                userLastName: order.user?.lastName || '',
                eventTitle: order.eventDate?.event?.title || 'Event',
                eventDate: order.eventDate?.date?.toLocaleDateString('en-GB') || '',
                eventTime: order.eventDate?.date ? new Date(order.eventDate.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'TBD',
                eventLocation: 'JVS Events',
                bookingId: orderId,
                seats: order.tickets?.length || 1,
                refundAmount: refundAmount,
                refundReason: reason || 'requested_by_customer',
                locale: 'en'
            });
            
            console.log(`[REFUND] Refund confirmation email sent for order ${orderId}`);
        } catch (emailError) {
            console.error(`[REFUND] Failed to send refund email for order ${orderId}:`, emailError);
            // Don't fail the refund if email fails
        }

        // Log the refund action (convert pence to pounds for readable logs)
        console.log(`[REFUND] Order ${orderId} refunded: £${(refundAmount / 100).toFixed(2)}, Status: ${newStatus}, Stripe Refund ID: ${refund.id}`);

        return res.status(200).json({
            success: true,
            refund: {
                id: refund.id,
                amount: refundAmount,
                status: refund.status,
                reason: reason || 'requested_by_customer',
                orderStatus: newStatus
            }
        });

    } catch (error: any) {
        console.error("[REFUND] Error processing refund:", error);
        
        if (error.type === 'StripeCardError') {
            return res.status(400).json({ error: error.message });
        } else if (error.type === 'StripeInvalidRequestError') {
            return res.status(400).json({ error: error.message });
        } else if (error.type === 'StripeAPIError') {
            return res.status(500).json({ error: "Stripe API error occurred" });
        } else {
            return res.status(500).json({ error: "Internal server error" });
        }
    }
}
