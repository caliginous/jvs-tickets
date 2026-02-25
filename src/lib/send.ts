import { generateInvoice } from "./invoice";
import { generateTickets } from "./ticket";
import prisma from "./prisma";
import { ShippingFactory, ShippingType } from "../store/factories/shipping/ShippingFactory";

import ejs from "ejs";
import { PaymentFactory, PaymentType } from "../store/factories/payment/PaymentFactory";
import { getStaticAssetFile } from "../constants/serverUtil";
import { getIcalData } from "./ical";
import {
    getGoogleWalletTicketLink,
    getGoogleWalletTicketLinkFromObjectId,
    validateConfiguration
} from "./googleWallet";
import { getOption, getOptionData, setOption } from "./options";
import { Options } from "../constants/Constants";
import unescape from "lodash/unescape";
import getT from 'next-translate/getT';
import { EmailService } from "./services/emailService";

export const getEmailHtml = async (firstName, lastName, containsTickets, containsInvoice, eventDate, tickets, cancellationLink, isCancellation) => {
    let googleWallet = undefined;
    if (containsTickets && validateConfiguration()) {
        try {
            const links: {objectId: string, link: string}[] = await Promise.all(
                tickets.map(async (ticket): Promise<{objectId: string, link: string}> => await getGoogleWalletTicketLink(eventDate, ticket))
            );
            googleWallet = {
                allTicketsLink: getGoogleWalletTicketLinkFromObjectId(links.map(link => link.objectId)),
                ticketLinks: links.map(link => link.link)
            }
        } catch (e) {
            console.log(e);
        }
    }

    const html = !isCancellation ?
        await getOptionData(Options.TemplateConfirmEmail, getStaticAssetFile("email/template.html", "utf-8")) :
        await getOptionData(Options.TemplateCancellationEmail, getStaticAssetFile("email/cancellation.html", "utf-8"));
    return ejs.render(
        unescape(html.data.toString()),
        {
            customerName: firstName + " " + lastName,
            containsTickets: containsTickets,
            containsInvoice: containsInvoice ? true : undefined,
            googleWallet: googleWallet,
            cancellationLink: cancellationLink
        }
    );
}

