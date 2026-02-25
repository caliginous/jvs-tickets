import { NextApiRequest, NextApiResponse } from "next";
import { EmailTriggerService } from "../../lib/services/emailTriggerService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const emailService = new EmailTriggerService();
    
    // Test with sample data
    const result = await emailService.sendBookingConfirmation({
      userEmail: "test@example.com",
      userFirstName: "John",
      userLastName: "Doe",
      eventTitle: "Test Event",
      eventDate: "2025-08-27",
      eventTime: "7:00 PM",
      eventLocation: "JVS Events",
      bookingId: "TEST-123",
      seats: 2,
      locale: "en"
    });

    if (result.success) {
      res.status(200).json({ 
        success: true, 
        message: "Test email sent successfully",
        result 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error("Test email error:", error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
}
