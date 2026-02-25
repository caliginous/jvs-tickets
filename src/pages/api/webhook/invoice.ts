import { NextApiRequest, NextApiResponse } from "next";
import { send } from "../../../lib/send";
import { withNotification } from "../../../lib/notifications/withNotification";

async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        res.status(405).end("Method Not Allowed");
        return;
    }
    
    const { orderId } = req.body;
    try {
        await send(orderId);
        res.status(200).end("Email Send");
    } catch (e) {
        console.log(e);
        res.status(500).end("Server error");
    }
}

export default withNotification(handler, ["webhook", "invoice"]);
