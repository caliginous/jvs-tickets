-- Seed the waitlist_offer email template.
-- This template is used when a waitlist offer is created and the user
-- needs to be notified that tickets are available for them to claim.

INSERT INTO "EmailTemplate" (
    "id",
    "name",
    "mailType",
    "subjects",
    "baseHtml",
    "bodyHtml",
    "samplePayload",
    "isActive",
    "createdAt",
    "updatedAt"
) VALUES (
    gen_random_uuid(),
    'Waitlist Offer - Tickets Available',
    'waitlist_offer',

    -- subjects (JSON, keyed by locale)
    '{"en": "Tickets now available – complete your booking within 2 hours"}',

    -- baseHtml (outer wrapper)
    '<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tickets Available</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
<!-- Header -->
<tr><td style="background-color:#2c5aa0;padding:28px 32px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">{{common.appName}}</h1>
</td></tr>
<!-- Body -->
<tr><td style="padding:32px;">
{{content}}
</td></tr>
<!-- Footer -->
<tr><td style="background-color:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
<p style="margin:0;font-size:12px;color:#9ca3af;">This is an automated message from {{common.appName}}.</p>
<p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">If you did not join a waitlist, you can safely ignore this email.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>',

    -- bodyHtml (inner content with placeholders)
    '<h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Good news, {{user.firstName}}!</h2>

<p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
Tickets have become available for the event you were waiting for. Your place is reserved for the next <strong>{{offer.expiryMinutes}} minutes</strong>.
</p>

<!-- Event details card -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:8px;margin:0 0 24px;">
<tr><td style="padding:20px 24px;">
<p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Event Details</p>
<p style="margin:0 0 4px;font-size:16px;font-weight:600;color:#111827;">{{event.title}}</p>
<p style="margin:0 0 4px;font-size:14px;color:#4b5563;">{{event.date}} at {{event.time}}</p>
<p style="margin:0 0 12px;font-size:14px;color:#4b5563;">{{event.location}}</p>
<table role="presentation" cellpadding="0" cellspacing="0">
<tr>
<td style="padding-right:24px;">
<p style="margin:0;font-size:12px;color:#6b7280;">Ticket type</p>
<p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#111827;">{{offer.ticketType}}</p>
</td>
<td>
<p style="margin:0;font-size:12px;color:#6b7280;">Quantity</p>
<p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#111827;">{{offer.quantity}}</p>
</td>
</tr>
</table>
</td></tr>
</table>

<!-- Urgency notice -->
<div style="background-color:#fef3c7;border-left:4px solid #f59e0b;border-radius:0 6px 6px 0;padding:12px 16px;margin:0 0 24px;">
<p style="margin:0;font-size:14px;color:#92400e;font-weight:500;">
⏱ This offer expires at <strong>{{offer.expiresAt}}</strong>. After that, your reserved place will be released to the next person on the waitlist.
</p>
</div>

<!-- CTA button -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
<tr><td align="center">
<a href="{{offer.claimLink}}" style="display:inline-block;background-color:#2c5aa0;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:6px;">
Complete Your Booking
</a>
</td></tr>
</table>

<p style="margin:0 0 8px;font-size:13px;color:#6b7280;text-align:center;">
Or copy and paste this link into your browser:
</p>
<p style="margin:0 0 20px;font-size:13px;color:#2c5aa0;text-align:center;word-break:break-all;">
{{offer.claimLink}}
</p>

<p style="margin:0;font-size:14px;color:#6b7280;line-height:1.5;">
If you no longer wish to attend, simply let this offer expire and your place will be offered to someone else on the waitlist.
</p>',

    -- samplePayload (JSON for template preview)
    '{"user":{"firstName":"Sarah","lastName":"Cohen","email":"sarah@example.com"},"event":{"title":"Rosh Hashanah Community Dinner","date":"Sunday, 14 September 2026","time":"18:30","location":"JVS Community Hall"},"offer":{"ticketType":"Standard","quantity":2,"expiresAt":"19:00","claimLink":"https://tickets.jvs.org.uk/waitlist/claim/abc123","expiryMinutes":30},"common":{"appName":"JVS Events","appUrl":"https://tickets.jvs.org.uk","supportEmail":"support@jvs.org.uk"}}',

    true,
    NOW(),
    NOW()
)
ON CONFLICT DO NOTHING;
