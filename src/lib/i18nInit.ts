// i18n Cache Initialization
// This file initializes the translation cache when the app starts

import { initI18nCache } from './i18nCache';

// Initialize the i18n cache when this module is imported
// Only run on server-side to avoid Prisma client issues in browser
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
    // Server-side only
    try {
        // Dynamic import to avoid issues during build
        const i18nModule = require('../../i18n-cached');
        if (i18nModule.cache) {
            initI18nCache(i18nModule.cache);
            console.log('✅ i18n cache initialized on server');
        }
    } catch (error) {
        console.warn('⚠️ Failed to initialize i18n cache:', error.message);
    }
}

// Export a function that can be called to manually initialize the cache
export async function initializeI18nCache() {
    if (typeof window !== 'undefined') {
        // Client-side - no cache needed
        return;
    }
    
    try {
        const i18nModule = require('../../i18n-cached');
        if (i18nModule.cache) {
            initI18nCache(i18nModule.cache);
            console.log('✅ i18n cache manually initialized');
        }
    } catch (error) {
        console.error('Failed to manually initialize i18n cache:', error);
    }
}
