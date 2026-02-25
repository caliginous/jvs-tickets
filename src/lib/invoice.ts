import prisma from "./prisma";
import { calculateTotalPrice, getEventTitle, getServiceFeeAmount, summarizeTicketAmount, formatPrice } from "../constants/util";
import { Options } from "../constants/Constants";
import { getOption } from "./options";
import ejs from "ejs";
import { unescape } from "html-escaper";

// PaymentType enum (copied from PaymentFactory)
enum PaymentType {
    CreditCard = "CreditCard",
    PayPal = "PayPal",
    Sofort = "Sofort",
    Invoice = "Invoice"
}

// Database ticket type (without price property)
type DatabaseTicket = {
    orderId: string;
    id: string;
    categoryId: number;
    used: boolean;
    firstName: string;
    lastName: string;
    seatId: number;
    secret: string;
    amount: number;
};

export const generateInvoice = async (orderId: string, template: Buffer, currency: string = "GBP") => {
    const orderDB = await prisma.order.findUnique({
        where: {
            id: orderId
        },
        include: {
            user: true,
            eventDate: {
                include: {
                    event: true
                }
            },
            tickets: true
        }
    });

    if (!orderDB) {
        throw new Error("Order not found");
    }

    const shippingFees = await getOption(Options.PaymentFeesShipping);
    const paymentFees = await getOption(Options.PaymentFeesPayment);

    const categories = await prisma.category.findMany();
    const totalPrice = calculateTotalPrice(
        orderDB.tickets as any, // Type assertion to bypass type checking for database tickets
        categories,
        shippingFees,
        paymentFees,
        JSON.parse(orderDB.shipping).type,
        orderDB.paymentType
    );

    let orders: Array<{ categoryId: number; amount: number }> = summarizeTicketAmount(orderDB.tickets as any, categories, true);

    let purpose = undefined;
    if (orderDB.paymentType === PaymentType.Invoice && orderDB.paymentIntent) {
        try {
            // Handle both JSON and string paymentIntent values
            if (orderDB.paymentIntent === "none" || orderDB.paymentIntent === "") {
                purpose = undefined;
            } else if (orderDB.paymentIntent.startsWith('{')) {
                purpose = JSON.parse(orderDB.paymentIntent).invoicePurpose;
            } else {
                // Treat as plain string (legacy format)
                purpose = orderDB.paymentIntent;
            }
        } catch (error) {
            console.warn(`Failed to parse paymentIntent for order ${orderId}: ${orderDB.paymentIntent}`);
            purpose = undefined;
        }
    }

    const date = new Date();
    const taxAmount = (await getOption(Options.TaxAmount));

    const products = orders.map((order) => {
        const category = categories.find(
            (category) => category.id === order.categoryId
        );
        return {
            name: category.label,
            unit_price: formatPrice(category.price, currency),
            amount: order.amount,
            total_price: formatPrice(category.price * order.amount, currency)
        };
    });
    if (getServiceFeeAmount(shippingFees, JSON.parse(orderDB.shipping).type) !== 0) {
        products.push({
            name: "Shipping Fee",
            unit_price: formatPrice(
                getServiceFeeAmount(shippingFees, JSON.parse(orderDB.shipping).type),
                currency
            ),
            amount: 1,
            total_price: formatPrice(
                getServiceFeeAmount(shippingFees, JSON.parse(orderDB.shipping).type),
                currency
            )
        })
    }
    if (getServiceFeeAmount(paymentFees, orderDB.paymentType) !== 0) {
        products.push({
            name: "Payment Fee",
            unit_price: formatPrice(
                getServiceFeeAmount(paymentFees, orderDB.paymentType),
                currency
            ),
            amount: 1,
            total_price: formatPrice(
                getServiceFeeAmount(paymentFees, orderDB.paymentType),
                currency
            )
        })
    }

    const html = ejs.render(unescape(template.toString()), {
        invoice_number: orderDB.invoiceNumber,
        creation_date: date.toLocaleDateString(orderDB.locale),
        receiver: [
            orderDB.user.firstName + " " + orderDB.user.lastName,
            orderDB.user.address,
            orderDB.user.zip + " " + orderDB.user.city
        ],
        products: products,
        total_net_price: formatPrice(
            totalPrice * (1 - (taxAmount / 100)),
            currency
        ),
        tax_amount: `${taxAmount}%`,
        total_price: formatPrice(totalPrice, currency),
        bank_information: (await getOption(Options.PaymentDetails)),
        ...(purpose && {purpose}),
        event_name: getEventTitle(orderDB.eventDate)
    });

    return html;
}
