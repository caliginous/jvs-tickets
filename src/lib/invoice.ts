import prisma from "./prisma";
import { getEventTitle, getServiceFeeAmount, formatPrice } from "../constants/util";
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
            orderItems: {
                include: {
                    eventTicketType: true
                }
            }
        }
    });

    if (!orderDB) {
        throw new Error("Order not found");
    }

    const shippingFees = await getOption(Options.PaymentFeesShipping);
    const paymentFees = await getOption(Options.PaymentFeesPayment);

    const shippingFeeAmount = getServiceFeeAmount(shippingFees, JSON.parse(orderDB.shipping).type);
    const paymentFeeAmount = getServiceFeeAmount(paymentFees, orderDB.paymentType);

    // Calculate total from orderItems (unitPrice and quantity are in pence)
    const ticketTotalPence = orderDB.orderItems.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
    );
    const totalPrice = ticketTotalPence / 100 + shippingFeeAmount + paymentFeeAmount;

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

    const products = orderDB.orderItems.map((item) => ({
        name: item.eventTicketType.name,
        unit_price: formatPrice(item.unitPrice / 100, currency),
        amount: item.quantity,
        total_price: formatPrice((item.unitPrice * item.quantity) / 100, currency)
    }));
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
