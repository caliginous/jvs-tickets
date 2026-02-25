import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { getAdminServerSideProps } from "../../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../../constants/interfaces";
import { MailIcon, CogIcon, DocumentTextIcon } from "@heroicons/react/outline";
import { AdminLayout } from "../../../components/admin/layout";
import EmailSettingsForm from "../../../components/admin/email/settings/EmailSettingsForm";
import TestEmailPanel from "../../../components/admin/email/settings/TestEmailPanel";
import TemplateList from "../../../components/admin/email/templates/TemplateList";
import { listTemplates, deleteTemplate, duplicateTemplate, exportTemplate } from "../../../lib/api/email";
import { EmailTemplate } from "../../../lib/api/email";

export default function EmailAdmin({ permissionDenied }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState(router.query.tab || "settings");
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

    // Load templates when templates tab is active
    useEffect(() => {
        if (activeTab === "templates") {
            loadTemplates();
        }
    }, [activeTab]);

    const loadTemplates = async () => {
        setIsLoadingTemplates(true);
        try {
            const fetchedTemplates = await listTemplates();
            setTemplates(fetchedTemplates);
        } catch (error) {
            console.error("Failed to load templates:", error);
        } finally {
            setIsLoadingTemplates(false);
        }
    };

    const handleNewTemplate = () => {
        router.push('/admin/email/templates/new');
    };

    const handleEditTemplate = (id: string) => {
        router.push(`/admin/email/templates/${id}/edit`);
    };

    const handleDuplicateTemplate = async (id: string) => {
        try {
            await duplicateTemplate(id);
            loadTemplates(); // Reload to show the new template
        } catch (error) {
            console.error("Failed to duplicate template:", error);
        }
    };

    const handleExportTemplate = async (id: string) => {
        try {
            const template = await exportTemplate(id);
            // Create and download the JSON file
            const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${template.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to export template:", error);
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        try {
            await deleteTemplate(id);
            loadTemplates(); // Reload to remove the deleted template
        } catch (error) {
            console.error("Failed to delete template:", error);
        }
    };

    if (permissionDenied) {
        return <div>Access denied</div>;
    }

    const tabs = [
                        {
                    id: "settings",
                    name: "Settings",
                    icon: CogIcon,
                    description: "Configure email transport and sender settings"
                },
                {
                    id: "templates",
                    name: "Templates",
                    icon: DocumentTextIcon,
                    description: "Manage email templates and subjects"
                }
    ];

    return (
        <AdminLayout permissionDenied={permissionDenied}>
            <div className="max-w-6xl mx-auto p-6">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center space-x-3 mb-2">
                        <MailIcon className="w-8 h-8 text-indigo-600" />
                        <h1 className="text-3xl font-bold text-gray-900">Email Management</h1>
                    </div>
                    <p className="text-gray-600">
                        Configure email transport settings and manage transactional email templates
                    </p>
                </div>

            {/* Tabs */}
            <div className="mb-6">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        router.push(`/admin/email?tab=${tab.id}`, undefined, { shallow: true });
                                    }}
                                    className={`
                                        flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm
                                        ${isActive
                                            ? "border-indigo-600 text-indigo-700"
                                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                        }
                                    `}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span>{tab.name}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
                {activeTab === "settings" && (
                    <div className="space-y-6">
                        <div className="rounded-2xl border bg-white shadow-sm p-6">
                            <h2 className="text-xl font-semibold mb-4">Email Transport Settings</h2>
                            <EmailSettingsForm />
                        </div>
                        
                        <div className="rounded-2xl border bg-white shadow-sm p-6">
                            <h2 className="text-xl font-semibold mb-4">Test Email</h2>
                            <TestEmailPanel />
                        </div>
                    </div>
                )}

                                       {activeTab === "templates" && (
                           <div className="rounded-2xl border bg-white shadow-sm p-6">
                               {isLoadingTemplates ? (
                                   <div className="flex items-center justify-center py-8">
                                       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                   </div>
                               ) : (
                                   <TemplateList
                                       templates={templates}
                                       onNewTemplate={handleNewTemplate}
                                       onEditTemplate={handleEditTemplate}
                                       onDuplicateTemplate={handleDuplicateTemplate}
                                       onExportTemplate={handleExportTemplate}
                                       onDeleteTemplate={handleDeleteTemplate}
                                   />
                               )}
                           </div>
                       )}
            </div>
        </div>
        </AdminLayout>
    );
}

export const getServerSideProps = (context) => getAdminServerSideProps(context, undefined, {
    permission: PermissionSection.EmailManagement,
    permissionType: PermissionType.Read
});
