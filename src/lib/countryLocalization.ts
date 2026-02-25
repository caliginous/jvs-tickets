// Country localization utility with explicit language support
// This prevents Webpack from bundling all language files into the main bundle

import countryLocalize from "i18n-iso-countries";

// Explicit map of supported languages to prevent bundling all locales
const countryLocaleLoaders: Record<string, () => Promise<any>> = {
    en: () => import('i18n-iso-countries/langs/en.json'),
    de: () => import('i18n-iso-countries/langs/de.json'),
};

// Cache for loaded locales to avoid re-loading
const loadedLocales = new Set<string>();

/**
 * Load and register a country locale for the specified language
 * @param lang - Language code (e.g., 'en', 'de')
 * @returns Promise that resolves when the locale is loaded
 */
export async function loadCountryLocale(lang: string): Promise<void> {
    // Skip if already loaded
    if (loadedLocales.has(lang)) {
        return;
    }

    try {
        const loader = countryLocaleLoaders[lang];
        if (!loader) {
            console.warn(`Country locale not supported for language: ${lang}`);
            return;
        }

        const localeData = await loader();
        countryLocalize.registerLocale(localeData.default || localeData);
        loadedLocales.add(lang);
    } catch (error) {
        console.error(`Failed to load country locale for ${lang}:`, error);
        // Fallback to English if the requested language fails to load
        if (lang !== 'en' && !loadedLocales.has('en')) {
            await loadCountryLocale('en');
        }
    }
}

/**
 * Get localized country name
 * @param countryCode - ISO country code (e.g., 'GB', 'US')
 * @param lang - Language code (e.g., 'en', 'de')
 * @returns Localized country name or undefined if not available
 */
export function getLocalizedCountryName(countryCode: string, lang: string): string | undefined {
    try {
        return countryLocalize.getName(countryCode, lang);
    } catch (error) {
        // Fallback to English if localization fails
        if (lang !== 'en') {
            try {
                return countryLocalize.getName(countryCode, 'en');
            } catch {
                return undefined;
            }
        }
        return undefined;
    }
}

// Export the countryLocalize instance for direct use if needed
export { countryLocalize };
