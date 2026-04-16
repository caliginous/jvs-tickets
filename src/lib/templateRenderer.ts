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
 * HTML-escape a token value before inserting it into an email template to prevent
 * HTML/script injection via customer-supplied values (event titles, custom fields,
 * etc.) ending up inside the email body.
 */
function escapeHtml(value: unknown): string {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * Renders an email template by replacing {{}} placeholders with actual data.
 * All replacements are HTML-escaped. Tokens ending in `_raw` (e.g. `{{body_raw}}`)
 * are emitted without escaping; only set those from trusted server-side sources.
 */
export async function renderEmailTemplate(template: string, payload: any): Promise<string> {
    const commonEmailData = await getEmailCommonData();

    const commonValues: Record<string, string> = payload.common
        ? {
              greeting: payload.common.greeting || "Hello",
              appName: payload.common.appName || commonEmailData.appName,
              supportEmail: payload.common.supportEmail || commonEmailData.supportEmail,
              baseUrl: payload.common.baseUrl || commonEmailData.appUrl,
              appUrl: payload.common.appUrl || commonEmailData.appUrl,
          }
        : {
              greeting: "Hello",
              appName: commonEmailData.appName,
              supportEmail: commonEmailData.supportEmail,
              baseUrl: commonEmailData.appUrl,
              appUrl: commonEmailData.appUrl,
          };

    let result = template;
    for (const [key, val] of Object.entries(commonValues)) {
        const re = new RegExp(`\\{\\{common\\.${key}\\}\\}`, "g");
        result = result.replace(re, escapeHtml(val));
    }

    // Replace all {{}} placeholders. `_raw` suffix opts out of escaping.
    result = result.replace(/\{\{([^}]+)\}\}/g, (match, rawPath) => {
        const path = String(rawPath).trim();
        const raw = path.endsWith("_raw");
        const lookupPath = raw ? path.slice(0, -"_raw".length) : path;
        const value = getNestedValue(payload, lookupPath);
        if (value === undefined) return match;
        return raw ? String(value) : escapeHtml(value);
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
