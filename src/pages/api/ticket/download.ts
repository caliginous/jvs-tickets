import { NextApiRequest, NextApiResponse } from "next";
import { generateTickets } from "../../../lib/ticket";
import { getStaticAssetFile } from "../../../constants/serverUtil";
import { getOptionData } from "../../../lib/options";
import { Options } from "../../../constants/Constants";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({ error: "Order ID is required" });
        }

        // Get the ticket template
        const template = (await getOptionData(Options.TemplateTicket, getStaticAssetFile("ticket/template.pdf"))).data;

        // Generate tickets for the order
        const tickets = await generateTickets(template, orderId);

        if (tickets.length === 0) {
            return res.status(404).json({ error: "No tickets found for this order" });
        }

        // For now, we'll return the first ticket as a base64 string
        // In a production system, you might want to create a ZIP file with all tickets
        const ticketData = Buffer.from(tickets[0]).toString("base64");
        const dataUrl = "data:application/pdf;base64," + ticketData;

        res.status(200).json({ 
            success: true, 
            ticketUrl: dataUrl,
            message: "Ticket generated successfully"
        });

    } catch (error) {
        console.error("Error generating ticket:", error);
        res.status(500).json({ 
            error: "Failed to generate ticket",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
}
