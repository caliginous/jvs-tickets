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
      user: { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
      common: { appName: 'JVS Events', appUrl: 'https://jvs.org.uk', supportEmail: 'support@jvs.org.uk' }
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
                <p><strong>Seats:</strong> {{booking.seats}}</p>
                <p><strong>Total:</strong> {{booking.total}}</p>
            </div>
            
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
    <li><strong>Seats:</strong> {{booking.seats}}</li>
    <li><strong>Total:</strong> {{booking.total}}</li>
</ul>

<p>Please bring this confirmation email with you on the day of the event.</p>

<p>If you have any questions, please contact us at {{common.supportEmail}}.</p>

<p>We look forward to seeing you!</p>

<p>Best regards,<br>The JVS Team</p>`,
    samplePayload: {
      user: { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
      event: { title: 'Rosh Hashanah Dinner', date: 'September 15, 2025', location: 'JVS Community Hall', description: 'Join us for a special Rosh Hashanah celebration' },
      booking: { id: 'BK-2025-001', seats: 2, total: '£45.00', status: 'confirmed' },
      common: { appName: 'JVS Events', appUrl: 'https://jvs.org.uk', supportEmail: 'support@jvs.org.uk' }
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
            
            <p><a href="{{retryLink}}" class="button">Retry Payment</a></p>
            
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
      user: { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
      event: { title: 'Rosh Hashanah Dinner', date: 'September 15, 2025', location: 'JVS Community Hall' },
      booking: { id: 'BK-2025-001', total: '£45.00' },
      payment: { error: 'Insufficient funds' },
      retryLink: 'https://jvs.org.uk/retry-payment',
      common: { appName: 'JVS Events', appUrl: 'https://jvs.org.uk', supportEmail: 'support@jvs.org.uk' }
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
      user: { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
      event: { title: 'Rosh Hashanah Dinner', date: 'September 15, 2025' },
      booking: { id: 'BK-2025-001' },
      refund: { id: 'REF-2025-001', amount: '£45.00', reason: 'Event cancelled', date: 'August 26, 2025' },
      common: { appName: 'JVS Events', appUrl: 'https://jvs.org.uk', supportEmail: 'support@jvs.org.uk' }
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
                <p><strong>Seats:</strong> {{booking.seats}}</p>
            </div>
            
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
    <li><strong>Seats:</strong> {{booking.seats}}</li>
</ul>

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
      user: { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
      event: { title: 'Rosh Hashanah Dinner', date: 'September 15, 2025', time: '7:00 PM', location: 'JVS Community Hall' },
      booking: { id: 'BK-2025-001', seats: 2 },
      common: { appName: 'JVS Events', appUrl: 'https://jvs.org.uk', supportEmail: 'support@jvs.org.uk' }
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
      user: { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
      resetLink: 'https://jvs.org.uk/reset-password?token=abc123def456',
      common: { appName: 'JVS Events', appUrl: 'https://jvs.org.uk', supportEmail: 'support@jvs.org.uk' }
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
                <p><strong>Seats:</strong> {{booking.seats}}</p>
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
    <li><strong>Seats:</strong> {{booking.seats}}</li>
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
      user: { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
      event: { title: 'Rosh Hashanah Dinner', date: 'September 15, 2025', location: 'JVS Community Hall' },
      booking: { id: 'BK-2025-001', seats: 2, total: '£45.00' },
      cancellation: { reason: 'Event cancelled by organizer', cancelledBy: 'Admin', date: 'August 26, 2025' },
      refund: { amount: '£45.00' },
      common: { appName: 'JVS Events', appUrl: 'https://jvs.org.uk', supportEmail: 'support@jvs.org.uk' }
    }
  }
];

async function seedEmailTemplates() {
  console.log('🌱 Starting email template seeding...\n');

  try {
    // First, delete all existing templates to ensure clean slate
    await prisma.emailTemplate.deleteMany();
    console.log('🗑️  Cleared existing templates\n');

    // Create all templates
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
    }

    console.log('\n🎉 Email template seeding completed successfully!');

    // Verify all templates were created
    const allTemplates = await prisma.emailTemplate.findMany();
    console.log('\n📋 Email Templates Summary:');
    allTemplates.forEach(template => {
      console.log(`  • ${template.name} (${template.mailType}) - ${template.isActive ? 'Active' : 'Inactive'}`);
    });

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
    console.log('✅ Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
