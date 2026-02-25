import { NextApiRequest, NextApiResponse } from 'next';
import { emailTriggerService } from '../../../../lib/services/emailTriggerService';
import { serverAuthenticate } from '../../../../constants/serverUtil';
import { PermissionSection, PermissionType } from '../../../../constants/interfaces';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate admin user
    const session = await serverAuthenticate(req, res, {
      permission: PermissionSection.EmailManagement,
      permissionType: PermissionType.Write
    });
    if (!session || !session.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { 
      templateType, 
      recipientEmail, 
      recipientName, 
      locale = 'en',
      customPayload 
    } = req.body;
    
    // Validate required fields
    if (!templateType || !recipientEmail) {
      return res.status(400).json({
        error: 'Missing required fields: templateType, recipientEmail'
      });
    }
    
    console.log('📧 [EMAIL TRIGGER] Manual trigger requested:', {
      templateType,
      recipientEmail,
      recipientName,
      locale,
      triggeredBy: session.email
    });
    
    let result;
    
    // Handle different template types
    switch (templateType) {
      case 'booking_confirmation':
        if (!customPayload?.event || !customPayload?.booking) {
          return res.status(400).json({
            error: 'Missing event or booking data for booking confirmation'
          });
        }
        
        result = await emailTriggerService.sendBookingConfirmation({
          userEmail: recipientEmail,
          userFirstName: customPayload.user?.firstName || recipientName?.split(' ')[0] || 'User',
          userLastName: customPayload.user?.lastName || recipientName?.split(' ').slice(1).join(' ') || '',
          eventTitle: customPayload.event.title,
          eventDate: customPayload.event.date,
          eventTime: customPayload.event.time || 'TBD',
          eventLocation: customPayload.event.location,
          bookingId: customPayload.booking.id,
          seats: customPayload.booking.seats,
          locale
        });
        break;
        
      case 'payment_failed':
        if (!customPayload?.event || !customPayload?.booking) {
          return res.status(400).json({
            error: 'Missing event or booking data for payment failed'
          });
        }
        
        result = await emailTriggerService.sendPaymentFailed({
          userEmail: recipientEmail,
          userFirstName: customPayload.user?.firstName || recipientName?.split(' ')[0] || 'User',
          userLastName: customPayload.user?.lastName || recipientName?.split(' ').slice(1).join(' ') || '',
          eventTitle: customPayload.event.title,
          eventDate: customPayload.event.date,
          eventTime: customPayload.event.time || 'TBD',
          eventLocation: customPayload.event.location,
          bookingId: customPayload.booking.id,
          seats: customPayload.booking.seats || 1,
          locale
        });
        break;
        
      case 'welcome':
        result = await emailTriggerService.sendWelcomeEmail({
          userEmail: recipientEmail,
          userFirstName: recipientName?.split(' ')[0] || 'User',
          userLastName: recipientName?.split(' ').slice(1).join(' ') || '',
          locale
        });
        break;
        
      case 'password_reset':
        if (!customPayload?.resetLink) {
          return res.status(400).json({
            error: 'Missing resetLink for password reset email'
          });
        }
        
        result = await emailTriggerService.sendPasswordReset({
          userEmail: recipientEmail,
          userFirstName: recipientName?.split(' ')[0] || 'User',
          resetLink: customPayload.resetLink,
          locale
        });
        break;
        
      case 'event_reminder':
        if (!customPayload?.event || !customPayload?.booking) {
          return res.status(400).json({
            error: 'Missing event or booking data for event reminder'
          });
        }
        
        result = await emailTriggerService.sendEventReminder({
          userEmail: recipientEmail,
          userFirstName: customPayload.user?.firstName || recipientName?.split(' ')[0] || 'User',
          userLastName: customPayload.user?.lastName || recipientName?.split(' ').slice(1).join(' ') || '',
          eventTitle: customPayload.event.title,
          eventDate: customPayload.event.date,
          eventTime: customPayload.event.time,
          eventLocation: customPayload.event.location,
          bookingId: customPayload.booking.id,
          seats: customPayload.booking.seats,
          locale
        });
        break;
        
      case 'refund_processed':
        if (!customPayload?.event || !customPayload?.booking || !customPayload?.refund) {
          return res.status(400).json({
            error: 'Missing event, booking, or refund data for refund processed email'
          });
        }
        
        result = await emailTriggerService.sendRefundProcessed({
          userEmail: recipientEmail,
          userFirstName: customPayload.user?.firstName || recipientName?.split(' ')[0] || 'User',
          userLastName: customPayload.user?.lastName || recipientName?.split(' ').slice(1).join(' ') || '',
          eventTitle: customPayload.event.title,
          eventDate: customPayload.event.date,
          eventTime: customPayload.event.time || 'TBD',
          eventLocation: customPayload.event.location || 'JVS Events',
          bookingId: customPayload.booking.id,
          seats: customPayload.booking.seats || 1,
          refundAmount: customPayload.refund.amount,
          refundReason: customPayload.refund.reason,
          locale
        });
        break;
        
      default:
        return res.status(400).json({
          error: `Unsupported template type: ${templateType}`
        });
    }
    
    if (result.success) {
      console.log('✅ [EMAIL TRIGGER] Manual trigger successful:', {
        templateType,
        recipientEmail,
        messageId: result.messageId
      });
      
      return res.status(200).json({
        success: true,
        message: 'Email triggered successfully',
        messageId: result.messageId,
        templateType,
        recipientEmail
      });
    } else {
      console.error('❌ [EMAIL TRIGGER] Manual trigger failed:', {
        templateType,
        recipientEmail,
        error: result.error
      });
      
      return res.status(500).json({
        error: `Failed to trigger email: ${result.error}`
      });
    }
    
  } catch (error) {
    console.error('❌ [EMAIL TRIGGER] Error in manual trigger:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}