export const sendPaymentLinkEmail = async (orderId: string, paymentLink: string, orderTotal?: number) => {
    return new Promise<void>(async (resolve, reject) => {
        try {
            console.log(`[sendPaymentLinkEmail] 🔍 Starting email process for order ${orderId}`);
            const order = await prisma.order.findUnique({
                where: {
                    id: orderId,
                },
                select: {
                    user: true,
                    tickets: true,
                    eventDate: {
                        select: {
                            date: true,
                            event: {
                                select: {
                                    title: true,
                                    venue: true
                                }
                            }
                        }
                    },
                    locale: true
                },
            });

            if (!order) {
                reject(new Error(`Order ${orderId} not found`));
                return;
            }

            // Get the payment link email template from Email Management system
            console.log(`[sendPaymentLinkEmail] 📧 Getting email template for order ${orderId}`);
            const emailService = new EmailService();
            const templates = await emailService.getTemplatesByType('payment_link');
            const template = templates[0]; // Get the first template of this type
            console.log(`[sendPaymentLinkEmail] 📧 Template found:`, template ? 'Yes' : 'No');
            
            // Use the passed order total instead of recalculating from categories
            const total = orderTotal !== undefined ? orderTotal : 0;
            
            // Render the email template using Email Management system
            if (!template) {
                throw new Error('Payment link email template not found');
            }
            
            const templateData = {
                customerFirstName: order.user.firstName,
                eventTitle: order.eventDate.event?.title || 'Event',
                eventDate: order.eventDate.date ? new Date(order.eventDate.date).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'Europe/London'
                }) : 'TBD',
                eventLocation: order.eventDate.event?.venue?.name || order.eventDate.event?.venue?.address || 'JVS Events',
                total: (total / 100).toFixed(2), // Convert pence to pounds for display
                ticketCount: order.tickets.length,
                paymentLink: paymentLink
            };
            
            // Use the Email Management system's template rendering
            console.log(`[sendPaymentLinkEmail] 🔍 Template baseHtml:`, template.baseHtml);
            console.log(`[sendPaymentLinkEmail] 🔍 Template data:`, templateData);
            
            let html;
            try {
                html = await emailService.renderTemplate(template.id, templateData, order.locale || 'en');
                console.log(`[sendPaymentLinkEmail] 🔍 Rendered HTML:`, html);
                
                            // Check if the template rendered properly (not just placeholder text)
            if (html.includes('{{content}}') || html.includes('{{') || html.length < 100) {
                console.log(`[sendPaymentLinkEmail] ⚠️ Template rendering issue detected, using fallback template`);
                console.log(`[sendPaymentLinkEmail] 🔍 Template contains {{content}}: ${html.includes('{{content}}')}`);
                console.log(`[sendPaymentLinkEmail] 🔍 Template contains other placeholders: ${html.includes('{{')}`);
                console.log(`[sendPaymentLinkEmail] 🔍 Template length: ${html.length}`);
                
                html = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <title>Payment Link for JVS Event</title>
                    </head>
                    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #2c5aa0;">JVS Event Payment Required</h2>
                            <p>Hello ${templateData.customerFirstName},</p>
                            <p>JVS has created an order for you for the event: <strong>${templateData.eventTitle}</strong></p>
                            <p><strong>Event Details:</strong></p>
                            <ul>
                                <li><strong>Date:</strong> ${templateData.eventDate}</li>
                                <li><strong>Location:</strong> ${templateData.eventLocation}</li>
                                <li><strong>Total Amount:</strong> £${templateData.total}</li>
                                <li><strong>Number of Tickets:</strong> ${templateData.ticketCount}</li>
                            </ul>
                            <p>Please complete your payment using the link below:</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${templateData.paymentLink}" style="background-color: #2c5aa0; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Complete Payment</a>
                            </div>
                            <p>If you have any questions, please contact JVS support.</p>
                            <p>Best regards,<br>The JVS Team</p>
                        </div>
                    </body>
                    </html>
                `;
                console.log(`[sendPaymentLinkEmail] ✅ Fallback template applied, length: ${html.length}`);
            }
            } catch (renderError) {
                console.error(`[sendPaymentLinkEmail] ❌ Template rendering failed:`, renderError);
                // Use fallback template
                html = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <title>Payment Link for JVS Event</title>
                    </head>
                    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #2c5aa0;">JVS Event Payment Required</h2>
                            <p>Hello ${templateData.customerFirstName},</p>
                            <p>JVS has created an order for you for the event: <strong>${templateData.eventTitle}</strong></p>
                            <p><strong>Event Details:</strong></p>
                            <ul>
                                <li><strong>Date:</strong> ${templateData.eventDate}</li>
                                <li><strong>Location:</strong> ${templateData.eventLocation}</li>
                                <li><strong>Total Amount:</strong> £${templateData.total}</li>
                                <li><strong>Number of Tickets:</strong> ${templateData.ticketCount}</li>
                                <li><strong>Payment Link:</strong> <a href="${templateData.paymentLink}">Click here to pay</a></li>
                            </ul>
                            <p>If you have any questions, please contact JVS support.</p>
                            <p>Best regards,<br>The JVS Team</p>
                        </div>
                    </body>
                    </html>
                `;
            }

            // Get email settings from database
            console.log(`[sendPaymentLinkEmail] ⚙️ Getting email settings for order ${orderId}`);
            const emailSettings = await emailService.getSettings();
            console.log(`[sendPaymentLinkEmail] ⚙️ Email settings:`, emailSettings ? 'Found' : 'Not found');
            
            const message: any = {
                from: emailSettings?.senderEmail || process.env.EMAIL_SENDER || 'noreply@jvs.org.uk',
                to: order.user.email,
                subject: template.subjects[order.locale || 'en'] || template.subjects['en'] || 'JVS Order Created - Payment Required',
                html: html
            };
            
            console.log(`[sendPaymentLinkEmail] 📨 Email message prepared:`, {
                from: message.from,
                to: message.to,
                subject: message.subject,
                htmlLength: message.html?.length || 0
            });

            // Send email using Mailgun API
            try {
                console.log(`[sendPaymentLinkEmail] 📤 Attempting to send email via Mailgun API...`);
                
                // Debug environment variables using centralized validation
                const { getMaskedEnvInfo } = await import('./env');
                console.log(`[sendPaymentLinkEmail] 🔍 Environment check:`, getMaskedEnvInfo());
                
                const { mailgunService } = await import('./services/mailgunService');
                
                console.log(`[sendPaymentLinkEmail] 🔍 MailgunService imported successfully`);
                
                const mailgunResult = await mailgunService.sendEmailWithFallback({
                    from: emailSettings?.senderName || 'JVS Events',
                    fromEmail: emailSettings?.senderEmail || process.env.EMAIL_SENDER || 'noreply@jvs.org.uk',
                    to: order.user.email,
                    subject: message.subject,
                    html: message.html,
                    replyTo: emailSettings?.senderEmail || process.env.EMAIL_SENDER || 'noreply@jvs.org.uk',
                    bcc: emailSettings?.bccEmail
                });

                if (mailgunResult.success) {
                    console.log(`[sendPaymentLinkEmail] ✅ Payment link email sent successfully via Mailgun for order ${orderId} to ${order.user.email}`);
                    console.log(`[sendPaymentLinkEmail] 📧 Mailgun message ID:`, mailgunResult.messageId);
                    
                    // Log the email success
                    await emailService.createEmailLog({
                        templateId: template.id,
                        recipientEmail: order.user.email,
                        subject: message.subject,
                        htmlContent: message.html,
                        messageId: mailgunResult.messageId,
                        status: 'sent',
                        mailType: template.mailType,
                        locale: order.locale || 'en',
                        payload: templateData
                    });
                } else {
                    throw new Error(mailgunResult.error || 'Mailgun email failed');
                }
            } catch (mailgunError) {
                console.error(`[sendPaymentLinkEmail] ❌ Mailgun email failed for order ${orderId}:`, mailgunError);
                
                // Log the failure
                await emailService.createEmailLog({
                    templateId: template.id,
                    recipientEmail: order.user.email,
                    subject: message.subject,
                    htmlContent: message.html,
                    status: 'failed',
                    mailType: template.mailType,
                    locale: order.locale || 'en',
                    payload: templateData,
                    errorMessage: mailgunError instanceof Error ? mailgunError.message : 'Unknown error'
                });
                
                throw mailgunError;
            }
        } catch (error) {
            console.error(`[sendPaymentLinkEmail] ❌ Error sending payment link email for order ${orderId}:`, error);
            reject(error);
        }
    });
};

