import { NextApiRequest, NextApiResponse } from 'next';
import { emailTriggerService } from '../../../lib/services/emailTriggerService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('⏰ [CRON] Starting event reminder job');
    
    // Verify the request has the correct secret
    const authHeader = req.headers.authorization;
    const expectedSecret = process.env.CRON_SECRET;
    
    if (!expectedSecret) {
      console.error('❌ [CRON] CRON_SECRET not configured');
      return res.status(500).json({
        error: 'Cron secret not configured'
      });
    }
    
    if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
      console.error('❌ [CRON] Invalid authorization header');
      return res.status(401).json({
        error: 'Invalid authorization'
      });
    }
    
    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    console.log('📅 [CRON] Looking for events on:', tomorrowStr);
    
    // In a real implementation, you would query your database for events tomorrow
    // For now, we'll simulate this with some example data
    const eventsTomorrow = [
      {
        id: 'event-1',
        title: 'Rosh Hashanah Dinner',
        date: tomorrowStr,
        time: '7:00 PM',
        location: 'JVS Community Hall, 123 Main Street, London',
        bookings: [
          {
            id: 'booking-1',
            userEmail: 'john.doe@example.com',
            userFirstName: 'John',
            userLastName: 'Doe',
            seats: 2
          }
        ]
      }
    ];
    
    let emailsSent = 0;
    let emailsFailed = 0;
    
    // Send reminder emails for each event
    for (const event of eventsTomorrow) {
      for (const booking of event.bookings) {
        try {
          console.log(`📧 [CRON] Sending reminder for ${event.title} to ${booking.userEmail}`);
          
          const emailResult = await emailTriggerService.sendEventReminder({
            userEmail: booking.userEmail,
            userFirstName: booking.userFirstName,
            userLastName: booking.userLastName,
            eventTitle: event.title,
            eventDate: event.date,
            eventTime: event.time,
            eventLocation: event.location,
            bookingId: booking.id,
            seats: booking.seats,
            locale: 'en'
          });
          
          if (emailResult.success) {
            emailsSent++;
            console.log(`✅ [CRON] Reminder sent successfully to ${booking.userEmail}`);
          } else {
            emailsFailed++;
            console.error(`❌ [CRON] Failed to send reminder to ${booking.userEmail}:`, emailResult.error);
          }
        } catch (error) {
          emailsFailed++;
          console.error(`❌ [CRON] Error sending reminder to ${booking.userEmail}:`, error);
        }
      }
    }
    
    console.log(`🎉 [CRON] Event reminder job completed. Sent: ${emailsSent}, Failed: ${emailsFailed}`);
    
    return res.status(200).json({
      success: true,
      message: 'Event reminder job completed',
      emailsSent,
      emailsFailed,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [CRON] Error in event reminder job:', error);
    return res.status(500).json({
      error: 'Event reminder job failed'
    });
  }
}
