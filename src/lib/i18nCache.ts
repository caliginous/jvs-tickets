// i18n Cache Management Utility
// This provides functions to invalidate the translation cache when needed

let i18nCache: any = null;

/**
 * Initialize the i18n cache reference
 * This should be called after the i18n module is loaded
 */
export function initI18nCache(cache: any) {
    i18nCache = cache;
}

/**
 * Invalidate specific translation cache entries
 * @param pattern - Pattern to match cache keys (e.g., "en:common", "de:*", "*")
 */
export function invalidateTranslationCache(pattern: string) {
    if (!i18nCache) {
        console.warn("i18n cache not initialized, cannot invalidate");
        return;
    }
    
    try {
        i18nCache.invalidate(pattern);
        console.log(`✅ Translation cache invalidated for pattern: ${pattern}`);
    } catch (error) {
        console.error("Failed to invalidate translation cache:", error);
    }
}

/**
 * Clear all translation cache entries
 */
export function clearTranslationCache() {
    if (!i18nCache) {
        console.warn("i18n cache not initialized, cannot clear");
        return;
    }
    
    try {
        i18nCache.clear();
        console.log("✅ Translation cache cleared");
    } catch (error) {
        console.error("Failed to clear translation cache:", error);
    }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
    if (!i18nCache) {
        return { initialized: false, size: 0 };
    }
    
    try {
        return {
            initialized: true,
            size: i18nCache.cache.size,
            maxSize: i18nCache.maxSize,
            ttl: i18nCache.ttl
        };
    } catch (error) {
        return { initialized: false, error: error.message };
    }
}

/**
 * Pre-warm the translation cache
 */
export async function prewarmTranslationCache() {
    if (!i18nCache || !i18nCache.prewarmCache) {
        console.warn("i18n cache not initialized or prewarm function not available");
        return;
    }
    
    try {
        await i18nCache.prewarmCache();
    } catch (error) {
        console.error("Failed to pre-warm translation cache:", error);
    }
}
