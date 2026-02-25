import { useState, useEffect, useCallback } from "react";
import { previewTemplate } from "../../../../lib/api/email";
import { XIcon, EyeIcon, CodeIcon, PaperAirplaneIcon } from "@heroicons/react/outline";
import { Button } from "../../../ui/Button";
import { Badge } from "../../../ui/Badge";

interface EmailTemplate {
    id?: string;
    name: string;
    mailType: string;
    subjects: { [locale: string]: string };
    baseHtml: string;
    bodyHtml: string;
    samplePayload?: string;
}

interface TemplatePreviewModalProps {
    template: EmailTemplate;
    isOpen: boolean;
    onClose: () => void;
    onSendTest?: (to: string, template: EmailTemplate) => void;
}

interface PreviewData {
    html: string;
    subject: string;
    locale: string;
}

export default function TemplatePreviewModal({
    template,
    isOpen,
    onClose,
    onSendTest
}: TemplatePreviewModalProps) {
    const [activeTab, setActiveTab] = useState<"rendered" | "source">("rendered");
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedLocale, setSelectedLocale] = useState("en");
    const [testEmailTo, setTestEmailTo] = useState("");
    const [showTestEmailForm, setShowTestEmailForm] = useState(false);
    const [isSendingTest, setIsSendingTest] = useState(false);

    const availableLocales = Object.keys(template.subjects).filter(
        locale => template.subjects[locale]?.trim()
    );

    const generatePreview = useCallback(async () => {
        if (!template.subjects[selectedLocale]?.trim()) {
            setError("No subject available for selected locale");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Call the backend preview API
            const payload = template.samplePayload ? JSON.parse(template.samplePayload) : undefined;
            
            const result = await previewTemplate({
                locale: selectedLocale,
                subjects: template.subjects,
                baseHtml: template.baseHtml,
                bodyHtml: template.bodyHtml,
                payload
            });

            setPreviewData({
                html: result.html,
                subject: result.subject,
                locale: result.locale
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate preview");
        } finally {
            setIsLoading(false);
        }
    }, [template, selectedLocale]);

    useEffect(() => {
        if (isOpen && template) {
            generatePreview();
        }
    }, [isOpen, template, selectedLocale, generatePreview]);



    const handleSendTest = async () => {
        if (!testEmailTo || !onSendTest) return;
        
        setIsSendingTest(true);
        try {
            await onSendTest(testEmailTo, template);
            setShowTestEmailForm(false);
            setTestEmailTo("");
        } catch (err) {
            console.error("Failed to send test email:", err);
        } finally {
            setIsSendingTest(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            Preview: {template.name}
                        </h2>
                        <p className="text-sm text-gray-600">
                            {template.mailType.replace(/_/g, " ")}
                        </p>
                    </div>
                    <div className="flex items-center space-x-3">
                        {/* Locale selector */}
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Locale:</span>
                            <select
                                value={selectedLocale}
                                onChange={(e) => setSelectedLocale(e.target.value)}
                                className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                {availableLocales.map((locale) => (
                                    <option key={locale} value={locale}>
                                        {locale.toUpperCase()}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        {/* Send test email button */}
                        <Button
                            variant="secondary"
                            onClick={() => setShowTestEmailForm(!showTestEmailForm)}
                            className="inline-flex items-center space-x-2"
                        >
                            <PaperAirplaneIcon className="w-4 h-4" />
                            <span>Send Test</span>
                        </Button>
                        
                        <Button
                            variant="secondary"
                            onClick={onClose}
                            className="p-2"
                        >
                            <XIcon className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Test email form */}
                {showTestEmailForm && (
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center space-x-3">
                            <input
                                type="email"
                                placeholder="Enter email address to send test..."
                                value={testEmailTo}
                                onChange={(e) => setTestEmailTo(e.target.value)}
                                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <Button
                                onClick={handleSendTest}
                                disabled={!testEmailTo || isSendingTest}
                                className="inline-flex items-center space-x-2"
                            >
                                <PaperAirplaneIcon className="w-4 h-4" />
                                <span>{isSendingTest ? "Sending..." : "Send Test"}</span>
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => setShowTestEmailForm(false)}
                                className="px-3 py-2"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="flex space-x-8 px-6">
                        <button
                            onClick={() => setActiveTab("rendered")}
                            className={`
                                flex items-center space-x-2 py-3 border-b-2 font-medium text-sm
                                ${activeTab === "rendered"
                                    ? "border-indigo-600 text-indigo-700"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }
                            `}
                        >
                            <EyeIcon className="w-5 h-5" />
                            <span>Rendered</span>
                        </button>
                        <button
                            onClick={() => setActiveTab("source")}
                            className={`
                                flex items-center space-x-2 py-3 border-b-2 font-medium text-sm
                                ${activeTab === "source"
                                    ? "border-indigo-600 text-indigo-700"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }
                            `}
                        >
                            <CodeIcon className="w-5 h-5" />
                            <span>Source</span>
                        </button>
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-gray-500">Generating preview...</div>
                        </div>
                    ) : error ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                            <div className="text-sm text-red-700">{error}</div>
                        </div>
                    ) : previewData ? (
                        <div>
                            {activeTab === "rendered" ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-medium text-gray-900">
                                            Subject: {previewData.subject}
                                        </h3>
                                        <Badge variant="secondary">
                                            Locale: {previewData.locale.toUpperCase()}
                                        </Badge>
                                    </div>
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <iframe
                                            srcDoc={previewData.html}
                                            className="w-full h-96 border-0"
                                            title="Email preview"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium text-gray-900">HTML Source</h3>
                                    <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-xs font-mono text-gray-800 max-h-96">
                                        {previewData.html}
                                    </pre>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
