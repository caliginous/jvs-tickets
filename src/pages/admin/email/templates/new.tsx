import { useRouter } from "next/router";
import { useState } from "react";
import { getAdminServerSideProps } from "../../../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../../../constants/interfaces";
import { AdminLayout } from "../../../../components/admin/layout";
import TemplateEditor from "../../../../components/admin/email/templates/TemplateEditor";
import TemplatePreviewModal from "../../../../components/admin/email/templates/TemplatePreviewModal";
import { createTemplate } from "../../../../lib/api/email";
import { EmailTemplate } from "../../../../lib/api/email";

export default function NewTemplatePage({ permissionDenied }) {
    const router = useRouter();
    const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    if (permissionDenied) {
        return <div>Access denied</div>;
    }

    const handleSave = async (data: Omit<EmailTemplate, 'id'>) => {
        try {
            await createTemplate(data);
            router.push('/admin/email?tab=templates');
        } catch (error) {
            console.error("Failed to create template:", error);
            throw error;
        }
    };

    const handleCancel = () => {
        router.push('/admin/email?tab=templates');
    };

    const handlePreview = async (data: Omit<EmailTemplate, 'id'>) => {
        // Create a preview template with the current form data
        const previewData: EmailTemplate = {
            id: 'preview', // Temporary ID for preview
            ...data
        };
        setPreviewTemplate(previewData);
        setIsPreviewOpen(true);
    };

    return (
        <AdminLayout permissionDenied={permissionDenied}>
            <TemplateEditor
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
                />
            )}
        </AdminLayout>
    );
}

export const getServerSideProps = (context) => getAdminServerSideProps(context, undefined, {
    permission: PermissionSection.EmailManagement,
    permissionType: PermissionType.Write
});
