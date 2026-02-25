import { NextApiRequest, NextApiResponse } from "next";
import { serverAuthenticate } from "../../../../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../../../../constants/interfaces";
import { z } from "zod";
import { emailService } from "../../../../../lib/services/emailService";

const templateSchema = z.object({
    name: z.string().min(1),
    mailType: z.string().min(1),
    subjects: z.record(z.string(), z.string()),
    baseHtml: z.string().min(1),
    bodyHtml: z.string(),
    samplePayload: z.string().optional()
});

// Database service will handle all template operations

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

        const { id } = req.query;
        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "Template ID is required" });
        }

        if (req.method === "GET") {
            const template = await emailService.getTemplate(id);
            if (!template) {
                return res.status(404).json({ error: "Template not found" });
            }
            return res.status(200).json(template);
        }

        if (req.method === "PUT") {
            const validatedData = templateSchema.parse(req.body);
            
            // Get admin user ID for tracking who updated the template
            const adminUserId = session.id ? parseInt(session.id) : undefined;
            
            const updatedTemplate = await emailService.updateTemplate(id, validatedData, adminUserId);
            
            return res.status(200).json(updatedTemplate);
        }

        if (req.method === "DELETE") {
            await emailService.deleteTemplate(id);
            
            return res.status(200).json({ message: "Template deleted successfully" });
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (error) {
        console.error("Template API error:", error);
        
        if (error instanceof z.ZodError) {
            return res.status(400).json({ 
                error: "Validation failed", 
                details: error.issues 
            });
        }

        return res.status(500).json({ error: "Internal server error" });
    }
}
