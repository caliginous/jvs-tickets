import { NextApiRequest, NextApiResponse } from "next";
import { EmailTriggerService } from "../../lib/services/emailTriggerService";
import { serverAuthenticate } from "../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../constants/interfaces";

/**
 * Admin-only test-email endpoint. Disabled in production unless explicitly enabled
 * by setting ENABLE_TEST_EMAIL=true. Requires admin auth with EmailManagement.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  if (process.env.NODE_ENV === "production" && process.env.ENABLE_TEST_EMAIL !== "true") {
    return res.status(404).end("Not found");
  }

  const actor = await serverAuthenticate(req, res, {
    permission: PermissionSection.EmailManagement,
    permissionType: PermissionType.Write,
  });
  if (!actor) return;

  try {
    const emailService = new EmailTriggerService();
    const recipient = typeof req.body?.recipient === "string" && req.body.recipient
      ? req.body.recipient
      : actor.email;

    const result = await emailService.sendBookingConfirmation({
      userEmail: recipient,
      userFirstName: "Test",
      userLastName: "User",
      eventTitle: "Test Event",
      eventDate: "2025-08-27",
      eventTime: "7:00 PM",
      eventLocation: "JVS Events",
      bookingId: "TEST-123",
      seats: 2,
      locale: "en",
    });

    if (result.success) {
      return res.status(200).json({ success: true });
    }
    return res.status(500).json({ success: false });
  } catch (error) {
    console.error("Test email error");
    return res.status(500).json({ success: false });
  }
}
