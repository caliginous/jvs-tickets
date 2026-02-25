import { NextApiRequest, NextApiResponse } from "next";
import { serverAuthenticate } from "../../../../constants/serverUtil";
import prisma from "../../../../lib/prisma";
import { PermissionSection, PermissionType } from "../../../../constants/interfaces";
import { PaymentFactory, PaymentType } from "../../../../store/factories/payment/PaymentFactory";
import { send } from "../../../../lib/send";
import { completeTask } from "./taskCompletion";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    console.log('Bulk mark as paid API called:', {
        method: req.method,
        body: req.body,
        hasOrderIds: !!(req.body?.orderIds),
        orderIdsLength: req.body?.orderIds?.length || 0
    });

    const user = await serverAuthenticate(req, res, {
        permission: PermissionSection.OrderMarkAsPayed,
        permissionType: PermissionType.Write
    });
    if (!user) {
        console.log('Authentication failed for bulk mark as paid API');
        return;
    }

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

        console.log(`Bulk mark as paid requested for ${orderIds.length} orders by ${user.email}`);

        const results = [];
        const errors = [];

        // Get all orders first to validate them
        const orders = await prisma.order.findMany({
            where: {
                id: { in: orderIds }
            },
            include: {
                tickets: true
            }
        });

        console.log(`Found ${orders.length} orders out of ${orderIds.length} requested`);

        for (const order of orders) {
            try {
                console.log(`Processing order ${order.id} with paymentType: ${order.paymentType}`);
                
                // Get payment instance with robust fallback for legacy orders
                let paymentInstance;
                
                // First try the order's payment type
                paymentInstance = PaymentFactory.getPaymentInstance({
                    type: order.paymentType as PaymentType,
                    data: null
                });
                
                // If that fails, try to map common legacy payment types
                if (!paymentInstance) {
                    console.log(`PaymentFactory returned null for ${order.paymentType}, trying mapping...`);
                    
                    const paymentTypeMapping = {
                        'credit_card': PaymentType.CreditCard,
                        'creditcard': PaymentType.CreditCard,
                        'stripe': PaymentType.CreditCard,
                        'card': PaymentType.CreditCard,
                        'paypal': PaymentType.PayPal,
                        'invoice': PaymentType.Invoice,
                        'bank_transfer': PaymentType.Invoice,
                        'bacs': PaymentType.Invoice,
                        'sofort': PaymentType.Sofort,
                        'iban': PaymentType.StripeIBAN,
                        'sepa': PaymentType.StripeIBAN
                    };
                    
                    const mappedType = paymentTypeMapping[order.paymentType.toLowerCase()] || PaymentType.Invoice;
                    console.log(`Mapped ${order.paymentType} to ${mappedType}`);
                    
                    paymentInstance = PaymentFactory.getPaymentInstance({
                        type: mappedType,
                        data: null
                    });
                }

                if (!paymentInstance) {
                    console.log(`Final fallback: using Invoice payment type`);
                    paymentInstance = PaymentFactory.getPaymentInstance({
                        type: PaymentType.Invoice,
                        data: null
                    });
                }

                if (!paymentInstance) {
                    throw new Error(`Unable to create any payment instance for order ${order.id} with type: ${order.paymentType}`);
                }

                // Update the order payment status and status field
                await prisma.order.update({
                    where: {
                        id: order.id
                    },
                    data: {
                        paymentResult: JSON.stringify(paymentInstance.getValidPaymentResult()),
                        status: "PAID" // Explicitly set status to PAID
                    }
                });

                // Send confirmation email and complete tasks
                try {
                    console.log(`Sending confirmation email for order ${order.id}...`);
                    await send(order.id);
                    console.log(`Completing tasks for order ${order.id}...`);
                    await completeTask(order.id);
                    console.log(`Successfully processed order ${order.id}`);
                } catch (emailError) {
                    console.warn(`Email/task completion failed for order ${order.id}:`, emailError.message);
                    console.warn(`Email error details:`, emailError);
                    // Don't fail the whole operation for email issues - order is still marked as paid
                }

                results.push({
                    orderId: order.id,
                    success: true
                });

            } catch (orderError) {
                console.error(`Failed to mark order ${order.id} as paid:`, orderError);
                errors.push({
                    orderId: order.id,
                    error: orderError.message
                });
            }
        }

        // Check for missing orders
        const foundOrderIds = orders.map(o => o.id);
        const missingOrderIds = orderIds.filter(id => !foundOrderIds.includes(id));
        missingOrderIds.forEach(id => {
            errors.push({
                orderId: id,
                error: "Order not found"
            });
        });

        const successCount = results.length;
        const errorCount = errors.length;

        console.log(`Bulk mark as paid completed: ${successCount} successful, ${errorCount} failed`);

        if (successCount > 0 && errorCount === 0) {
            res.status(200).json({
                message: `Successfully marked ${successCount} orders as paid`,
                successful: results,
                errors: []
            });
        } else if (successCount > 0 && errorCount > 0) {
            res.status(207).json({
                message: `Marked ${successCount} orders as paid, ${errorCount} failed`,
                successful: results,
                errors: errors
            });
        } else {
            res.status(400).json({
                message: `Failed to mark any orders as paid`,
                successful: [],
                errors: errors
            });
        }

    } catch (error) {
        console.error('Bulk mark as paid error:', error);
        res.status(500).json({
            error: "Internal server error during bulk mark as paid operation"
        });
    }
}
