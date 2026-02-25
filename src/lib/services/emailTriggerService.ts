import { PrismaClient } from '@prisma/client';
import { renderCompleteEmail, renderEmailTemplate } from '../templateRenderer';
import { getEmailCommonData } from './emailCommonService';
import prisma from '../prisma';

export interface EmailTriggerData {
  templateType: string;
  recipientEmail: string;
  locale: string;
  payload: any;
}

export interface EmailTriggerResult {
  success: boolean;
  messageId?: string;
  htmlContent?: string;
  error?: string;
}

export class EmailTriggerService {
  /**
   * Send a booking confirmation email
   */
  async sendBookingConfirmation(data: {
    userEmail: string;
    userFirstName: string;
    userLastName: string;
    eventTitle: string;
    eventDate: string;
    eventTime: string;
    eventLocation: string;
    bookingId: string;
    seats: number;
    locale: string;
    total?: string;
    eventBespokeMessage?: string;
  }): Promise<EmailTriggerResult> {
    try {
      console.log('📧 [EMAIL TRIGGER] Sending booking confirmation email to:', data.userEmail);
      
      // Map the data to match the expected template structure
      const mappedPayload = {
        user: {
          firstName: data.userFirstName,
          lastName: data.userLastName,
          email: data.userEmail
        },
        event: {
          title: data.eventTitle,
          date: data.eventDate,
          location: data.eventLocation,
          time: data.eventTime,
          bespoke: {
            message: data.eventBespokeMessage || ''
          }
        },
        booking: {
          id: data.bookingId,
          seats: data.seats,
          total: data.total || 'TBD'
        },
        ...(await getEmailCommonData())
      };
      
      console.log('📧 [EMAIL TRIGGER] Mapped payload for template:', mappedPayload);
      
      const result = await this.sendTemplatedEmail({
        templateType: 'booking_confirmation',
        recipientEmail: data.userEmail,
        locale: data.locale,
        payload: mappedPayload
      });

      if (result.success) {
        console.log('✅ [EMAIL TRIGGER] Booking confirmation email sent successfully');
      } else {
        console.error('❌ [EMAIL TRIGGER] Failed to send booking confirmation email:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ [EMAIL TRIGGER] Error sending booking confirmation email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Send a payment failed email
   */
  async sendPaymentFailed(data: {
    userEmail: string;
    userFirstName: string;
    userLastName: string;
    eventTitle: string;
    eventDate: string;
    eventTime: string;
    eventLocation: string;
    bookingId: string;
    seats: number;
    locale: string;
  }): Promise<EmailTriggerResult> {
    try {
      console.log('📧 [EMAIL TRIGGER] Sending payment failed email to:', data.userEmail);
      
      // Map the data to match the expected template structure
      const mappedPayload = {
        user: {
          firstName: data.userFirstName,
          lastName: data.userLastName,
          email: data.userEmail
        },
        event: {
          title: data.eventTitle,
          date: data.eventDate,
          location: data.eventLocation,
          time: data.eventTime
        },
        booking: {
          id: data.bookingId,
          seats: data.seats
        },
        ...(await getEmailCommonData())
      };
      
      console.log('📧 [EMAIL TRIGGER] Mapped payment failed payload for template:', mappedPayload);
      
      const result = await this.sendTemplatedEmail({
        templateType: 'payment_failed',
        recipientEmail: data.userEmail,
        locale: data.locale,
        payload: mappedPayload
      });

      if (result.success) {
        console.log('✅ [EMAIL TRIGGER] Payment failed email sent successfully');
      } else {
        console.error('❌ [EMAIL TRIGGER] Failed to send payment failed email:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ [EMAIL TRIGGER] Failed to send payment failed email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Send a welcome email
   */
  async sendWelcomeEmail(data: {
    userEmail: string;
    userFirstName: string;
    userLastName: string;
    locale: string;
  }): Promise<EmailTriggerResult> {
    try {
      console.log('📧 [EMAIL TRIGGER] Sending welcome email to:', data.userEmail);
      
      // Map the data to match the expected template structure
      const mappedPayload = {
        user: {
          firstName: data.userFirstName,
          lastName: data.userLastName,
          email: data.userEmail
        },
        ...(await getEmailCommonData())
      };
      
      console.log('📧 [EMAIL TRIGGER] Mapped welcome payload for template:', mappedPayload);
      
      const result = await this.sendTemplatedEmail({
        templateType: 'welcome',
        recipientEmail: data.userEmail,
        locale: data.locale,
        payload: mappedPayload
      });

      if (result.success) {
        console.log('✅ [EMAIL TRIGGER] Welcome email sent successfully');
      } else {
        console.error('❌ [EMAIL TRIGGER] Failed to send welcome email:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ [EMAIL TRIGGER] Failed to send welcome email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Send booking cancellation email
   */
  async sendBookingCancellation(data: {
    userEmail: string;
    userFirstName: string;
    userLastName: string;
    eventTitle: string;
    eventDate: string;
    eventTime: string;
    eventLocation: string;
    bookingId: string;
    seats: number;
    total: string;
    locale: string;
    cancellationReason?: string;
    cancelledBy?: string;
    cancellationDate?: string;
    refundAmount?: string;
  }): Promise<EmailTriggerResult> {
    try {
      console.log('📧 [EMAIL TRIGGER] Sending booking cancellation email to:', data.userEmail);
      
      // Map the data to match the expected template structure
      const mappedPayload = {
        user: {
          firstName: data.userFirstName,
          lastName: data.userLastName,
          email: data.userEmail
        },
        event: {
          title: data.eventTitle,
          date: data.eventDate,
          location: data.eventLocation,
          time: data.eventTime
        },
        booking: {
          id: data.bookingId,
          seats: data.seats,
          total: data.total
        },
        cancellation: {
          reason: data.cancellationReason || 'No reason provided',
          cancelledBy: data.cancelledBy || 'System',
          date: data.cancellationDate || new Date().toLocaleDateString('en-GB')
        },
        refund: {
          amount: data.refundAmount || data.total || 'N/A'
        },
        ...(await getEmailCommonData())
      };
      
      console.log('📧 [EMAIL TRIGGER] Mapped cancellation payload for template:', mappedPayload);
      
      const result = await this.sendTemplatedEmail({
        templateType: 'booking_cancellation',
        recipientEmail: data.userEmail,
        locale: data.locale,
        payload: mappedPayload
      });

      if (result.success) {
        console.log('✅ [EMAIL TRIGGER] Booking cancellation email sent successfully');
      } else {
        console.error('❌ [EMAIL TRIGGER] Failed to send booking cancellation email:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ [EMAIL TRIGGER] Failed to send booking cancellation email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Send a password reset email
   */
  async sendPasswordReset(data: {
    userEmail: string;
    userFirstName: string;
    resetLink: string;
    locale: string;
  }): Promise<EmailTriggerResult> {
    try {
      console.log('📧 [EMAIL TRIGGER] Sending password reset email to:', data.userEmail);
      
      // Map the data to match the expected template structure
      const mappedPayload = {
        user: {
          firstName: data.userFirstName,
          lastName: 'User', // Default since we don't have lastName
          email: data.userEmail
        },
        reset: {
          url: data.resetLink, // Using resetLink from the data
          expiry: '24 hours'
        },
        ...(await getEmailCommonData())
      };
      
      console.log('📧 [EMAIL TRIGGER] Mapped password reset payload for template:', mappedPayload);
      
      const result = await this.sendTemplatedEmail({
        templateType: 'password_reset',
        recipientEmail: data.userEmail,
        locale: data.locale,
        payload: mappedPayload
      });

      if (result.success) {
        console.log('✅ [EMAIL TRIGGER] Password reset email sent successfully');
      } else {
        console.error('❌ [EMAIL TRIGGER] Failed to send password reset email:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ [EMAIL TRIGGER] Failed to send password reset email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Send an event reminder email
   */
  async sendEventReminder(data: {
    userEmail: string;
    userFirstName: string;
    userLastName: string;
    eventTitle: string;
    eventDate: string;
    eventTime: string;
    eventLocation: string;
    bookingId: string;
    seats: number;
    locale: string;
  }): Promise<EmailTriggerResult> {
    try {
      console.log('📧 [EMAIL TRIGGER] Sending event reminder email to:', data.userEmail);
      
      // Map the data to match the expected template structure
      const mappedPayload = {
        user: {
          firstName: data.userFirstName,
          lastName: data.userLastName,
          email: data.userEmail
        },
        event: {
          title: data.eventTitle,
          date: data.eventDate,
          location: data.eventLocation,
          time: data.eventTime
        },
        booking: {
          id: data.bookingId,
          seats: data.seats
        },
        ...(await getEmailCommonData())
      };
      
      console.log('📧 [EMAIL TRIGGER] Mapped event reminder payload for template:', mappedPayload);
      
      const result = await this.sendTemplatedEmail({
        templateType: 'event_reminder',
        recipientEmail: data.userEmail,
        locale: data.locale,
        payload: mappedPayload
      });

      if (result.success) {
        console.log('✅ [EMAIL TRIGGER] Event reminder email sent successfully');
      } else {
        console.error('❌ [EMAIL TRIGGER] Failed to send event reminder email:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ [EMAIL TRIGGER] Failed to send event reminder email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Send a refund processed email
   */
  async sendRefundProcessed(data: {
    userEmail: string;
    userFirstName: string;
    userLastName: string;
    eventTitle: string;
    eventDate: string;
    eventTime: string;
    eventLocation: string;
    bookingId: string;
    seats: number;
    refundAmount: number;
    refundReason: string;
    locale: string;
  }): Promise<EmailTriggerResult> {
    try {
      console.log('📧 [EMAIL TRIGGER] Sending refund processed email to:', data.userEmail);
      
      // Map the data to match the expected template structure
      const mappedPayload = {
        user: {
          firstName: data.userFirstName,
          lastName: data.userLastName,
          email: data.userEmail
        },
        event: {
          title: data.eventTitle,
          date: data.eventDate,
          location: data.eventLocation,
          time: data.eventTime
        },
        booking: {
          id: data.bookingId,
          seats: data.seats
        },
        refund: {
          id: data.bookingId, // Using booking ID as refund ID
          amount: `£${(data.refundAmount / 100).toFixed(2)}`, // refundAmount comes in pence from API
          reason: data.refundReason,
          date: new Date().toLocaleDateString('en-GB')
        },
        ...(await getEmailCommonData())
      };
      
      console.log('📧 [EMAIL TRIGGER] Mapped refund payload for template:', mappedPayload);
      
      const result = await this.sendTemplatedEmail({
        templateType: 'refund_processed',
        recipientEmail: data.userEmail,
        locale: data.locale,
        payload: mappedPayload
      });

      if (result.success) {
        console.log('✅ [EMAIL TRIGGER] Refund processed email sent successfully');
      } else {
        console.error('❌ [EMAIL TRIGGER] Failed to send refund processed email:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ [EMAIL TRIGGER] Failed to send refund processed email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Generic method to send templated emails
   */
  private async sendTemplatedEmail(data: EmailTriggerData): Promise<EmailTriggerResult> {
    try {
      // Get email settings
      const emailSettings = await prisma.emailSettings.findFirst({
        orderBy: { updatedAt: 'desc' }
      });
      
      if (!emailSettings) {
        console.error('❌ [EMAIL TRIGGER] No email settings found');
        return { success: false, error: 'Email settings not configured' };
      }
      
      // Get template
      const template = await prisma.emailTemplate.findFirst({
        where: { mailType: data.templateType, isActive: true }
      });
      
      if (!template) {
        console.error('❌ [EMAIL TRIGGER] Template not found:', data.templateType);
        return { success: false, error: 'Template not found' };
      }
      
      // Render template
      const locale = data.locale || 'en';
      const subjects = template.subjects as Record<string, string>;
      const subject = subjects[locale] || subjects.en || 'Email from JVS';
      
      let htmlContent = template.baseHtml;
      if (template.bodyHtml) {
        // Replace {{content}} with the body template
        const renderedBody = await renderCompleteEmail(subject, template.bodyHtml, data.payload);
        htmlContent = template.baseHtml.replace('{{content}}', renderedBody.body);
      }
      
      // Render the final HTML content to replace any remaining {{}} placeholders
      htmlContent = await renderEmailTemplate(htmlContent, data.payload);
      
      // Send email using Mailgun API
      try {
        const { mailgunService } = await import('./mailgunService');
        
        const mailgunResult = await mailgunService.sendEmailWithFallback({
          from: emailSettings.senderName || 'JVS Events',
          fromEmail: emailSettings.senderEmail,
          to: data.recipientEmail,
          subject: subject,
          html: htmlContent,
          replyTo: emailSettings.senderEmail,
          bcc: emailSettings.bccEmail
        });

        if (!mailgunResult.success) {
          throw new Error(mailgunResult.error || 'Mailgun email failed');
        }

        const info = { messageId: mailgunResult.messageId };
        
        console.log('✅ [EMAIL TRIGGER] Email sent successfully:', {
          messageId: info.messageId,
          to: data.recipientEmail,
          template: data.templateType
        });
        
        return {
          success: true,
          messageId: info.messageId,
          htmlContent
        };
      } catch (mailgunError) {
        console.error('❌ [EMAIL TRIGGER] Mailgun email failed:', mailgunError);
        return { success: false, error: mailgunError instanceof Error ? mailgunError.message : 'Unknown error' };
      }
    } catch (error) {
      console.error('❌ [EMAIL TRIGGER] Failed to send templated email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  /**
   * Log email to database
   */
  private async logEmail(data: {
    templateId: string;
    recipientEmail: string;
    subject: string;
    htmlContent: string;
    mailType: string;
    locale: string;
    payload: any;
  }) {
    try {
      await prisma.emailLog.create({
        data: {
          templateId: data.templateId,
          recipientEmail: data.recipientEmail,
          subject: data.subject,
          htmlContent: data.htmlContent,
          status: 'sent',
          mailType: data.mailType,
          locale: data.locale,
          payload: data.payload
        }
      });
      
      console.log('✅ [EMAIL TRIGGER] Email logged to database');
    } catch (error) {
      console.error('❌ [EMAIL TRIGGER] Failed to log email:', error);
    }
  }
}

export const emailTriggerService = new EmailTriggerService();
