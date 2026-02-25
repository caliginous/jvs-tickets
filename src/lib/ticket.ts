import { PDFDocument } from "pdf-lib";
import prisma from "./prisma";
import QRCode from "qrcode";
import { formatPrice, getStaticAssetFile, generateSecret } from "../constants/serverUtil";
import { encodeTicketQR, getEventTitle } from "../constants/util";
import { getOption, getOptionData } from "./options";
import { Options } from "../constants/Constants";

const fillTextField = (form, fieldName, value) => {
    try {
        const field = form.getTextField(fieldName);
        if (!field) return;
        field.setText(value);
    } catch (e) {
        console.log(e);
    }
};

export const generateTicketSecret = async (ticketId) => {
    const ticket = await prisma.ticket.findUnique({
        where: {
            id: ticketId
        }
    });
    let secret = ticket.secret;
    if (secret === null || secret === "") {
        secret = generateSecret();

        await prisma.ticket.update({
            data: {
                secret
            },
            where: {
                id: ticketId
            }
        });
    }
    return secret;
}

export const generateTicket = async (
    template,
    details: { seatInformation: string; price; name; currency; locale; date?: Date },
    eventName: string,
    ticketId,
    demo = false
): Promise<Uint8Array> => {
    return new Promise<Uint8Array>(async (resolve, reject) => {
        try {
            const pdfDoc = await PDFDocument.load(template);
            const form = pdfDoc.getForm();
            fillTextField(form, "EVENT_NAME", eventName);
            fillTextField(form, "SEAT_INFORMATION", details.seatInformation ?? "");
            fillTextField(
                form,
                "PRICE",
                formatPrice(details.price, details.currency, details.locale)
            );
            fillTextField(form, "CUSTOMER_NAME", details.name);
            if (details.date)
                fillTextField(form, "EVENT_DATE", details.date.toLocaleString(details.locale));

            let secret;
            if (demo) {
                secret = generateSecret();
            } else {
                secret = await generateTicketSecret(ticketId);
            }

            const qrCode = await generateQRCode(ticketId, secret);
            const qrCodeImg = await pdfDoc.embedPng(qrCode);
            const qrCodeField = form.getButton("QR_CODE");
            qrCodeField.setImage(qrCodeImg);

            form.flatten();
            resolve(await pdfDoc.save());
        } catch (e) {
            reject(e);
        }
    });
};

const generateQRCode = async (ticketId, secret): Promise<string> => {
    return new Promise<string>(async (resolve, reject) => {
        QRCode.toDataURL(
            encodeTicketQR(ticketId, secret),
            { errorCorrectionLevel: "H" },
            async (err, data) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(data);
            });
    });
}

export const generateQRCodeWithId = async (ticketId): Promise<string> => {
    const secret = await generateTicketSecret(ticketId);
    return generateQRCode(ticketId, secret);
}

export const generateTicketWithId = async (ticketId: string): Promise<Uint8Array> => {
    const order = await prisma.ticket.findUnique({
        where: {
            id: ticketId
        },
        include: {
            order: {
                include: {
                    eventDate: {
                        include: {
                            event: true
                        }
                    },
                    user: true
                }
            },
            eventTicketType: true
        }
    });
    const currency = await getOption(Options.Currency);
    
    // Use eventTicketType for ticket type label and price
    const ticketTypeLabel = order.eventTicketType?.name ?? 'General Admission';
    const ticketPrice = order.eventTicketType?.price ?? 0;
    
    return await generateTicket(
        (await getOptionData(Options.TemplateTicket, getStaticAssetFile("ticket/template.pdf"))).data,
        {
            seatInformation: ticketTypeLabel,
            price: ticketPrice,
            name: (order.firstName ?? order.order.user.firstName) + " " + (order.lastName ?? order.order.user.lastName),
            currency: currency,
            locale: order.order.locale,
            date: order.order.eventDate.date
        },
        getEventTitle(order.order.eventDate),
        ticketId
    );
}

export const generateTickets = async (
    template,
    orderId: string
): Promise<Array<Uint8Array>> => {
    const orderDB = await prisma.order.findUnique({
        where: {
            id: orderId
        },
        select: {
            id: true,
            eventDate: {
                select: {
                    title: true,
                    event: true,
                    date: true
                }
            },
            user: true,
            locale: true,
            tickets: {
                include: {
                    eventTicketType: true
                }
            }
        }
    });

    const currency = await getOption(Options.Currency);

    return await Promise.all(
        orderDB.tickets.map(async (ticket) => {
            // Use eventTicketType for ticket type label and price
            const ticketTypeLabel = ticket.eventTicketType?.name ?? 'General Admission';
            const ticketPrice = ticket.eventTicketType?.price ?? 0;
            
            return await generateTicket(
                template,
                {
                    seatInformation: ticketTypeLabel,
                    price: ticketPrice,
                    name: (ticket.firstName ?? orderDB.user.firstName) + " " + (ticket.lastName ?? orderDB.user.lastName),
                    currency: currency,
                    locale: orderDB.locale,
                    date: orderDB.eventDate.date
                },
                getEventTitle(orderDB.eventDate),
                ticket.id
            );
        })
    );
};
