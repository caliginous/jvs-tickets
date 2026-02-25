const locales = require("./locales.json");
const { PrismaClient } = require("@prisma/client");

// Create a single Prisma instance for i18n
const prisma = new PrismaClient();

const DEFAULT_LANG = "en";

// LRU Cache for translations with TTL
class TranslationCache {
    constructor(maxSize = 100, ttl = 15 * 60 * 1000) { // 15 minutes TTL
        this.maxSize = maxSize;
        this.ttl = ttl;
        this.cache = new Map();
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        
        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, item);
        return item.value;
    }

    set(key, value) {
        // Remove oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            value,
            expiry: Date.now() + this.ttl
        });
    }

    invalidate(pattern) {
        if (pattern.includes('*')) {
            // Wildcard invalidation - clear all
            this.cache.clear();
        } else {
            // Specific invalidation
            for (const key of this.cache.keys()) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        }
    }

    clear() {
        this.cache.clear();
    }
}

// Global cache instance
const translationCache = new TranslationCache();

// Pre-warm cache with static locales
async function prewarmCache() {
    try {
        for (const lang of locales) {
            for (const ns of ["common", "information", "payment", "seatselection", "checkout", "refund"]) {
                const cacheKey = `${lang}:${ns}`;
                if (!translationCache.get(cacheKey)) {
                    await loadLocaleFromCache(lang, ns);
                }
            }
        }
        console.log("✅ i18n cache pre-warmed successfully");
    } catch (error) {
        console.warn("⚠️ i18n cache pre-warming failed:", error.message);
    }
}

// Cached version of loadLocaleFrom
async function loadLocaleFromCache(lang, ns) {
    const cacheKey = `${lang}:${ns}`;
    
    // Check cache first
    const cached = translationCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    // Load from static files first
    let result = (await import(`./locale/${DEFAULT_LANG}/${ns}.json`)).default;
    try {
        result = { ...result, ...(await import(`./locale/${lang}/${ns}.json`)).default };
    } catch (e) {
        // Fallback to default language if specific language file doesn't exist
        console.warn(`Language file not found for ${lang}:${ns}, using ${DEFAULT_LANG}`);
    }

    // Only load from database on server-side
    if (typeof window === 'undefined') {
        try {
            const translations = await prisma.translation.findMany({
                where: { namespace: ns }
            });

            const db = translations
                .filter((translation) => {
                    try {
                        const parsed = JSON.parse(translation.translations);
                        return parsed[lang];
                    } catch {
                        return false;
                    }
                })
                .reduce((result, translation) => {
                    try {
                        const parsed = JSON.parse(translation.translations);
                        return { ...result, [translation.key]: parsed[lang] };
                    } catch {
                        return result;
                    }
                }, {});

            result = { ...result, ...db };
        } catch (e) {
            console.error(`Failed to load translations from DB for ${lang}:${ns}:`, e.message);
        }
    }

    // Cache the result
    translationCache.set(cacheKey, result);
    return result;
}

module.exports = {
    "loader": false,
    "locales": locales,
    "defaultLocale": DEFAULT_LANG,
    "pages": {
        "*": ["common"],
        "/information": ["information"],
        "/payment": ["payment"],
        "/seatselection/[id]": ["seatselection"],
        "/checkout": ["checkout"],
        "/refund": ["refund"]
    },
    "logger": () => {},
    "logBuild": false,
    "loadLocaleFrom": loadLocaleFromCache,
    // Export cache for external invalidation
    "cache": translationCache,
    // Pre-warm function
    "prewarmCache": prewarmCache
};

// Auto-pre-warm cache in production (server-side only)
if (process.env.NODE_ENV === "production" && typeof window === 'undefined') {
    // Small delay to ensure Prisma is ready
    setTimeout(prewarmCache, 1000);
}
