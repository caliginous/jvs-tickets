import { NextApiRequest, NextApiResponse } from "next";
import { serverAuthenticate } from "../../../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../../../constants/interfaces";
import { z } from "zod";
import { emailService } from "../../../../lib/services/emailService";

const testEmailSchema = z.object({
    to: z.string().email(),
    templateId: z.string().optional(),
    locale: z.string().min(2).max(5),
    payload: z.record(z.string(), z.any()).optional()
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        // Authenticate and check permissions
        const session = await serverAuthenticate(req, res, {
            permission: PermissionSection.EmailManagement,
            permissionType: PermissionType.Write
        });
        if (!session) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Validate request body
        const validatedData = testEmailSchema.parse(req.body);
        const { to, templateId, locale, payload } = validatedData;

        // Test database connection
        try {
            await emailService.getSettings();
            console.log("Database connection successful");
        } catch (dbError) {
            console.error("Database connection failed:", dbError);
            return res.status(500).json({ error: "Database connection failed" });
        }

        // Load the email template if templateId is provided
        let template = null;
        if (templateId) {
            try {
                template = await emailService.getTemplate(templateId);
                if (!template) {
                    return res.status(404).json({ error: "Template not found" });
                }
            } catch (error) {
                console.error("Failed to load template:", error);
                return res.status(500).json({ error: "Failed to load template" });
            }
        }

        // Prepare email content
        let subject = "Test Email";
        let htmlContent = "";
        
        if (template) {
            // Use template content
            subject = template.subjects[locale] || template.subjects.en || "Test Email";
            
            // Render template with sample data or payload
            const { renderCompleteEmail, generateSampleData } = await import("../../../../lib/templateRenderer");
            
            if (payload) {
                // Use provided payload data
                const rendered = await renderCompleteEmail(subject, template.bodyHtml || template.baseHtml || "", payload);
                subject = rendered.subject;
                htmlContent = template.baseHtml.replace('{{content}}', rendered.body);
            } else {
                // Use sample data for testing
                const sampleData = generateSampleData();
                const rendered = await renderCompleteEmail(subject, template.bodyHtml || template.baseHtml || "", sampleData);
                subject = rendered.subject;
                htmlContent = template.baseHtml.replace('{{content}}', rendered.body);
            }
        } else {
            // Raw email without template
            htmlContent = `
                <html>
                <body>
                    <h1>Test Email</h1>
                    <p>This is a test email sent from the Tessera admin panel.</p>
                    <p>Timestamp: ${new Date().toISOString()}</p>
                    ${payload ? `<pre>${JSON.stringify(payload, null, 2)}</pre>` : ''}
                </body>
                </html>
            `;
        }

        console.log("Sending test email:", {
            to,
            templateId,
            locale,
            payload,
            subject,
            timestamp: new Date().toISOString()
        });

        // Send the actual email
        let messageId;
        try {
    
            
            // Get email settings from database
            const emailSettings = await emailService.getSettings();
            console.log("Using email settings from database:", {
                transportMode: emailSettings.transportMode,
                smtpHost: emailSettings.smtpHost
            });
            
            // Send email using Mailgun API
            const { mailgunService } = await import('../../../../lib/services/mailgunService');
            
            const mailgunResult = await mailgunService.sendEmailWithFallback({
                from: emailSettings.senderName || "Tessera Admin",
                fromEmail: emailSettings.senderEmail,
                to: to,
                subject: subject,
                html: htmlContent,
                replyTo: emailSettings.senderEmail
            });

            if (!mailgunResult.success) {
                throw new Error(mailgunResult.error || 'Mailgun email failed');
            }

            messageId = mailgunResult.messageId;
            
            console.log("Email sent successfully:", {
                messageId: mailgunResult.messageId
            });
        } catch (emailError) {
            console.error("Failed to send email:", emailError);
            return res.status(500).json({ 
                error: "Failed to send email", 
                details: emailError instanceof Error ? emailError.message : "Unknown error"
            });
        }

        // Log the test email attempt
        console.log("Session data:", session);
        
        // Only try to create email test record if templateId exists and is valid
        if (templateId) {
            try {
                // Verify template exists before creating test record
                const template = await emailService.getTemplate(templateId);
                if (!template) {
                    console.warn(`Template ${templateId} not found, skipping test record creation`);
                } else {
                    console.log("Creating email test with data:", {
                        templateId: templateId,
                        testEmail: to,
                        testPayload: payload,
                        locale: locale,
                        success: true,
                        messageId: messageId,
                        testedBy: session.id ? parseInt(session.id) : undefined
                    });
                    
                    await emailService.createEmailTest({
                        templateId: templateId,
                        testEmail: to,
                        testPayload: payload,
                        locale: locale,
                        success: true,
                        messageId: messageId,
                        testedBy: session.id ? parseInt(session.id) : undefined
                    });
                }
            } catch (dbError) {
                console.error("Database error creating email test:", dbError);
                // Continue with the test email even if logging fails
            }
        } else {
            console.log("No templateId provided, skipping test record creation");
        }

        // In a real implementation, you would:
        // 1. Load the template if templateId is provided
        // 2. Merge the template with the payload
        // 3. Send the email using the configured transport
        // 4. Return the actual message ID from the email service

        return res.status(200).json({
            success: true,
            message: "Test email sent successfully",
            messageId,
            to,
            locale,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("Test email API error:", error);
        
        if (error instanceof z.ZodError) {
            return res.status(400).json({ 
                error: "Validation failed", 
                details: error.issues 
            });
        }

        return res.status(500).json({ error: "Failed to send test email" });
    }
}
