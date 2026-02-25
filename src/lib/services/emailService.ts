import { PrismaClient } from '@prisma/client';
import prisma from '../prisma';

export interface EmailSettingsData {
  transportMode: 'smtp' | 'provider' | 'mailgun';
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
  providerName?: string;
  providerUser?: string;
  providerPassword?: string;
  mailgunApiKey?: string;
  mailgunDomain?: string;
  senderEmail: string;
  senderName?: string;
  bccEmail?: string;
  appBaseUrl: string;
}

export interface EmailTemplateData {
  name: string;
  mailType: string;
  subjects: Record<string, string>;
  baseHtml: string;
  bodyHtml?: string;
  samplePayload?: any;
}

export interface EmailTemplateWithRelations extends EmailTemplateData {
  id: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: number;
  updatedBy?: number;
}

export interface EmailTestData {
  templateId?: string;
  testEmail: string;
  testPayload?: any;
  locale?: string;
  success: boolean;
  messageId?: string;
  errorMessage?: string;
  testedBy?: number;
}

export interface EmailLogData {
  templateId?: string;
  recipientEmail: string;
  subject: string;
  htmlContent: string;
  messageId?: string;
  status: 'sent' | 'delivered' | 'bounced' | 'failed';
  errorMessage?: string;
  mailType?: string;
  locale?: string;
  payload?: any;
}

export class EmailService {
  // Email Settings
  async getSettings(): Promise<EmailSettingsData | null> {
    const settings = await prisma.emailSettings.findFirst({
      orderBy: { updatedAt: 'desc' }
    });
    
    if (!settings) return null;
    
    return {
      transportMode: settings.transportMode as 'smtp' | 'provider',
      smtpHost: settings.smtpHost || undefined,
      smtpPort: settings.smtpPort || undefined,
      smtpSecure: settings.smtpSecure || false,
      smtpUser: settings.smtpUser || undefined,
      smtpPassword: settings.smtpPassword || undefined,
      providerName: settings.providerName || undefined,
      providerUser: settings.providerUser || undefined,
      providerPassword: settings.providerPassword || undefined,
      senderEmail: settings.senderEmail,
      senderName: settings.senderName || undefined,
      bccEmail: settings.bccEmail || undefined,
      appBaseUrl: settings.appBaseUrl
    };
  }

  async updateSettings(data: EmailSettingsData, updatedBy?: number): Promise<EmailSettingsData> {
    // Delete existing settings (we only keep one)
    await prisma.emailSettings.deleteMany();
    
    // Create new settings
    const settings = await prisma.emailSettings.create({
      data: {
        transportMode: data.transportMode,
        smtpHost: data.smtpHost,
        smtpPort: data.smtpPort,
        smtpSecure: data.smtpSecure,
        smtpUser: data.smtpUser,
        smtpPassword: data.smtpPassword, // TODO: Encrypt this
        providerName: data.providerName,
        providerUser: data.providerUser,
        providerPassword: data.providerPassword, // TODO: Encrypt this
        senderEmail: data.senderEmail,
        senderName: data.senderName,
        bccEmail: data.bccEmail,
        appBaseUrl: data.appBaseUrl,
        updatedBy
      }
    });
    
    return this.getSettings() as Promise<EmailSettingsData>;
  }

  // Email Templates
  async listTemplates(search?: string, mailType?: string): Promise<EmailTemplateWithRelations[]> {
    const where: any = { isActive: true };
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { mailType: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (mailType) {
      where.mailType = mailType;
    }
    
    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' }
    });
    
