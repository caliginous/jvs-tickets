// Email API fetchers for admin panel

export interface EmailSettings {
    senderEmail: string;
    senderName?: string;
    bccEmail?: string;
    appBaseUrl: string;
}

export interface EmailTemplate {
    id?: string;
    name: string;
    mailType: string;
    subjects: { [locale: string]: string };
    baseHtml: string;
    bodyHtml: string;
    samplePayload?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface PreviewPayload {
    locale: string;
    subjects: { [locale: string]: string };
    baseHtml: string;
    bodyHtml: string;
    payload?: any;
}

export interface TestEmailPayload {
    to: string;
    templateId?: string;
    locale: string;
    payload?: any;
}

// Settings
export async function getSettings(): Promise<EmailSettings> {
    const response = await fetch("/api/admin/email/settings");
    if (!response.ok) {
        throw new Error("Failed to fetch email settings");
    }
    return response.json();
}

export async function updateSettings(settings: EmailSettings): Promise<{ message: string; settings: EmailSettings }> {
    const response = await fetch("/api/admin/email/settings", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update email settings");
    }
    
    return response.json();
}

// Test Email
export async function sendTest(payload: TestEmailPayload): Promise<{ success: boolean; messageId: string }> {
    const response = await fetch("/api/admin/email/test", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send test email");
    }
    
    const result = await response.json();
    return {
        success: result.success,
        messageId: result.messageId
    };
}

// Templates
export async function listTemplates(query?: { search?: string; mailType?: string }): Promise<EmailTemplate[]> {
    const params = new URLSearchParams();
    if (query?.search) params.append("search", query.search);
    if (query?.mailType) params.append("mailType", query.mailType);
    
    const response = await fetch(`/api/admin/email/templates?${params.toString()}`);
    if (!response.ok) {
        throw new Error("Failed to fetch templates");
    }
    return response.json();
}

export async function getTemplate(id: string): Promise<EmailTemplate> {
    const response = await fetch(`/api/admin/email/templates/${id}`);
    if (!response.ok) {
        throw new Error("Failed to fetch template");
    }
    return response.json();
}

export async function createTemplate(template: Omit<EmailTemplate, "id">): Promise<EmailTemplate> {
    const response = await fetch("/api/admin/email/templates", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(template),
    });
    
    if (!response.ok) {
        throw new Error("Failed to create template");
    }
    
    return response.json();
}

export async function updateTemplate(id: string, template: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const response = await fetch(`/api/admin/email/templates/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(template),
    });
    
    if (!response.ok) {
        throw new Error("Failed to update template");
    }
    
    return response.json();
}

export async function deleteTemplate(id: string): Promise<{ success: boolean }> {
    const response = await fetch(`/api/admin/email/templates/${id}`, {
        method: "DELETE",
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete template");
    }
    
    return response.json();
}

export async function duplicateTemplate(id: string): Promise<EmailTemplate> {
    const template = await getTemplate(id);
    const duplicatedTemplate = {
        ...template,
        name: `${template.name} (Copy)`,
        id: undefined
    };
    
    return await createTemplate(duplicatedTemplate);
}

export async function exportTemplate(id: string): Promise<EmailTemplate> {
    return getTemplate(id);
}

// Preview
export async function previewTemplate(payload: PreviewPayload): Promise<{ html: string; subject: string; locale: string }> {
    const response = await fetch("/api/admin/email/templates/preview", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate preview");
    }
    
    const result = await response.json();
    return {
        html: result.html,
        subject: result.subject,
        locale: result.locale
    };
}
