import { useState } from "react";
import { PlusIcon, PencilIcon, DuplicateIcon, DocumentDownloadIcon, TrashIcon, SearchIcon, EyeIcon } from "@heroicons/react/outline";
import { Button } from "../../../ui/Button";
import { Badge } from "../../../ui/Badge";
import { EmptyState } from "../../../ui/EmptyState";
import { EmailTemplate } from "../../../../lib/api/email";
import TemplatePreviewModal from "./TemplatePreviewModal";

interface TemplateListProps {
    templates?: EmailTemplate[];
    onNewTemplate?: () => void;
    onEditTemplate?: (id: string) => void;
    onDuplicateTemplate?: (id: string) => void;
    onExportTemplate?: (id: string) => void;
    onDeleteTemplate?: (id: string) => void;
}

export default function TemplateList({
    templates = [],
    onNewTemplate,
    onEditTemplate,
    onDuplicateTemplate,
    onExportTemplate,
    onDeleteTemplate
}: TemplateListProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const filteredTemplates = templates.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.mailType.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDelete = (id: string) => {
        if (onDeleteTemplate) {
            onDeleteTemplate(id);
            setDeleteConfirmId(null);
        }
    };

    const getLocalesString = (subjects: { [locale: string]: string }) => {
        const locales = Object.keys(subjects);
        if (locales.length === 0) return "None";
        if (locales.length <= 2) return locales.join(", ");
        return `${locales.length} locales`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    if (templates.length === 0) {
        return (
            <EmptyState
                title="No email templates yet"
                subtitle="Create your first template to start sending transactional emails."
                action={
                    <Button onClick={onNewTemplate} className="inline-flex items-center space-x-2">
                        <PlusIcon className="w-5 h-5" />
                        <span>New Template</span>
                    </Button>
                }
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with search and new button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <Button onClick={onNewTemplate} className="inline-flex items-center space-x-2">
                    <PlusIcon className="w-5 h-5" />
                    <span>New Template</span>
                </Button>
            </div>

            {/* Templates table */}
            <div className="overflow-hidden border border-gray-200 rounded-xl">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="text-left text-xs font-semibold uppercase text-gray-500 py-3 px-6">Name</th>
                            <th className="text-left text-xs font-semibold uppercase text-gray-500 py-3 px-6">Type</th>
                            <th className="text-left text-xs font-semibold uppercase text-gray-500 py-3 px-6">Locales</th>
                            <th className="text-left text-xs font-semibold uppercase text-gray-500 py-3 px-6">Updated</th>
                            <th className="text-left text-xs font-semibold uppercase text-gray-500 py-3 px-6">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredTemplates.map((template) => (
                            <tr key={template.id || 'new'} className="hover:bg-gray-50">
                                <td className="py-3 px-6 align-top">
                                    <div>
                                        <div className="font-medium text-gray-900">{template.name}</div>
                                    </div>
                                </td>
                                <td className="py-3 px-6 align-top">
                                    <Badge variant="secondary" className="capitalize">
                                        {template.mailType.replace(/_/g, " ")}
                                    </Badge>
                                </td>
                                <td className="py-3 px-6 align-top">
                                    <span className="text-gray-600">{getLocalesString(template.subjects)}</span>
                                </td>
                                <td className="py-3 px-6 align-top">
                                    <span className="text-gray-600">{formatDate(template.updatedAt)}</span>
                                </td>
                                <td className="py-3 px-6 align-top">
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => template.id && onEditTemplate?.(template.id)}
                                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                            title="Edit template"
                                            disabled={!template.id}
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setPreviewTemplate(template);
                                                setIsPreviewOpen(true);
                                            }}
                                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                            title="Preview template"
                                        >
                                            <EyeIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => template.id && onDuplicateTemplate?.(template.id)}
                                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                            title="Duplicate template"
                                            disabled={!template.id}
                                        >
                                            <DuplicateIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => template.id && onExportTemplate?.(template.id)}
                                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                            title="Export template"
                                            disabled={!template.id}
                                        >
                                            <DocumentDownloadIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => template.id && setDeleteConfirmId(template.id)}
                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete template"
                                            disabled={!template.id}
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Delete confirmation modal */}
            {deleteConfirmId && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Template</h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete this template? This action cannot be undone.
                        </p>
                        <div className="flex space-x-3">
                            <Button
                                variant="secondary"
                                onClick={() => setDeleteConfirmId(null)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="danger"
                                onClick={() => handleDelete(deleteConfirmId)}
                                className="flex-1"
                            >
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}

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
        </div>
    );
}
