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

        if (req.method === "GET") {
            const { search, mailType } = req.query;
            
            const searchTerm = typeof search === "string" ? search : undefined;
            const mailTypeFilter = typeof mailType === "string" ? mailType : undefined;
            
            const templates = await emailService.listTemplates(searchTerm, mailTypeFilter);
            
            return res.status(200).json(templates);
        }

        if (req.method === "POST") {
            const validatedData = templateSchema.parse(req.body);
            
            // Get admin user ID for tracking who created the template
            const adminUserId = session.id ? parseInt(session.id) : undefined;
            
            const newTemplate = await emailService.createTemplate(validatedData, adminUserId);
            
            return res.status(201).json(newTemplate);
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (error) {
        console.error("Templates API error:", error);
        
        if (error instanceof z.ZodError) {
            return res.status(400).json({ 
                error: "Validation failed", 
                details: error.issues 
            });
        }

        return res.status(500).json({ error: "Internal server error" });
    }
}
