import { GetStaticProps } from 'next';
import { getStaticEmailSettings, EmailSettings } from './getEmailSettings';

/**
 * Props interface for static pages that need email settings
 */
export interface StaticPageProps {
  emailSettings: EmailSettings;
}

/**
 * Higher-order function that adds email settings to static page props
 * Use this to wrap your getStaticProps functions
 */
export function withEmailSettings<T extends Record<string, any> = {}>(
  getStaticPropsFn?: (context: any) => Promise<{ props: T }>
) {
  return async (context: any): Promise<{ props: T & StaticPageProps }> => {
    try {
      // Get email settings at build time
      const emailSettings = await getStaticEmailSettings();
      
      // If there's an existing getStaticProps function, call it
      if (getStaticPropsFn) {
        const existingProps = await getStaticPropsFn(context);
        return {
          ...existingProps,
          props: {
            ...existingProps.props,
            emailSettings
          }
        };
      }
      
      // Otherwise just return the email settings
      return {
        props: {
          emailSettings
        } as T & StaticPageProps
      };
    } catch (error) {
      console.error('Error in withEmailSettings:', error);
      
      // Return fallback email settings if everything fails
      const fallbackSettings: EmailSettings = {
        supportEmail: 'support@jvs.org.uk',
        appName: 'JVS Events',
        appUrl: 'https://jvs.org.uk',
        senderName: 'JVS Events',
        infoEmail: 'info@jvs.org.uk',
        legalEmail: 'legal@jvs.org.uk',
        privacyEmail: 'privacy@jvs.org.uk'
      };
      
      if (getStaticPropsFn) {
        try {
          const existingProps = await getStaticPropsFn(context);
          return {
            ...existingProps,
            props: {
              ...existingProps.props,
              emailSettings: fallbackSettings
            }
          };
        } catch (fallbackError) {
          console.error('Fallback getStaticProps also failed:', fallbackError);
          return {
            props: {
              emailSettings: fallbackSettings
            } as T & StaticPageProps
          };
        }
      }
      
      return {
        props: {
          emailSettings: fallbackSettings
        } as T & StaticPageProps
      };
    }
  };
}

/**
 * Simple helper to get email settings for a static page
 * Use this when you just need email settings without other props
 */
export async function getEmailSettingsForStaticPage(): Promise<EmailSettings> {
  return await getStaticEmailSettings();
}