    return templates.map(template => ({
      id: template.id,
      name: template.name,
      mailType: template.mailType,
      subjects: template.subjects as Record<string, string>,
      baseHtml: template.baseHtml,
      bodyHtml: template.bodyHtml || undefined,
      samplePayload: template.samplePayload as any || undefined,
      isActive: template.isActive,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      createdBy: template.createdBy || undefined,
      updatedBy: template.updatedBy || undefined
    }));
  }

  async getTemplate(id: string): Promise<EmailTemplateWithRelations | null> {
    const template = await prisma.emailTemplate.findUnique({
      where: { id }
    });
    
    if (!template) return null;
    
    return {
      id: template.id,
      name: template.name,
      mailType: template.mailType,
      subjects: template.subjects as Record<string, string>,
      baseHtml: template.baseHtml,
      bodyHtml: template.bodyHtml || undefined,
      samplePayload: template.samplePayload as any || undefined,
      isActive: template.isActive,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      createdBy: template.createdBy || undefined,
      updatedBy: template.updatedBy || undefined
    };
  }

  async createTemplate(data: EmailTemplateData, createdBy?: number): Promise<EmailTemplateWithRelations> {
    const template = await prisma.emailTemplate.create({
      data: {
        name: data.name,
        mailType: data.mailType,
        subjects: data.subjects,
        baseHtml: data.baseHtml,
        bodyHtml: data.bodyHtml,
        samplePayload: data.samplePayload,
        createdBy
      }
    });
    
    return this.getTemplate(template.id) as Promise<EmailTemplateWithRelations>;
  }

  async updateTemplate(id: string, data: Partial<EmailTemplateData>, updatedBy?: number): Promise<EmailTemplateWithRelations> {
    await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...data,
        updatedBy
      }
    });
    
    return this.getTemplate(id) as Promise<EmailTemplateWithRelations>;
  }

  async deleteTemplate(id: string): Promise<void> {
    await prisma.emailTemplate.delete({
      where: { id }
    });
  }

  async duplicateTemplate(id: string, createdBy?: number): Promise<EmailTemplateWithRelations> {
    const original = await this.getTemplate(id);
    if (!original) {
      throw new Error('Template not found');
    }
    
    const duplicatedData: EmailTemplateData = {
      name: `${original.name} (copy)`,
      mailType: original.mailType,
      subjects: { ...original.subjects },
      baseHtml: original.baseHtml,
      bodyHtml: original.bodyHtml,
      samplePayload: original.samplePayload
    };
    
    return this.createTemplate(duplicatedData, createdBy);
  }

  // Email Tests
  async createEmailTest(data: EmailTestData): Promise<void> {
    await prisma.emailTest.create({
      data: {
        templateId: data.templateId,
        testEmail: data.testEmail,
        testPayload: data.testPayload,
        locale: data.locale || 'en',
        success: data.success,
        messageId: data.messageId,
        errorMessage: data.errorMessage,
        testedBy: data.testedBy
      }
    });
  }

  // Email Logs
  async createEmailLog(data: EmailLogData): Promise<void> {
    await prisma.emailLog.create({
      data: {
        templateId: data.templateId,
        recipientEmail: data.recipientEmail,
        subject: data.subject,
        htmlContent: data.htmlContent,
        messageId: data.messageId,
        status: data.status,
        errorMessage: data.errorMessage,
        mailType: data.mailType,
        locale: data.locale || 'en',
        payload: data.payload
      }
    });
  }

  // Utility methods
  async getTemplatesByType(mailType: string): Promise<EmailTemplateWithRelations[]> {
    return this.listTemplates(undefined, mailType);
  }

  async getActiveTemplates(): Promise<EmailTemplateWithRelations[]> {
    return this.listTemplates();
  }

  // Email sending methods
  async sendEmail(templateId: string, data: any, locale: string = 'en', recipientEmail: string, emailSettings?: EmailSettingsData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      // Render the template
      const html = await this.renderTemplate(templateId, data, locale);
      const subject = template.subjects[locale] || template.subjects['en'] || 'Email';

      // Use Mailgun API if configured
      if (emailSettings?.transportMode === 'mailgun' || process.env.MAILGUN_API_KEY) {
        try {
          const { mailgunService } = await import('./mailgunService');
          
          const mailgunResult = await mailgunService.sendEmailWithFallback({
            from: emailSettings?.senderName || 'JVS Events',
            fromEmail: emailSettings?.senderEmail || process.env.EMAIL_SENDER || 'noreply@jvs.org.uk',
            to: recipientEmail,
            subject: subject,
            html: html,
            replyTo: emailSettings?.senderEmail || process.env.EMAIL_SENDER || 'noreply@jvs.org.uk',
            bcc: emailSettings?.bccEmail
          });

          if (mailgunResult.success) {
            // Log the email
            await this.createEmailLog({
              templateId: templateId,
              recipientEmail: recipientEmail,
              subject: subject,
              htmlContent: html,
              messageId: mailgunResult.messageId,
              status: 'sent',
              mailType: template.mailType,
              locale: locale,
              payload: data
            });

            return {
              success: true,
              messageId: mailgunResult.messageId
            };
          } else {
            throw new Error(mailgunResult.error || 'Mailgun email failed');
          }
        } catch (mailgunError) {
          console.error('Mailgun email failed:', mailgunError);
          throw mailgunError;
        }
      }

      // No fallback - Mailgun is our only email service
      throw new Error('Mailgun email service not available');

    } catch (error) {
      console.error('Email sending failed:', error);
      
      // Log the failure
      await this.createEmailLog({
        templateId: templateId,
        recipientEmail: recipientEmail,
        subject: 'Email Failed',
        htmlContent: 'Email sending failed',
        status: 'failed',
        mailType: 'unknown',
        locale: locale,
        payload: data,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Template rendering
  async renderTemplate(templateId: string, data: any, locale: string = 'en'): Promise<string> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Get the appropriate subject and HTML for the locale
    const subject = template.subjects[locale] || template.subjects['en'] || 'Email';
    let html = template.baseHtml;

    // Simple template variable replacement
    // Replace {{variableName}} with actual values
    Object.keys(data).forEach(key => {
      const placeholder = `{{${key}}}`;
      const value = data[key] || '';
      html = html.replace(new RegExp(placeholder, 'g'), value);
    });

    return html;
  }
}

export const emailService = new EmailService();
