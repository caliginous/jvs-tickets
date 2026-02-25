import { NextApiRequest, NextApiResponse } from "next";
import { getCacheStats, clearTranslationCache, invalidateTranslationCache, prewarmTranslationCache } from "../../../lib/i18nCache";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Simple API key check for now
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    if (apiKey !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    if (req.method === "GET") {
        // Get cache statistics
        const stats = getCacheStats();
        return res.status(200).json(stats);
    }

    if (req.method === "POST") {
        const { action, pattern } = req.body;

        try {
            switch (action) {
                case "clear":
                    clearTranslationCache();
                    return res.status(200).json({ message: "Cache cleared successfully" });
                
                case "invalidate":
                    if (!pattern) {
                        return res.status(400).json({ error: "Pattern is required for invalidation" });
                    }
                    invalidateTranslationCache(pattern);
                    return res.status(200).json({ message: `Cache invalidated for pattern: ${pattern}` });
                
                case "prewarm":
                    await prewarmTranslationCache();
                    return res.status(200).json({ message: "Cache pre-warmed successfully" });
                
                default:
                    return res.status(400).json({ error: "Invalid action. Use: clear, invalidate, or prewarm" });
            }
        } catch (error) {
            console.error("Cache operation failed:", error);
            return res.status(500).json({ error: "Cache operation failed", details: error.message });
        }
    }

    res.status(405).json({ error: "Method not allowed" });
}
