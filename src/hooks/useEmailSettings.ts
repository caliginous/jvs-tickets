import { useState, useEffect } from 'react';
import { getEmailSettings, EmailSettings } from '../lib/getEmailSettings';

/**
 * React hook for accessing email settings in client-side components
 * Automatically fetches settings from the database and provides fallbacks
 */
export function useEmailSettings() {
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const emailSettings = await getEmailSettings();
        setSettings(emailSettings);
        setError(null);
      } catch (err) {
        console.error('Failed to load email settings:', err);
        setError(err instanceof Error ? err.message : 'Failed to load email settings');
        // Still set fallback settings so the component can render
        const fallbackSettings = await getEmailSettings();
        setSettings(fallbackSettings);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  return {
    settings,
    loading,
    error,
    // Convenience getters
    supportEmail: settings?.supportEmail || 'support@jvs.org.uk',
    appName: settings?.appName || 'JVS Events',
    appUrl: settings?.appUrl || 'https://jvs.org.uk',
    infoEmail: settings?.infoEmail || 'info@jvs.org.uk',
    legalEmail: settings?.legalEmail || 'legal@jvs.org.uk',
    privacyEmail: settings?.privacyEmail || 'privacy@jvs.org.uk'
  };
}
