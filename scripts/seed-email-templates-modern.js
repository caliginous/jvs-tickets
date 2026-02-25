const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const emailTemplates = [
  {
    name: 'Welcome',
    mailType: 'welcome',
    subjects: { en: 'Welcome to JVS!', he: 'ברוכים הבאים ל-JVS!' },
    baseHtml: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to JVS</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #FF9800; }
        .logo { max-width: 200px; height: auto; }
        .content { padding: 20px 0; }
        .footer { text-align: center; padding: 20px 0; color: #666; font-size: 14px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #FF9800; color: white; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://jvs.org.uk/wp-content/uploads/2024/01/JVS-Logo-2024.png" alt="JVS Logo" class="logo">
            <h1 style="color: #FF9800;">Welcome to JVS!</h1>
        </div>
        
        <div class="content">
            <p>Dear {{user.firstName}} {{user.lastName}},</p>
            
            <p>Welcome to the Jewish Vegetarian Society! We're thrilled to have you join our community.</p>
            
            <p>As a member, you'll have access to:</p>
            <ul>
                <li>Exclusive events and workshops</li>
                <li>Vegetarian and vegan recipe collections</li>
                <li>Community gatherings and celebrations</li>
                <li>Educational resources about Jewish vegetarianism</li>
            </ul>
            
            <p>We look forward to seeing you at our upcoming events!</p>
            
            <p>Best regards,<br>The JVS Team</p>
        </div>
        
        <div class="footer">
            <p>Jewish Vegetarian Society<br>
            <a href="{{common.appUrl}}">{{common.appUrl}}</a></p>
        </div>
    </div>
</body>
</html>`,
    bodyHtml: `
<p>Dear {{user.firstName}} {{user.lastName}},</p>

<p>Welcome to the Jewish Vegetarian Society! We're thrilled to have you join our community.</p>

<p>As a member, you'll have access to:</p>
<ul>
    <li>Exclusive events and workshops</li>
    <li>Vegetarian and vegan recipe collections</li>
    <li>Community gatherings and celebrations</li>
    <li>Educational resources about Jewish vegetarianism</li>
</ul>

<p>We look forward to seeing you at our upcoming events!</p>

<p>Best regards,<br>The JVS Team</p>`,
    samplePayload: {
      user: { firstName: 'Alex', lastName: 'Smith', email: 'alex.smith@example.com' },
      common: { appName: 'JVS Events', appUrl: 'https://tickets.jvs.org.uk', supportEmail: 'support@jvs.org.uk' }
    }
  },
  {
    name: 'Booking Confirmation',
    mailType: 'booking_confirmation',
    subjects: { en: 'Your booking is confirmed!', he: 'הזמנתך אושרה!' },
    baseHtml: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Confirmation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #4CAF50; }
        .logo { max-width: 200px; height: auto; }
        .content { padding: 20px 0; }
        .footer { text-align: center; padding: 20px 0; color: #666; font-size: 14px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; }
        .details { background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .bespoke-message { background-color: #e8f5e8; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #4CAF50; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://jvs.org.uk/wp-content/uploads/2024/01/JVS-Logo-2024.png" alt="JVS Logo" class="logo">
            <h1 style="color: #4CAF50;">Booking Confirmation</h1>
        </div>
        
        <div class="content">
            <p>Dear {{user.firstName}} {{user.lastName}},</p>
            
            <p>Thank you for your booking! Your reservation has been confirmed.</p>
            
            <div class="details">
                <h3>Event Details:</h3>
                <p><strong>Event:</strong> {{event.title}}</p>
                <p><strong>Date:</strong> {{event.date}}</p>
                <p><strong>Location:</strong> {{event.location}}</p>
                <p><strong>Booking ID:</strong> {{booking.id}}</p>
                <p><strong>Tickets:</strong> {{booking.tickets}}</p>
                <p><strong>Total:</strong> {{booking.total}}</p>
            </div>
            
            {{#if event.bespoke.message}}
            <div class="bespoke-message">
                <h4>Special Message from the Organizers:</h4>
                <p>{{event.bespoke.message}}</p>
            </div>
            {{/if}}
            
            <p>Please bring this confirmation email with you on the day of the event.</p>
            
            <p>If you have any questions, please contact us at {{common.supportEmail}}.</p>
            
            <p>We look forward to seeing you!</p>
            
            <p>Best regards,<br>The JVS Team</p>
        </div>
        
        <div class="footer">
            <p>Jewish Vegetarian Society<br>
            <a href="{{common.appUrl}}">{{common.appUrl}}</a></p>
        </div>
    </div>
</body>
</html>`,
    bodyHtml: `
<p>Dear {{user.firstName}} {{user.lastName}},</p>

<p>Thank you for your booking! Your reservation has been confirmed.</p>

<h3>Event Details:</h3>
<ul>
    <li><strong>Event:</strong> {{event.title}}</li>
    <li><strong>Date:</strong> {{event.date}}</li>
    <li><strong>Location:</strong> {{event.location}}</li>
    <li><strong>Booking ID:</strong> {{booking.id}}</li>
    <li><strong>Tickets:</strong> {{booking.tickets}}</li>
    <li><strong>Total:</strong> {{booking.total}}</li>
</ul>

{{#if event.bespoke.message}}
<div style="background-color: #e8f5e8; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #4CAF50;">
    <h4>Special Message from the Organizers:</h4>
    <p>{{event.bespoke.message}}</p>
</div>
{{/if}}

<p>Please bring this confirmation email with you on the day of the event.</p>

<p>If you have any questions, please contact us at {{common.supportEmail}}.</p>

<p>We look forward to seeing you!</p>

<p>Best regards,<br>The JVS Team</p>`,
    samplePayload: {
      user: { firstName: 'Jordan', lastName: 'Johnson', email: 'jordan.johnson@example.com' },
      event: { 
        title: 'Community Gardening Workshop', 
        date: 'March 15, 2025', 
        location: 'JVS Community Hall - Main Location', 
        description: 'Join us for a hands-on gardening workshop',
        bespoke: { message: 'Please bring your own gardening gloves and wear clothes you don\'t mind getting dirty!' }
      },
      booking: { id: 'BK-2025-001', tickets: 2, total: '£15.00', status: 'confirmed' },
      common: { appName: 'JVS Events', appUrl: 'https://tickets.jvs.org.uk', supportEmail: 'support@jvs.org.uk' }
    }
  },
  {
    name: 'Payment Link - Stripe',
    mailType: 'payment_link',
    subjects: { en: 'Complete your booking payment', he: 'השלם את תשלום ההזמנה' },
    baseHtml: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Complete Your Payment</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #2196F3; }
        .logo { max-width: 200px; height: auto; }
        .content { padding: 20px 0; }
        .footer { text-align: center; padding: 20px 0; color: #666; font-size: 14px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .details { background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .payment-info { background-color: #e3f2fd; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #2196F3; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://jvs.org.uk/wp-content/uploads/2024/01/JVS-Logo-2024.png" alt="JVS Logo" class="logo">
            <h1 style="color: #2196F3;">Complete Your Payment</h1>
        </div>
        
        <div class="content">
            <p>Dear {{user.firstName}} {{user.lastName}},</p>
            
            <p>Thank you for your booking! To complete your reservation, please complete your payment using the secure link below.</p>
            
            <div class="details">
                <h3>Booking Details:</h3>
                <p><strong>Event:</strong> {{event.title}}</p>
                <p><strong>Date:</strong> {{event.date}}</p>
                <p><strong>Location:</strong> {{event.location}}</p>
                <p><strong>Booking ID:</strong> {{booking.id}}</p>
                <p><strong>Tickets:</strong> {{booking.tickets}}</p>
                <p><strong>Total Amount:</strong> {{booking.total}}</p>
            </div>
            
            <div class="payment-info">
                <h3>💳 Secure Payment</h3>
                <p>Your payment is processed securely through Stripe. Click the button below to complete your payment:</p>
                <div style="text-align: center;">
                    <a href="{{payment.link}}" class="button">Complete Payment</a>
                </div>
                <p><small>This link will expire in 24 hours for security reasons.</small></p>
            </div>
            
            <p>If you have any questions about your booking or payment, please contact us at {{common.supportEmail}}.</p>
            
            <p>We look forward to seeing you at the event!</p>
            
            <p>Best regards,<br>The JVS Team</p>
        </div>
        
        <div class="footer">
            <p>Jewish Vegetarian Society<br>
            <a href="{{common.appUrl}}">{{common.appUrl}}</a></p>
        </div>
    </div>
</body>
</html>`,
    bodyHtml: `
<p>Dear {{user.firstName}} {{user.lastName}},</p>

<p>Thank you for your booking! To complete your reservation, please complete your payment using the secure link below.</p>

<h3>Booking Details:</h3>
<ul>
    <li><strong>Event:</strong> {{event.title}}</li>
    <li><strong>Date:</strong> {{event.date}}</li>
    <li><strong>Location:</strong> {{event.location}}</li>
    <li><strong>Booking ID:</strong> {{booking.id}}</li>
    <li><strong>Tickets:</strong> {{booking.tickets}}</li>
    <li><strong>Total Amount:</strong> {{booking.total}}</li>
</ul>

<div style="background-color: #e3f2fd; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #2196F3;">
    <h3>💳 Secure Payment</h3>
    <p>Your payment is processed securely through Stripe. <a href="{{payment.link}}">Complete Payment</a></p>
    <p><small>This link will expire in 24 hours for security reasons.</small></p>
</div>

<p>If you have any questions about your booking or payment, please contact us at {{common.supportEmail}}.</p>

<p>We look forward to seeing you at the event!</p>

<p>Best regards,<br>The JVS Team</p>`,
    samplePayload: {
      user: { firstName: 'Casey', lastName: 'Williams', email: 'casey.williams@example.com' },
      event: { title: 'Rosh Hashanah Community Dinner', date: 'September 15, 2025', location: 'JVS Community Hall - Main Location' },
      booking: { id: 'BK-2025-002', tickets: 1, total: '£25.00' },
      payment: { link: 'https://checkout.stripe.com/pay/cs_test_example123' },
      common: { appName: 'JVS Events', appUrl: 'https://tickets.jvs.org.uk', supportEmail: 'support@jvs.org.uk' }
    }
  },
  {
    name: 'Payment Failed',
    mailType: 'payment_failed',
    subjects: { en: 'Payment failed - Action required', he: 'התשלום נכשל - נדרשת פעולה' },
    baseHtml: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Failed</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #f44336; }
        .logo { max-width: 200px; height: auto; }
        .content { padding: 20px 0; }
        .footer { text-align: center; padding: 20px 0; color: #666; font-size: 14px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #f44336; color: white; text-decoration: none; border-radius: 4px; }
        .details { background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .error { background-color: #ffebee; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #f44336; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://jvs.org.uk/wp-content/uploads/2024/01/JVS-Logo-2024.png" alt="JVS Logo" class="logo">
            <h1 style="color: #f44336;">Payment Failed</h1>
        </div>
        
        <div class="content">
            <p>Dear {{user.firstName}} {{user.lastName}},</p>
            
            <p>We're sorry, but your payment for your event booking could not be processed.</p>
            
            <div class="error">
                <h3>Payment Error:</h3>
                <p>{{payment.error}}</p>
            </div>
            
            <div class="details">
                <h3>Booking Details:</h3>
                <p><strong>Event:</strong> {{event.title}}</p>
                <p><strong>Date:</strong> {{event.date}}</p>
                <p><strong>Location:</strong> {{event.location}}</p>
                <p><strong>Booking ID:</strong> {{booking.id}}</p>
                <p><strong>Total Amount:</strong> {{booking.total}}</p>
            </div>
            
            <p>To complete your booking, please try one of the following:</p>
            <ul>
                <li>Check your payment method details</li>
                <li>Ensure you have sufficient funds</li>
                <li>Contact your bank if there are any restrictions</li>
            </ul>
            
            <div style="text-align: center;">
                <a href="{{retryLink}}" class="button">Retry Payment</a>
            </div>
            
            <p>If you continue to experience issues, please contact us at {{common.supportEmail}}.</p>
            
            <p>Best regards,<br>The JVS Team</p>
        </div>
        
        <div class="footer">
            <p>Jewish Vegetarian Society<br>
            <a href="{{common.appUrl}}">{{common.appUrl}}</a></p>
        </div>
    </div>
</body>
</html>`,
    bodyHtml: `
<p>Dear {{user.firstName}} {{user.lastName}},</p>

<p>We're sorry, but your payment for your event booking could not be processed.</p>

<h3>Payment Error:</h3>
<p>{{payment.error}}</p>

<h3>Booking Details:</h3>
<ul>
    <li><strong>Event:</strong> {{event.title}}</li>
    <li><strong>Date:</strong> {{event.date}}</li>
    <li><strong>Location:</strong> {{event.location}}</li>
    <li><strong>Booking ID:</strong> {{booking.id}}</li>
    <li><strong>Total Amount:</strong> {{booking.total}}</li>
</ul>

<p>To complete your booking, please try one of the following:</p>
<ul>
    <li>Check your payment method details</li>
    <li>Ensure you have sufficient funds</li>
    <li>Contact your bank if there are any restrictions</li>
</ul>

<p><a href="{{retryLink}}">Retry Payment</a></p>

<p>If you continue to experience issues, please contact us at {{common.supportEmail}}.</p>

<p>Best regards,<br>The JVS Team</p>`,
    samplePayload: {
      user: { firstName: 'Taylor', lastName: 'Brown', email: 'taylor.brown@example.com' },
      event: { title: 'Sustainable Fashion Workshop', date: 'April 20, 2025', location: 'JVS Community Hall - Main Location' },
      booking: { id: 'BK-2025-003', total: '£15.00' },
      payment: { error: 'Your card was declined. Please check your card details and try again.' },
      retryLink: 'https://tickets.jvs.org.uk/retry-payment',
      common: { appName: 'JVS Events', appUrl: 'https://tickets.jvs.org.uk', supportEmail: 'support@jvs.org.uk' }
    }
  },
  {
    name: 'Refund Processed',
    mailType: 'refund_processed',
    subjects: { en: 'Your refund has been processed', he: 'החזר הכסף שלך עובד' },
    baseHtml: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Refund Processed</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #2196F3; }
        .logo { max-width: 200px; height: auto; }
        .content { padding: 20px 0; }
        .footer { text-align: center; padding: 20px 0; color: #666; font-size: 14px; }
        .details { background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .refund { background-color: #e3f2fd; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #2196F3; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://jvs.org.uk/wp-content/uploads/2024/01/JVS-Logo-2024.png" alt="JVS Logo" class="logo">
            <h1 style="color: #2196F3;">Refund Processed</h1>
        </div>
        
        <div class="content">
            <p>Dear {{user.firstName}} {{user.lastName}},</p>
            
            <p>Your refund has been successfully processed and will be credited to your original payment method.</p>
            
            <div class="refund">
                <h3>Refund Details:</h3>
                <p><strong>Refund ID:</strong> {{refund.id}}</p>
                <p><strong>Amount:</strong> {{refund.amount}}</p>
                <p><strong>Reason:</strong> {{refund.reason}}</p>
                <p><strong>Date Processed:</strong> {{refund.date}}</p>
            </div>
            
            <div class="details">
                <h3>Original Booking:</h3>
                <p><strong>Event:</strong> {{event.title}}</p>
                <p><strong>Date:</strong> {{event.date}}</p>
                <p><strong>Booking ID:</strong> {{booking.id}}</p>
            </div>
            
            <p>Please note that it may take 5-10 business days for the refund to appear in your account, depending on your bank or payment provider.</p>
            
            <p>If you have any questions about your refund, please contact us at {{common.supportEmail}}.</p>
            
            <p>Best regards,<br>The JVS Team</p>
        </div>
        
        <div class="footer">
            <p>Jewish Vegetarian Society<br>
            <a href="{{common.appUrl}}">{{common.appUrl}}</a></p>
        </div>
    </div>
</body>
</html>`,
    bodyHtml: `
<p>Dear {{user.firstName}} {{user.lastName}},</p>

<p>Your refund has been successfully processed and will be credited to your original payment method.</p>

<h3>Refund Details:</h3>
<ul>
    <li><strong>Refund ID:</strong> {{refund.id}}</li>
    <li><strong>Amount:</strong> {{refund.amount}}</li>
    <li><strong>Reason:</strong> {{refund.reason}}</li>
    <li><strong>Date Processed:</strong> {{refund.date}}</li>
</ul>

<h3>Original Booking:</h3>
<ul>
    <li><strong>Event:</strong> {{event.title}}</li>
    <li><strong>Date:</strong> {{event.date}}</li>
    <li><strong>Booking ID:</strong> {{booking.id}}</li>
</ul>

<p>Please note that it may take 5-10 business days for the refund to appear in your account, depending on your bank or payment provider.</p>

<p>If you have any questions about your refund, please contact us at {{common.supportEmail}}.</p>

<p>Best regards,<br>The JVS Team</p>`,
    samplePayload: {
      user: { firstName: 'Morgan', lastName: 'Garcia', email: 'morgan.garcia@example.com' },
      event: { title: 'Young JVS Meet-up', date: 'May 10, 2025' },
      booking: { id: 'BK-2025-004' },
      refund: { id: 'REF-2025-001', amount: '£8.00', reason: 'Event cancelled', date: 'March 26, 2025' },
      common: { appName: 'JVS Events', appUrl: 'https://tickets.jvs.org.uk', supportEmail: 'support@jvs.org.uk' }
    }
  },
  {
    name: 'Event Reminder',
    mailType: 'event_reminder',
    subjects: { en: 'Reminder: Your event is tomorrow!', he: 'תזכורת: האירוע שלך מחר!' },
    baseHtml: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Event Reminder</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #9C27B0; }
        .logo { max-width: 200px; height: auto; }
        .content { padding: 20px 0; }
        .footer { text-align: center; padding: 20px 0; color: #666; font-size: 14px; }
        .details { background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .reminder { background-color: #f3e5f5; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #9C27B0; }
        .bespoke-message { background-color: #fff3e0; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #FF9800; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://jvs.org.uk/wp-content/uploads/2024/01/JVS-Logo-2024.png" alt="JVS Logo" class="logo">
            <h1 style="color: #9C27B0;">Event Reminder</h1>
        </div>
        
        <div class="content">
            <p>Dear {{user.firstName}} {{user.lastName}},</p>
            
            <div class="reminder">
                <h3>⏰ Don't forget! Your event is tomorrow!</h3>
            </div>
            
            <div class="details">
                <h3>Event Details:</h3>
                <p><strong>Event:</strong> {{event.title}}</p>
                <p><strong>Date:</strong> {{event.date}}</p>
                <p><strong>Time:</strong> {{event.time}}</p>
                <p><strong>Location:</strong> {{event.location}}</p>
                <p><strong>Booking ID:</strong> {{booking.id}}</p>
                <p><strong>Tickets:</strong> {{booking.tickets}}</p>
            </div>
            
            {{#if event.bespoke.message}}
            <div class="bespoke-message">
                <h4>Important Information:</h4>
                <p>{{event.bespoke.message}}</p>
            </div>
            {{/if}}
            
            <p>Please remember to:</p>
            <ul>
                <li>Bring your confirmation email or booking ID</li>
                <li>Arrive 15 minutes before the event starts</li>
                <li>Check the weather and dress appropriately</li>
            </ul>
            
            <p>If you need to make any changes to your booking, please contact us as soon as possible.</p>
            
            <p>We look forward to seeing you!</p>
            
            <p>Best regards,<br>The JVS Team</p>
        </div>
        
        <div class="footer">
            <p>Jewish Vegetarian Society<br>
            <a href="{{common.appUrl}}">{{common.appUrl}}</a></p>
        </div>
    </div>
</body>
</html>`,
    bodyHtml: `
<p>Dear {{user.firstName}} {{user.lastName}},</p>

<div style="background-color: #f3e5f5; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #9C27B0;">
    <h3>⏰ Don't forget! Your event is tomorrow!</h3>
</div>

<h3>Event Details:</h3>
<ul>
    <li><strong>Event:</strong> {{event.title}}</li>
    <li><strong>Date:</strong> {{event.date}}</li>
    <li><strong>Time:</strong> {{event.time}}</li>
    <li><strong>Location:</strong> {{event.location}}</li>
    <li><strong>Booking ID:</strong> {{booking.id}}</li>
    <li><strong>Tickets:</strong> {{booking.tickets}}</li>
</ul>

{{#if event.bespoke.message}}
<div style="background-color: #fff3e0; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #FF9800;">
    <h4>Important Information:</h4>
    <p>{{event.bespoke.message}}</p>
</div>
{{/if}}

<p>Please remember to:</p>
<ul>
    <li>Bring your confirmation email or booking ID</li>
    <li>Arrive 15 minutes before the event starts</li>
    <li>Check the weather and dress appropriately</li>
</ul>

<p>If you need to make any changes to your booking, please contact us as soon as possible.</p>

<p>We look forward to seeing you!</p>

<p>Best regards,<br>The JVS Team</p>`,
    samplePayload: {
      user: { firstName: 'Riley', lastName: 'Miller', email: 'riley.miller@example.com' },
      event: { 
        title: 'Community Gardening Workshop', 
        date: 'March 15, 2025', 
        time: '2:00 PM', 
        location: 'JVS Garden Space',
        bespoke: { message: 'Please bring your own gardening gloves and wear clothes you don\'t mind getting dirty!' }
      },
      booking: { id: 'BK-2025-005', tickets: 1 },
      common: { appName: 'JVS Events', appUrl: 'https://tickets.jvs.org.uk', supportEmail: 'support@jvs.org.uk' }
    }
  },
  {
    name: 'Password Reset',
    mailType: 'password_reset',
    subjects: { en: 'Reset your password', he: 'אפס את הסיסמה שלך' },
    baseHtml: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #FF9800; }
        .logo { max-width: 200px; height: auto; }
        .content { padding: 20px 0; }
        .footer { text-align: center; padding: 20px 0; color: #666; font-size: 14px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #FF9800; color: white; text-decoration: none; border-radius: 4px; }
        .warning { background-color: #fff3e0; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #FF9800; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://jvs.org.uk/wp-content/uploads/2024/01/JVS-Logo-2024.png" alt="JVS Logo" class="logo">
            <h1 style="color: #FF9800;">Password Reset</h1>
        </div>
        
        <div class="content">
            <p>Dear {{user.firstName}} {{user.lastName}},</p>
            
            <p>We received a request to reset your password for your JVS account.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <p style="text-align: center;">
                <a href="{{resetLink}}" class="button">Reset Password</a>
            </p>
            
            <div class="warning">
                <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
                <p>If you didn't request this password reset, please ignore this email or contact us immediately.</p>
            </div>
            
            <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
            <p>{{resetLink}}</p>
            
            <p>Best regards,<br>The JVS Team</p>
        </div>
        
        <div class="footer">
            <p>Jewish Vegetarian Society<br>
            <a href="{{common.appUrl}}">{{common.appUrl}}</a></p>
        </div>
    </div>
</body>
</html>`,
    bodyHtml: `
<p>Dear {{user.firstName}} {{user.lastName}},</p>

<p>We received a request to reset your password for your JVS account.</p>

<p>Click the link below to reset your password:</p>

<p><a href="{{resetLink}}">Reset Password</a></p>

<p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>

<p>If you didn't request this password reset, please ignore this email or contact us immediately.</p>

<p>If the link above doesn't work, you can copy and paste this URL into your browser:</p>
<p>{{resetLink}}</p>

<p>Best regards,<br>The JVS Team</p>`,
    samplePayload: {
      user: { firstName: 'Avery', lastName: 'Davis', email: 'avery.davis@example.com' },
      resetLink: 'https://tickets.jvs.org.uk/reset-password?token=abc123def456',
      common: { appName: 'JVS Events', appUrl: 'https://tickets.jvs.org.uk', supportEmail: 'support@jvs.org.uk' }
    }
  },
  {
    name: 'Booking Cancellation',
    mailType: 'booking_cancellation',
    subjects: { en: 'Your booking has been cancelled', he: 'הזמנתך בוטלה' },
    baseHtml: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Cancellation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #f44336; }
        .logo { max-width: 200px; height: auto; }
        .content { padding: 20px 0; }
        .footer { text-align: center; padding: 20px 0; color: #666; font-size: 14px; }
        .details { background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .cancellation { background-color: #ffebee; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #f44336; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://jvs.org.uk/wp-content/uploads/2024/01/JVS-Logo-2024.png" alt="JVS Logo" class="logo">
            <h1 style="color: #f44336;">Booking Cancelled</h1>
        </div>
        
        <div class="content">
            <p>Dear {{user.firstName}} {{user.lastName}},</p>
            
            <div class="cancellation">
                <h3>❌ Your booking has been cancelled</h3>
                <p><strong>Reason:</strong> {{cancellation.reason}}</p>
                <p><strong>Cancelled by:</strong> {{cancellation.cancelledBy}}</p>
                <p><strong>Date:</strong> {{cancellation.date}}</p>
            </div>
            
            <div class="details">
                <h3>Cancelled Booking Details:</h3>
                <p><strong>Event:</strong> {{event.title}}</p>
                <p><strong>Date:</strong> {{event.date}}</p>
                <p><strong>Location:</strong> {{event.location}}</p>
                <p><strong>Booking ID:</strong> {{booking.id}}</p>
                <p><strong>Tickets:</strong> {{booking.tickets}}</p>
                <p><strong>Total Amount:</strong> {{booking.total}}</p>
            </div>
            
            <p><strong>Refund Information:</strong></p>
            <ul>
                <li>Your refund will be processed automatically</li>
                <li>Refund amount: {{refund.amount}}</li>
                <li>Processing time: 5-10 business days</li>
                <li>You will receive a separate refund confirmation email</li>
            </ul>
            
            <p>If you did not request this cancellation or have any questions, please contact us immediately at {{common.supportEmail}}.</p>
            
            <p>We hope to see you at future events!</p>
            
            <p>Best regards,<br>The JVS Team</p>
        </div>
        
        <div class="footer">
            <p>Jewish Vegetarian Society<br>
            <a href="{{common.appUrl}}">{{common.appUrl}}</a></p>
        </div>
    </div>
</body>
</html>`,
    bodyHtml: `
<p>Dear {{user.firstName}} {{user.lastName}},</p>

<div style="background-color: #ffebee; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #f44336;">
    <h3>❌ Your booking has been cancelled</h3>
    <p><strong>Reason:</strong> {{cancellation.reason}}</p>
    <p><strong>Cancelled by:</strong> {{cancellation.cancelledBy}}</p>
    <p><strong>Date:</strong> {{cancellation.date}}</p>
</div>

<h3>Cancelled Booking Details:</h3>
<ul>
    <li><strong>Event:</strong> {{event.title}}</li>
    <li><strong>Date:</strong> {{event.date}}</li>
    <li><strong>Location:</strong> {{event.location}}</li>
    <li><strong>Booking ID:</strong> {{booking.id}}</li>
    <li><strong>Tickets:</strong> {{booking.tickets}}</li>
    <li><strong>Total Amount:</strong> {{booking.total}}</li>
</ul>

<p><strong>Refund Information:</strong></p>
<ul>
    <li>Your refund will be processed automatically</li>
    <li>Refund amount: {{refund.amount}}</li>
    <li>Processing time: 5-10 business days</li>
    <li>You will receive a separate refund confirmation email</li>
</ul>

<p>If you did not request this cancellation or have any questions, please contact us immediately at {{common.supportEmail}}.</p>

<p>We hope to see you at future events!</p>

<p>Best regards,<br>The JVS Team</p>`,
    samplePayload: {
      user: { firstName: 'Quinn', lastName: 'Rodriguez', email: 'quinn.rodriguez@example.com' },
      event: { title: 'Theater Evening with Assigned Seating', date: 'June 5, 2025', location: 'JVS Community Hall - Main Location' },
      booking: { id: 'BK-2025-006', tickets: 2, total: '£45.00' },
      cancellation: { reason: 'Event cancelled by organizer', cancelledBy: 'Admin', date: 'March 26, 2025' },
      refund: { amount: '£45.00' },
      common: { appName: 'JVS Events', appUrl: 'https://tickets.jvs.org.uk', supportEmail: 'support@jvs.org.uk' }
    }
  }
];

async function seedEmailTemplates() {
  console.log('🌱 Starting modern email template seeding...\n');

  try {
    // First, delete all existing templates to ensure clean slate
    const deletedCount = await prisma.emailTemplate.deleteMany();
    console.log(`🗑️  Cleared ${deletedCount.count} existing templates\n`);

    // Create all templates
    let createdCount = 0;
    for (const template of emailTemplates) {
      const createdTemplate = await prisma.emailTemplate.create({
        data: {
          name: template.name,
          mailType: template.mailType,
          subjects: template.subjects,
          baseHtml: template.baseHtml,
          bodyHtml: template.bodyHtml,
          samplePayload: template.samplePayload,
          isActive: true
        }
      });

      console.log(`✅ Created template: ${template.name} (${template.mailType})`);
      createdCount++;
    }

    console.log(`\n🎉 Email template seeding completed successfully! Created ${createdCount} templates.`);

    // Verify all templates were created
    const allTemplates = await prisma.emailTemplate.findMany();
    console.log('\n📋 Email Templates Summary:');
    allTemplates.forEach(template => {
      console.log(`  • ${template.name} (${template.mailType}) - ${template.isActive ? 'Active' : 'Inactive'}`);
    });

    console.log('\n🆕 New Features in Templates:');
    console.log('  • Updated with modern token: {{event.bespoke.message}}');
    console.log('  • Anonymized sample data using generic names');
    console.log('  • Updated URLs to tickets.jvs.org.uk');
    console.log('  • Improved HTML styling and structure');
    console.log('  • Added Payment Link template for Stripe payments');

  } catch (error) {
    console.error('❌ Error seeding email templates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedEmailTemplates()
  .then(() => {
    console.log('✅ Email template seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Email template seeding failed:', error);
    process.exit(1);
  });











