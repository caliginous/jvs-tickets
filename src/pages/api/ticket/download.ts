import { NextApiRequest, NextApiResponse } from "next";
import { generateTickets } from "../../../lib/ticket";
import { getStaticAssetFile, serverAuthenticate } from "../../../constants/serverUtil";
import { getOptionData } from "../../../lib/options";
import { Options } from "../../../constants/Constants";
import prisma from "../../../lib/prisma";
import { timingSafeEqual } from "crypto";

function safeEqual(a: string | undefined | null, b: string | undefined | null): boolean {
    if (!a || !b) return false;
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return timingSafeEqual(ab, bb);
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { orderId, secret } = req.body ?? {};

        if (!orderId || typeof orderId !== "string") {
            return res.status(400).json({ error: "Order ID is required" });
        }

        // Authorize: either a valid cancellationSecret (held by the buyer) or an admin
        // session. Otherwise anyone who knows an orderId could download the PDF.
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { cancellationSecret: true },
        });
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }
        const suppliedSecret = typeof secret === "string" ? secret : undefined;
        const isSecretOk = safeEqual(suppliedSecret, order.cancellationSecret);
        const admin = isSecretOk
            ? null
            : await serverAuthenticate(req, res, undefined, false);
        if (!isSecretOk && !admin) {
            return res.status(404).json({ error: "Order not found" });
        }

        const template = (
            await getOptionData(Options.TemplateTicket, getStaticAssetFile("ticket/template.pdf"))
        ).data;

        const tickets = await generateTickets(template, orderId);

        if (tickets.length === 0) {
            return res.status(404).json({ error: "No tickets found for this order" });
        }

        const ticketData = Buffer.from(tickets[0]).toString("base64");
        const dataUrl = "data:application/pdf;base64," + ticketData;

        res.status(200).json({
            success: true,
            ticketUrl: dataUrl,
            message: "Ticket generated successfully",
        });
    } catch (error) {
        console.error("Error generating ticket:", error);
        res.status(500).json({ error: "Failed to generate ticket" });
    }
}
