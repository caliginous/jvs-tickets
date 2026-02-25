import FormData from "form-data";
import Mailgun from "mailgun.js";
import { ENV, assertEmailEnv, getMaskedEnvInfo } from '../env';

export interface MailgunEmailData {
  from: string;
  fromEmail: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  bcc?: string;
  env?: any; // Allow passing environment context
}

export interface MailgunResponse {
  success: boolean;
  message?: string;
  error?: string;
  messageId?: string;
}

export class MailgunService {
  private mailgun: any;
  private domain: string;
  private apiKey: string;

  constructor() {
    // Don't initialize in constructor - lazy load when needed
    this.mailgun = null;
    this.domain = null;
    this.apiKey = null;
  }

  private async initialize(envContext?: any) {
    if (this.mailgun) {
      return; // Already initialized
    }

    // Log environment info for debugging
    console.log('🔍 [MailgunService] Environment check:', getMaskedEnvInfo());
    
    // Validate environment variables
    try {
      assertEmailEnv();
    } catch (error) {
      console.error('❌ [MailgunService] Environment validation failed:', error);
      throw error;
    }

    // Use centralized environment variables
    this.apiKey = ENV.MAILGUN_API_KEY;
    this.domain = ENV.MAILGUN_DOMAIN;
    
    console.log('✅ [MailgunService] Environment validated, initializing client...');
    const mailgun = new Mailgun(FormData);
    this.mailgun = mailgun.client({
      username: "api",
      key: this.apiKey,
      // EU domain endpoint for GDPR compliance
      url: ENV.MAILGUN_BASE_URL
    });
  }

  async sendEmail(emailData: MailgunEmailData): Promise<MailgunResponse> {
    try {
      console.log('🔍 [MailgunService] Starting sendEmail...');
      
      // Initialize if not already done
      console.log('🔍 [MailgunService] Calling initialize...');
      await this.initialize(emailData.env);
      console.log('🔍 [MailgunService] Initialize completed successfully');
      
      console.log('Sending email via Mailgun EU region...');
      console.log('Email details:', {
        from: `${emailData.from} <${emailData.fromEmail}>`,
        to: emailData.to,
        subject: emailData.subject,
        htmlLength: emailData.html?.length || 0,
        textLength: emailData.text?.length || 0
      });

      const messageData: any = {
        from: `${emailData.from} <${emailData.fromEmail}>`,
        to: [emailData.to],
        subject: emailData.subject,
        html: emailData.html
      };

      // Add text version if provided
      if (emailData.text) {
        messageData.text = emailData.text;
      }

      // Add reply-to if provided
      if (emailData.replyTo) {
        messageData["h:Reply-To"] = emailData.replyTo;
      }

      // Add BCC if provided
      if (emailData.bcc) {
        messageData.bcc = [emailData.bcc];
      }

      const data = await this.mailgun.messages.create(this.domain, messageData);

      console.log('Email sent successfully via Mailgun EU region:', {
        messageId: data.id,
        message: data.message
      });

      return {
        success: true,
        message: 'Email sent successfully via EU Mailgun region',
        messageId: data.id
      };

    } catch (error) {
      console.error('Mailgun email sending failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Helper method to convert HTML to plain text for fallback
  htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }

  // Method to send email with both HTML and text versions
  async sendEmailWithFallback(emailData: MailgunEmailData): Promise<MailgunResponse> {
    // If no text version provided, create one from HTML
    if (!emailData.text) {
      emailData.text = this.htmlToText(emailData.html);
    }

    return this.sendEmail(emailData);
  }


}

// Export singleton instance
export const mailgunService = new MailgunService();
