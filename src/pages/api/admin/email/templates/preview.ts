import { NextApiRequest, NextApiResponse } from "next";
import { serverAuthenticate } from "../../../../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../../../../constants/interfaces";
import { z } from "zod";

const previewSchema = z.object({
    locale: z.string().min(2).max(5),
    subjects: z.record(z.string(), z.string()),
    baseHtml: z.string().min(1),
    bodyHtml: z.string(),
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
            permissionType: PermissionType.Read
        });
        if (!session) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Validate request body
        const validatedData = previewSchema.parse(req.body);
        const { locale, subjects, baseHtml, bodyHtml, payload } = validatedData;

        // Get subject for the specified locale
        const subject = subjects[locale];
        if (!subject) {
            return res.status(400).json({ 
                error: `No subject found for locale: ${locale}` 
            });
        }

        // Merge base template with body content
        let mergedHtml = baseHtml
            .replace("{{content}}", bodyHtml)
            .replace("{{subject}}", subject);

        // Replace tokens with payload data if provided
        if (payload) {
            const { renderEmailTemplate } = await import("../../../../../lib/templateRenderer");
            mergedHtml = await renderEmailTemplate(mergedHtml, payload);
        }

        // In a real implementation, you might also:
        // 1. Sanitize the HTML for security
        // 2. Apply email-specific optimizations
        // 3. Validate the final HTML structure

        return res.status(200).json({
            success: true,
            html: mergedHtml,
            subject,
            locale,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("Template preview API error:", error);
        
        if (error instanceof z.ZodError) {
            return res.status(400).json({ 
                error: "Validation failed", 
                details: error.issues 
            });
        }

        return res.status(500).json({ error: "Failed to generate preview" });
    }
}

function replaceTokens(html: string, payload: any): string {
    let result = html;
    
    // Replace user tokens
    if (payload.user) {
        result = result.replace(/\{\{user\.firstName\}\}/g, payload.user.firstName || "");
        result = result.replace(/\{\{user\.lastName\}\}/g, payload.user.lastName || "");
        result = result.replace(/\{\{user\.email\}\}/g, payload.user.email || "");
        result = result.replace(/\{\{user\.fullName\}\}/g, 
            `${payload.user.firstName || ""} ${payload.user.lastName || ""}`.trim());
    }
    
    // Replace event tokens
    if (payload.event) {
        result = result.replace(/\{\{event\.title\}\}/g, payload.event.title || "");
        result = result.replace(/\{\{event\.date\}\}/g, payload.event.date || "");
        result = result.replace(/\{\{event\.time\}\}/g, payload.event.time || "");
        result = result.replace(/\{\{event\.venue\}\}/g, payload.event.venue || "");
        result = result.replace(/\{\{event\.url\}\}/g, payload.event.url || "");
    }
    
    // Replace booking tokens
    if (payload.booking) {
        result = result.replace(/\{\{booking\.id\}\}/g, payload.booking.id || "");
        result = result.replace(/\{\{booking\.seats\}\}/g, payload.booking.seats || "");
        result = result.replace(/\{\{booking\.total\}\}/g, payload.booking.total || "");
        result = result.replace(/\{\{booking\.status\}\}/g, payload.booking.status || "");
        result = result.replace(/\{\{booking\.createdAt\}\}/g, payload.booking.createdAt || "");
    }
    
    // Replace common tokens
    if (payload.common) {
        result = result.replace(/\{\{common\.greeting\}\}/g, payload.common.greeting || "");
        result = result.replace(/\{\{common\.appName\}\}/g, payload.common.appName || "Tessera");
        result = result.replace(/\{\{common\.supportEmail\}\}/g, payload.common.supportEmail || "");
        result = result.replace(/\{\{common\.baseUrl\}\}/g, payload.common.baseUrl || "");
    }
    
    return result;
}
