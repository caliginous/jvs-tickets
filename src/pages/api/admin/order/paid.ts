import { NextApiRequest, NextApiResponse } from "next";
import { serverAuthenticate } from "../../../../constants/serverUtil";
import prisma from "../../../../lib/prisma";
import {
    PermissionSection,
    PermissionType
} from "../../../../constants/interfaces";
import {
    PaymentFactory,
    PaymentType
} from "../../../../store/factories/payment/PaymentFactory";
import { send } from "../../../../lib/send";
import { completeTask } from "./taskCompletion";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    console.log('Order paid API called:', {
        method: req.method,
        query: req.query,
        body: req.body,
        hasAuth: !!req.headers.authorization,
        hasCookie: !!req.headers.cookie
    });

    const user = await serverAuthenticate(req, res, {
        permission: PermissionSection.OrderMarkAsPayed,
        permissionType: PermissionType.Write
    });
    if (!user) {
        console.log('Authentication failed for order paid API');
        return;
    }

    let orders;
    const params = {...req.query, ...req.body};
    if (params.orderId) {
        const order = await prisma.order.findUnique({
            where: {
                id: params.orderId
            },
            include: {
                tickets: true
            }
        });
        orders = [order];
    } else if (params.invoicePurpose) {
        console.log('Searching for orders with invoicePurpose:', params.invoicePurpose);
        
        // First try the standard paymentIntent approach
        const searchPaymentIntent = JSON.stringify({
            invoicePurpose: params.invoicePurpose
        });
        console.log('Trying paymentIntent search:', searchPaymentIntent);
        
        orders = await prisma.order.findMany({
            where: {
                paymentIntent: searchPaymentIntent
            },
            include: {
                tickets: true
            }
        });
        
        console.log('Found orders via paymentIntent:', orders?.length || 0);
        
        // If no orders found and this looks like a legacy search, try alternative methods
        if (orders.length === 0) {
            console.log('No orders found via paymentIntent, trying legacy searches...');
            
            // Try searching by idempotencyKey pattern (for WooCommerce imports)
            if (params.invoicePurpose.includes('old') || params.invoicePurpose.includes('platform') || params.invoicePurpose.includes('legacy')) {
                console.log('Searching for unpaid legacy orders (WooCommerce imports)...');
                orders = await prisma.order.findMany({
                    where: {
                        AND: [
                            { idempotencyKey: { startsWith: 'wc-order-' } }, // WooCommerce imports
                            { 
                                OR: [
                                    { status: 'PENDING' },
                                    { status: 'FAILED' },
                                    { paymentResult: null }
                                ]
                            }
                        ]
                    },
                    include: {
                        tickets: true
                    },
                    take: 50 // Limit to prevent massive operations
                });
                console.log('Found legacy orders to mark as paid:', orders?.length || 0);
            }
        }
    } else {
        return res.status(400).end(
            "No details provided. Please add a body containing orderId or invoiceSecret!"
        );
    }

    if (req.method === "GET") {
        if (!orders || orders.length === 0)
            return res.status(400).end("No matching order found!");
        return res.status(200).json(orders);
    }

    if (req.method === "PUT") {
        if (params.orderId) {
            if (!orders || orders.length === 0)
                return res.status(404).end("Order not found!");
            await prisma.order.update({
                where: {
                    id: params.orderId
                },
                data: {
                    paymentResult: JSON.stringify(
                        PaymentFactory.getPaymentInstance({
                            type: orders[0].paymentType as PaymentType,
                            data: null
                        }).getValidPaymentResult()
                    ),
                    status: "PAID"
                }
            });
        } else if (params.invoicePurpose) {
            console.log('Processing invoicePurpose branch with', orders?.length || 0, 'orders');
            if (orders.length > 1 && !params.multiple) {
                // For legacy orders, be more helpful about bulk operations
                const isLegacySearch = params.invoicePurpose.includes('old') || params.invoicePurpose.includes('platform') || params.invoicePurpose.includes('legacy');
                const message = isLegacySearch 
                    ? `Found ${orders.length} legacy orders to mark as paid. Add "multiple=true" to mark all as paid, or use orderId to mark individual orders.`
                    : "More than one order matching invoicePurpose! However you can mark both as payed by providing a multiple flag with value true";
                return res.status(400).end(message);
            }
            if (orders.length === 0)
                return res.status(400).end("No order matching invoicePurpose found!");

            await Promise.all(
                orders.map(async (order) => {
                    await prisma.order.update({
                        where: {
                            id: order.id
                        },
                        data: {
                            paymentResult: JSON.stringify(
                                PaymentFactory.getPaymentInstance({
                                    type: PaymentType.Invoice,
                                    data: null
                                }).getValidPaymentResult()
                            ),
                            status: "PAID"
                        }
                    });
                })
            );
        }

        await Promise.all(orders.map(async (order) => {
            await send(order.id);
            await completeTask(order.id);
        }));
        
        const successMessage = orders.length > 1 
            ? `Successfully marked ${orders.length} orders as paid`
            : "Successfully marked order as paid";
        return res.status(200).end(successMessage);
    }

    res.status(400).end("Method not allowed");
}
