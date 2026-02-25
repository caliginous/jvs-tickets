import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import prisma from "../../../lib/prisma";
import { calculateTotalPrice, getSeatMap, validateCategoriesWithSeatMap, DatabaseTicket } from "../../../constants/util";
import { withNotification } from "../../../lib/notifications/withNotification";
import { OrderState } from "../../../store/reducers/orderReducer";
import { PaymentType } from "../../../store/factories/payment/PaymentFactory";
import { getOption } from "../../../lib/options";
import { Options } from "../../../constants/Constants";

// Initialize Stripe with robust configuration for serverless environments
const createStripeClient = () => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!secretKey) {
        throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    
    // Clean the secret key to remove any potential invalid characters
    const cleanKey = secretKey.trim().replace(/[^\x20-\x7E]/g, '');
    
    if (!cleanKey.startsWith('sk_')) {
        throw new Error("Invalid STRIPE_SECRET_KEY format");
    }
    
    return new Stripe(cleanKey, {
        apiVersion: "2022-08-01" as const,
        // Conservative settings for serverless environments
        maxNetworkRetries: 2,
        timeout: 20000,
        // Use default HTTP client to avoid configuration issues
        httpClient: undefined
    });
};

// Test direct network connectivity to Stripe (following Vercel's approach)
const testStripeConnectivity = async (): Promise<{ success: boolean; error?: string; details?: any }> => {
    try {
        // Test basic HTTPS connectivity to Stripe's main domain
        const testUrl = 'https://api.stripe.com/v1/account';
        const response = await fetch(testUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
                'User-Agent': 'JVS-Tickets/1.0'
            },
            // Very short timeout just to test connectivity
            signal: AbortSignal.timeout(5000)
        });
        
        return { 
            success: true, 
            details: { 
                status: response.status, 
                statusText: response.statusText,
                url: testUrl
            } 
        };
    } catch (error: any) {
        return { 
            success: false, 
            error: error.message,
            details: {
                name: error.name,
                code: error.code,
                cause: error.cause?.message
            }
        };
    }
};