export const send = async (orderId, isCancellation?: boolean) => {
    return new Promise<void>(async (resolve, reject) => {
        const order = await prisma.order.findUnique({
            where: {
                id: orderId,
            },
            select: {
                shipping: true,
                user: true,
                tickets: true,
                paymentResult: true,
                paymentType: true,
                invoiceSent: true,
                eventDate: {
                    select: {
                        title: true,
                        date: true,
                        event: true
                    }
                },
                cancellationSecret: true,
                locale: true
            },
        });
        const t = await getT(order.locale.includes("-") ? order.locale.split("-")[0] : order.locale, "mail");

       let attachments = [];
        // generate invoice
        let containsInvoice = false;
        if (!order.invoiceSent || isCancellation) {
            const invoiceData = await generateInvoice(
                orderId,
                (await getOptionData(Options.TemplateInvoice, getStaticAssetFile("invoice/template.html", "utf-8"))).data,
                "GBP"
            );

            attachments.push({
                filename: t("invoice-filename"),
                content: invoiceData,
                contentType: "text/html", // Changed from application/pdf since we're now returning HTML
            });
            containsInvoice = true;
        }

        // generate tickets
        let shipping;
        try {
            shipping = ShippingFactory.getShippingInstance(
                JSON.parse(order.shipping)
            );
        } catch (error) {
            console.error(`[send] Error parsing shipping data for order ${orderId}:`, error);
            // Default to download shipping if parsing fails
            shipping = ShippingFactory.getShippingInstance({ type: ShippingType.Download, data: null });
        }
        
        // Ensure shipping object exists and has the required structure
        if (!shipping || !shipping.shippingData) {
            console.error(`[send] Invalid shipping object for order ${orderId}, defaulting to download shipping`);
            shipping = ShippingFactory.getShippingInstance({ type: ShippingType.Download, data: null });
        }
        
        const ticketsAlreadySent = order.tickets.every(ticket => ticket.secret !== "" && ticket.secret !== null && ticket.secret !== undefined);
        const payed =
            PaymentFactory.getPaymentInstance({
                data: null,
                type: order.paymentType as PaymentType,
            })?.paymentResultValid(order.paymentResult) ?? false;
        let containsTickets = undefined;
        if (
            shipping && shipping.shippingData && shipping.shippingData.type === ShippingType.Download &&
            !ticketsAlreadySent &&
            payed
        ) {
            const tickets = await generateTickets(
                (await getOptionData(Options.TemplateTicket, getStaticAssetFile("ticket/template.pdf"))).data,
                orderId
            );
            tickets.forEach((ticket, i) => {
                attachments.push({
                    filename: t("ticket-filename", {number: i + 1}),
                    content: ticket,
                    contentType: "application/pdf",
                });
            });
            containsTickets = true;
        }

        console.log(`[send] Order ${orderId} - Attachments: ${attachments.length}, containsInvoice: ${containsInvoice}, containsTickets: ${containsTickets}, payed: ${payed}, shipping type: ${shipping?.shippingData?.type}`);
        
        if (attachments.length === 0) {
            console.log(`[send] No attachments generated for order ${orderId}, resolving without sending email`);
            resolve();
            return;
        }

        // Get email settings from database
        const emailService = new EmailService();
        const emailSettings = await emailService.getSettings();
        
        const message: any = {
            from: emailSettings?.senderEmail || process.env.EMAIL_SENDER || 'noreply@jvs.org.uk',
            to: order.user.email,
            subject: t("email-title"),
            html: null,
            attachments
        };

        if (order.eventDate.date) {
            message["icalEvent"] = getIcalData(order.eventDate);
        }

        const tickets = await prisma.ticket.findMany({
            where: {
                orderId: orderId
            },
            select: {
                id: true,
                secret: true,
                seatId: true,
                firstName: true,
                lastName: true,
                category: {
                    select: {
                        label: true
                    }
                },
                order: {
                    select: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                }
            }
        })
        message.html = await getEmailHtml(
            order.user.firstName,
            order.user.lastName,
            containsTickets,
            containsInvoice,
            order.eventDate,
            tickets,
            `${process.env.NEXT_PUBLIC_SHOP_DOMAIN}/refund?orderId=${orderId}&secret=${encodeURIComponent(order.cancellationSecret)}`,
            isCancellation
        );

                    // Send email using Mailgun API
        try {
            const { mailgunService } = await import('./services/mailgunService');
            
            const mailgunResult = await mailgunService.sendEmailWithFallback({
                from: emailSettings?.senderName || 'JVS Events',
                fromEmail: emailSettings?.senderEmail || process.env.EMAIL_SENDER || 'noreply@jvs.org.uk',
                to: order.user.email,
                subject: message.subject,
                html: message.html,
                replyTo: emailSettings?.senderEmail || process.env.EMAIL_SENDER || 'noreply@jvs.org.uk'
            });

            if (!mailgunResult.success) {
                throw new Error(mailgunResult.error || 'Mailgun email failed');
            }

            console.log(`[send] ✅ Email sent successfully via Mailgun for order ${orderId}, message ID: ${mailgunResult.messageId}`);

            // Update order status
            if (containsInvoice) {
                await prisma.order.update({
                    where: {
                        id: orderId
                    },
                    data: {
                        invoiceSent: true
                    }
                });
            }

            if (containsTickets) {
                await prisma.order.update({
                    where: {
                        id: orderId
                    },
                    data: {
                        shipping: JSON.stringify(ShippingFactory.getShippingInstance({type: ShippingType.Download, data: null}).getSuccessfulShipping())
                    }
                });
            }

            resolve();
        } catch (emailError) {
            console.error(`[send] ❌ Failed to send email for order ${orderId}:`, emailError);
            reject(emailError);
        }
    });
};
