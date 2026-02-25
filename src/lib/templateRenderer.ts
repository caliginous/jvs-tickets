/**
 * Email Template Renderer
 * Replaces {{}} placeholders in email templates with actual data
 */

import { getEmailCommonData } from './services/emailCommonService';

export interface TemplateData {
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  event?: {
    title?: string;
    date?: string;
    location?: string;
    description?: string;
    bespoke?: {
      message?: string;
    };
  };
  booking?: {
    id?: string;
    seats?: number;
    total?: string;
    status?: string;
  };
  common?: {
    appName?: string;
    appUrl?: string;
    supportEmail?: string;
  };
  [key: string]: any;
}

/**
 * Renders an email template by replacing {{}} placeholders with actual data
 */
export async function renderEmailTemplate(template: string, payload: any): Promise<string> {
    // Get configurable common email values
    const commonEmailData = await getEmailCommonData();
    
    let result = template;
    
    // Replace common variables
    if (payload.common) {
        result = result.replace(/\{\{common\.greeting\}\}/g, payload.common.greeting || "Hello");
        result = result.replace(/\{\{common\.appName\}\}/g, payload.common.appName || commonEmailData.appName);
        result = result.replace(/\{\{common\.supportEmail\}\}/g, payload.common.supportEmail || commonEmailData.supportEmail);
        result = result.replace(/\{\{common\.baseUrl\}\}/g, payload.common.baseUrl || commonEmailData.appUrl);
        result = result.replace(/\{\{common\.appUrl\}\}/g, payload.common.appUrl || commonEmailData.appUrl);
    } else {
        // Fallback to configurable values if no common payload
        result = result.replace(/\{\{common\.greeting\}\}/g, "Hello");
        result = result.replace(/\{\{common\.appName\}\}/g, commonEmailData.appName);
        result = result.replace(/\{\{common\.supportEmail\}\}/g, commonEmailData.supportEmail);
        result = result.replace(/\{\{common\.baseUrl\}\}/g, commonEmailData.appUrl);
        result = result.replace(/\{\{common\.appUrl\}\}/g, commonEmailData.appUrl);
    }
  
  // Replace all {{}} placeholders
  result = result.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(payload, path.trim());
    return value !== undefined ? String(value) : match;
  });
  
  return result;
}

/**
 * Gets a nested value from an object using dot notation (e.g., "user.firstName")
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Generates sample data for testing email templates
 */
export function generateSampleData(): TemplateData {
  return {
    user: {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com"
    },
    event: {
      title: "Rosh Hashanah Dinner",
      date: "September 15, 2025",
      location: "JVS Community Hall",
      description: "Join us for a special Rosh Hashanah celebration",
      bespoke: {
        message: "Please bring dietary requirements form"
      }
    },
    booking: {
      id: "BK-2025-001",
      seats: 2,
      total: "£45.00",
      status: "confirmed"
    },
    common: {
      appName: "JVS Events",
      appUrl: "https://jvs.org.uk",
      supportEmail: "support@jvs.org.uk"
    }
  };
}

/**
 * Renders a complete email (subject + body) with sample data
 */
export async function renderCompleteEmail(
  subjectTemplate: string,
  bodyTemplate: string,
  data: TemplateData = generateSampleData()
): Promise<{ subject: string; body: string }> {
  const subject = await renderEmailTemplate(subjectTemplate, data);
  const body = await renderEmailTemplate(bodyTemplate, data);
  
  return { subject, body };
}