async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method === "POST") {
        const { order, paymentMethod = "card", discountInfo }: { order: OrderState; paymentMethod: string; discountInfo?: any } = req.body;
        
        // Declare variables outside try block for error logging
        let amount: number;
        let currency: string;
        let orderDB: any;
        
        try {
            // Validate environment variables first (following Vercel's security practices)
            if (!process.env.STRIPE_SECRET_KEY) {
                throw new Error("STRIPE_SECRET_KEY environment variable is missing");
            }
            
            if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
                throw new Error("STRIPE_SECRET_KEY appears to be invalid (should start with 'sk_')");
            }

            // Validate request data (following Vercel's validation approach)
            if (!order?.orderId || order.orderId === "") {
                return res.status(400).json({ 
                    statusCode: 400, 
                    message: "Invalid Order ID" 
                });
            }
            
            if (!order.tickets || order.tickets.length <= 0) {
                return res.status(400).json({ 
                    statusCode: 400, 
                    message: "Invalid ticket amount" 
                });
            }

            // Fetch order from database
            orderDB = await prisma.order.findUnique({
                where: { id: order.orderId },
                select: {
                    tickets: true,
                    eventDate: {
                        select: {
                            event: {
                                select: {
                                    seatType: true,
                                    seatMap: true
                                }
                            }
                        }
                    },
                    idempotencyKey: true,
                    paymentIntent: true,
                    paymentType: true,
                    shipping: true
                }
            });
            
            if (!orderDB) {
                return res.status(404).json({ 
                    statusCode: 404, 
                    message: "Order not found" 
                });
            }

            // Check if payment intent already exists (following Vercel's idempotency pattern)
            const paymentType = paymentMethod === "card" ? PaymentType.CreditCard : PaymentType.StripeIBAN;
            if (orderDB.paymentIntent && orderDB.paymentType === paymentType) {
                return res.status(200).json(JSON.parse(orderDB.paymentIntent));
            }

            // Calculate amount and validate
            const categories = await prisma.category.findMany();
            amount = calculateTotalPrice(
                validateCategoriesWithSeatMap(orderDB.tickets, getSeatMap(orderDB.eventDate?.event)),
                categories,
                await getOption(Options.PaymentFeesShipping),
                await getOption(Options.PaymentFeesPayment),
                (() => { 
                    try { 
                        return JSON.parse(orderDB.shipping).type; 
                    } catch { 
                        return null; 
                    } 
                })(),
                orderDB.paymentType
            );
            
            // Apply discount if present
            if (discountInfo && discountInfo.discountAmount && discountInfo.discountAmount > 0) {
                amount = Math.max(0, amount - discountInfo.discountAmount);
                console.log(`[payment_intent/stripe] Applied discount: £${discountInfo.discountAmount}, Final amount: £${amount}`);
            }
            
            // Always use GBP currency
            currency = "gbp";

            if (!currency || typeof currency !== "string") {
                return res.status(500).json({ 
                    statusCode: 500, 
                    message: "Currency configuration error" 
                });
            }

            if (!Number.isFinite(amount) || amount < 0) {
                return res.status(400).json({ 
                    statusCode: 400, 
                    message: `Invalid amount: ${amount}` 
                });
            }

            // Test network connectivity first (following Vercel's debugging approach)
            console.log("[payment_intent/stripe] Testing network connectivity to Stripe...");
            const connectivityTest = await testStripeConnectivity();
            console.log("[payment_intent/stripe] Connectivity test result:", connectivityTest);

            if (!connectivityTest.success) {
                return res.status(500).json({ 
                    statusCode: 500, 
                    message: `Network connectivity test failed: ${connectivityTest.error}`,
                    connectivityTest 
                });
            }

            // Create and validate Stripe client
            let stripeClient: Stripe;
            try {
                stripeClient = createStripeClient();
                console.log("[payment_intent/stripe] Stripe client created successfully");
            } catch (clientError: any) {
                console.error("[payment_intent/stripe] Stripe client creation failed:", clientError);
                return res.status(500).json({
                    statusCode: 500,
                    message: `Stripe client creation failed: ${clientError.message}`,
                    error: 'StripeClientError'
                });
            }

            // Create payment intent following Vercel's pattern
            const params: Stripe.PaymentIntentCreateParams = {
                payment_method_types: [paymentMethod],
                amount: Math.floor(amount * 100), // Convert to cents as per Stripe requirements
                currency: currency.toLowerCase(), // Ensure lowercase as per Stripe requirements
                metadata: {
                    orderId: order.orderId
                }
            };

            // Log the exact payload being sent to Stripe for debugging
            console.log("[payment_intent/stripe] Creating Payment Intent with params:", JSON.stringify(params, null, 2));
            console.log("[payment_intent/stripe] Using idempotency key:", orderDB.idempotencyKey);
            console.log("[payment_intent/stripe] Stripe client config:", {
                apiVersion: "2022-08-01",
                maxNetworkRetries: 2,
                timeout: 20000
            });

            // Create payment intent with idempotency key (following Vercel's best practices)
            const payment_intent = await stripeClient.paymentIntents.create(
                params,
                {
                    idempotencyKey: orderDB.idempotencyKey
                }
            );

            // Store payment intent in database
            await prisma.order.update({
                where: { id: order.orderId },
                data: {
                    paymentIntent: JSON.stringify(payment_intent),
                    paymentType
                }
            });

            // Return success response following Vercel's pattern
            res.status(200).json(payment_intent);
            
        } catch (err: any) {
            // Enhanced error handling following Vercel's approach
            const errorDetails = {
                orderId: order?.orderId,
                message: err?.message,
                type: err?.type,
                code: err?.code,
                statusCode: err?.statusCode,
                requestId: err?.requestId || err?.raw?.requestId,
                // Capture Stripe-specific error details
                stripeError: {
                    type: err?.type,
                    code: err?.code,
                    decline_code: err?.decline_code,
                    param: err?.param,
                    message: err?.message,
                    raw: err?.raw ? {
                        type: err.raw.type,
                        code: err.raw.code,
                        message: err.raw.message,
                        statusCode: err.raw.statusCode,
                        requestId: err.raw.requestId
                    } : undefined
                },
                cause: err?.cause ? {
                    code: err?.cause?.code,
                    errno: err?.cause?.errno,
                    syscall: err?.cause?.syscall,
                    address: err?.cause?.address,
                    port: err?.cause?.port
                } : undefined,
                networkInfo: {
                    hostname: err?.raw?.hostname,
                    port: err?.raw?.port,
                    protocol: err?.raw?.protocol,
                    method: err?.raw?.method,
                    path: err?.raw?.path,
                    statusCode: err?.raw?.statusCode
                },
                envValidation: {
                    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
                    keyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 3),
                    keyLength: process.env.STRIPE_SECRET_KEY?.length
                },
                // Add request details for debugging
                requestDetails: {
                    amount: amount,
                    currency: currency,
                    paymentMethod,
                    idempotencyKey: orderDB?.idempotencyKey
                }
            };
            
            // Log the full error object for comprehensive debugging
            console.error("[payment_intent/stripe] Full Error Object:", JSON.stringify(err, null, 2));
            console.error("[payment_intent/stripe] Error Details:", errorDetails);
            console.error("[payment_intent/stripe] Error Stack:", err?.stack);

            // Return appropriate error response following Vercel's pattern
            const statusCode = err?.statusCode || 500;
            const message = err?.message || "An error occurred with our connection to Stripe.";
            
            res.status(statusCode).json({ 
                statusCode, 
                message,
                error: err?.type || 'StripeError',
                details: errorDetails
            });
        }
    } else {
        // Handle unsupported methods following Vercel's pattern
        res.setHeader("Allow", "POST");
        res.status(405).json({ 
            statusCode: 405, 
            message: "Method Not Allowed" 
        });
    }
}

export default withNotification(handler, ["payment_intent", "stripe"]);
