import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { getAdminServerSideProps } from "../../../../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../../../../constants/interfaces";
import { AdminLayout } from "../../../../../components/admin/layout";
import TemplateEditor from "../../../../../components/admin/email/templates/TemplateEditor";
import TemplatePreviewModal from "../../../../../components/admin/email/templates/TemplatePreviewModal";
import { getTemplate, updateTemplate } from "../../../../../lib/api/email";
import { EmailTemplate } from "../../../../../lib/api/email";

export default function EditTemplatePage({ permissionDenied }) {
    const router = useRouter();
    const { id } = router.query;
    const [template, setTemplate] = useState<EmailTemplate | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    useEffect(() => {
        if (id && typeof id === "string") {
            loadTemplate(id);
        }
    }, [id]);

    const loadTemplate = async (templateId: string) => {
        try {
            setIsLoading(true);
            const templateData = await getTemplate(templateId);
            setTemplate(templateData);
        } catch (error) {
            console.error("Failed to load template:", error);
            setError("Failed to load template");
        } finally {
            setIsLoading(false);
        }
    };

    if (permissionDenied) {
        return <div>Access denied</div>;
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error || !template) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error || "Template not found"}</p>
                    <button
                        onClick={() => router.push('/admin/email?tab=templates')}
                        className="text-indigo-600 hover:text-indigo-800"
                    >
                        ← Back to templates
                    </button>
                </div>
            </div>
        );
    }

    const handleSave = async (data: Partial<EmailTemplate>) => {
        try {
            await updateTemplate(template.id!, data);
            router.push('/admin/email?tab=templates');
        } catch (error) {
            console.error("Failed to update template:", error);
            throw error;
        }
    };

    const handleCancel = () => {
        router.push('/admin/email?tab=templates');
    };

    const handleSendTest = async (to: string, template: EmailTemplate) => {
        try {
            console.log('handleSendTest called with template:', template);
            console.log('template.id:', template.id);
            console.log('template.mailType:', template.mailType);
            
            const payload = {
                to,
                templateId: template.id,
                locale: 'en', // Default to English for test emails
                payload: template.samplePayload ? JSON.parse(template.samplePayload) : undefined
            };
            
            console.log('Sending payload to API:', payload);
            
            // Use the existing test email API
            const response = await fetch('/api/admin/email/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Failed to send test email');
            }

            // Show success message (you could add a toast notification here)
            alert('Test email sent successfully!');
        } catch (error) {
            console.error('Failed to send test email:', error);
            alert('Failed to send test email: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    };

    const handlePreview = async (data: Partial<EmailTemplate>) => {
        console.log('handlePreview called with data:', data);
        console.log('template:', template);
        
        // Create a preview template with the current form data
        // Explicitly preserve the id field from the original template
        const previewData: EmailTemplate = {
            ...template!,
            ...data,
            id: template!.id // Ensure id is preserved
        };
        
        console.log('previewData created:', previewData);
        setPreviewTemplate(previewData);
        setIsPreviewOpen(true);
    };

    return (
        <AdminLayout permissionDenied={permissionDenied}>
            <TemplateEditor
                template={template}
                onSave={handleSave}
                onCancel={handleCancel}
                onPreview={handlePreview}
            />

            {/* Preview Modal */}
            {previewTemplate && (
                <TemplatePreviewModal
                    template={previewTemplate}
                    isOpen={isPreviewOpen}
                    onClose={() => {
                        setIsPreviewOpen(false);
                        setPreviewTemplate(null);
                    }}
                    onSendTest={handleSendTest}
                />
            )}
        </AdminLayout>
    );
}

export const getServerSideProps = (context) => getAdminServerSideProps(context, undefined, {
    permission: PermissionSection.EmailManagement,
    permissionType: PermissionType.Write
});
