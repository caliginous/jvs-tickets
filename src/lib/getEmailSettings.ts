import { getOption } from './options';
import { Options } from '../constants/Constants';

export interface EmailSettings {
  supportEmail: string;
  appName: string;
  appUrl: string;
  senderName: string;
  infoEmail: string;
  legalEmail: string;
  privacyEmail: string;
}

/**
 * Get email settings from the database for use in static pages
 * This function is optimized for build-time usage (getStaticProps)
 */
export async function getEmailSettings(): Promise<EmailSettings> {
  try {
    // Fetch all email-related options from the database
    const [
      supportEmail,
      appName,
      appUrl,
      senderName
    ] = await Promise.all([
      getOption(Options.EmailSupportEmail),
      getOption(Options.EmailAppName),
      getOption(Options.EmailAppUrl),
      getOption(Options.EmailSenderName)
    ]);

    // Return with fallbacks if database values are missing
    return {
      supportEmail: supportEmail || 'support@jvs.org.uk',
      appName: appName || 'JVS Events',
      appUrl: appUrl || 'https://jvs.org.uk',
      senderName: senderName || 'JVS Events',
      // For now, use support email for other contact types
      // You can add specific options for these later if needed
      infoEmail: supportEmail || 'info@jvs.org.uk',
      legalEmail: supportEmail || 'legal@jvs.org.uk',
      privacyEmail: supportEmail || 'privacy@jvs.org.uk'
    };
  } catch (error) {
    console.error('Error fetching email settings:', error);
    
    // Return fallback values if database lookup fails
    return {
      supportEmail: 'support@jvs.org.uk',
      appName: 'JVS Events',
      appUrl: 'https://jvs.org.uk',
      senderName: 'JVS Events',
      infoEmail: 'info@jvs.org.uk',
      legalEmail: 'legal@jvs.org.uk',
      privacyEmail: 'privacy@jvs.org.uk'
    };
  }
}

/**
 * Get a specific email setting by key
 */
export async function getEmailSetting(key: keyof EmailSettings): Promise<string> {
  const settings = await getEmailSettings();
  return settings[key];
}

/**
 * Get email settings for static generation
 * This version is specifically for use in getStaticProps
 */
export async function getStaticEmailSettings(): Promise<EmailSettings> {
  try {
    return await getEmailSettings();
  } catch (error) {
    console.warn('Failed to fetch email settings at build time, using fallbacks:', error);
    
    // Return fallback values for build-time failures
    return {
      supportEmail: 'support@jvs.org.uk',
      appName: 'JVS Events',
      appUrl: 'https://jvs.org.uk',
      senderName: 'JVS Events',
      infoEmail: 'info@jvs.org.uk',
      legalEmail: 'legal@jvs.org.uk',
      privacyEmail: 'privacy@jvs.org.uk'
    };
  }
}
