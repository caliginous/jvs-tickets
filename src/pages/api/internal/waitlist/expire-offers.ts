import { NextApiRequest, NextApiResponse } from "next";
import { expireOffers } from "../../../../lib/services/waitlist/expireOffers";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed" });
    }

    // CRON_SECRET bearer-token protection (same pattern as existing cron endpoints)
    const authHeader = req.headers.authorization;
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
        return res.status(500).json({ error: "Cron secret not configured" });
    }

    if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
        return res.status(401).json({ error: "Invalid authorization" });
    }

    try {
        const result = await expireOffers();

        console.log(`[cron/expire-offers] Expired ${result.expiredCount} offers`);

        return res.status(200).json({
            success: true,
            ...result,
        });

    } catch (error: any) {
        console.error("[cron/expire-offers] Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
