import { NextApiRequest, NextApiResponse } from "next";
import { serverAuthenticate } from "../../../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../../../constants/interfaces";
import { z } from "zod";
import { emailService } from "../../../../lib/services/emailService";

const settingsSchema = z.object({
    transportMode: z.enum(["smtp", "provider"]),
    smtpHost: z.string().optional(),
    smtpPort: z.number().min(1).max(65535).optional(),
    smtpSecure: z.boolean().optional(),
    smtpUser: z.string().optional(),
    smtpPassword: z.string().optional(),
    providerName: z.string().optional(),
    providerUser: z.string().optional(),
    providerPassword: z.string().optional(),
    senderEmail: z.string().email("Must be a valid email address"),
    senderName: z.string().optional(),
    bccEmail: z.string().email().optional().or(z.literal("")),
    appBaseUrl: z.string().url("Must be a valid URL")
}).refine((data) => {
    if (data.transportMode === "smtp") {
        return data.smtpHost && data.smtpPort && data.smtpUser && data.smtpPassword;
    }
    if (data.transportMode === "provider") {
        return data.providerName && data.providerUser && data.providerPassword;
    }
    return true;
}, {
    message: "Configuration is required for selected mode",
    path: ["transportMode"],
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        // Authenticate and check permissions
        const session = await serverAuthenticate(req, res, {
            permission: PermissionSection.EmailManagement,
            permissionType: req.method === "GET" ? PermissionType.Read : PermissionType.Write
        });
        if (!session) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (req.method === "GET") {
            const settings = await emailService.getSettings();
            
            if (!settings) {
                // Return default settings if none exist
                const defaultSettings = {
                    transportMode: "smtp" as const,
                    smtpHost: process.env.EMAIL_HOST || "",
                    smtpPort: parseInt(process.env.EMAIL_PORT || "587"),
                    smtpSecure: process.env.EMAIL_SECURE === "true",
                    smtpUser: process.env.EMAIL_USER || "",
                    smtpPassword: process.env.EMAIL_PASS || "",
                    senderEmail: process.env.EMAIL_SENDER || "noreply@jvs.org.uk",
                    senderName: process.env.EMAIL_SENDER_NAME || "Tessera",
                    bccEmail: process.env.EMAIL_BCC || "",
                    appBaseUrl: process.env.APP_BASE_URL || "https://tessera.jvs.org.uk"
                };
                
                return res.status(200).json(defaultSettings);
            }
            
            return res.status(200).json(settings);
        }

        if (req.method === "PUT") {
            console.log("Received email settings data:", req.body);
            
            try {
                const validatedData = settingsSchema.parse(req.body);
                console.log("Validated email settings:", validatedData);
            
            // Get admin user ID for tracking who updated the settings
            const adminUserId = session.id ? parseInt(session.id) : undefined;
            
            const updatedSettings = await emailService.updateSettings(validatedData, adminUserId);
            
            return res.status(200).json({ 
                message: "Settings updated successfully",
                settings: updatedSettings
            });
            } catch (validationError) {
                console.error("Validation error:", validationError);
                if (validationError instanceof z.ZodError) {
                    return res.status(400).json({ 
                        error: "Validation failed", 
                        details: validationError.issues 
                    });
                }
                throw validationError;
            }
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (error) {
        console.error("Email settings API error:", error);
        
        if (error instanceof z.ZodError) {
            return res.status(400).json({ 
                error: "Validation failed", 
                details: error.issues 
            });
        }

        return res.status(500).json({ error: "Internal server error" });
    }
}
