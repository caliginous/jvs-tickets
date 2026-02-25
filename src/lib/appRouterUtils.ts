import React from 'react';
import { getStaticEmailSettings, EmailSettings } from './getEmailSettings';

/**
 * Props interface for App Router pages that need email settings
 */
export interface AppRouterPageProps {
  emailSettings: EmailSettings;
}

/**
 * Get email settings for App Router pages
 * This can be used in generateStaticParams, generateMetadata, or other App Router functions
 */
export async function getEmailSettingsForAppRouter(): Promise<EmailSettings> {
  try {
    return await getStaticEmailSettings();
  } catch (error) {
    console.warn('Failed to fetch email settings for App Router page, using fallbacks:', error);
    
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

/**
 * Helper function to create a component that receives email settings as props
 * Use this to wrap your page components
 */
export function withEmailSettings<P extends Record<string, any>>(
  Component: React.ComponentType<P & AppRouterPageProps>
) {
  return async function WrappedComponent(props: P) {
    const emailSettings = await getEmailSettingsForAppRouter();
    return React.createElement(Component, { ...props, emailSettings });
  };
}
