import { NextApiRequest, NextApiResponse } from "next";
import { getCacheStats, clearTranslationCache, invalidateTranslationCache, prewarmTranslationCache } from "../../../lib/i18nCache";
import { timingSafeEqual } from "crypto";

function safeEqual(a: string | undefined | null, b: string | undefined | null): boolean {
    if (!a || !b) return false;
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return timingSafeEqual(ab, bb);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Require a dedicated secret for this admin cache endpoint so it does not share
    // blast radius with CRON_SECRET.
    const expected = process.env.I18N_CACHE_SECRET || process.env.CRON_SECRET;
    if (!expected) {
        console.error("[i18n-cache] Missing I18N_CACHE_SECRET / CRON_SECRET");
        return res.status(500).json({ error: "Server misconfigured" });
    }
    const supplied = String(req.headers["x-api-key"] || req.query.apiKey || "");
    if (!safeEqual(supplied, expected)) {
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
            return res.status(500).json({ error: "Cache operation failed" });
        }
    }

    res.status(405).json({ error: "Method not allowed" });
}
