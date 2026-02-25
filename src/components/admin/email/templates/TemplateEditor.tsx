import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../../../ui/Button";
import { Badge } from "../../../ui/Badge";
import { Textarea } from "../../../ui/Textarea";
import SubjectLocaleSwitcher from "./SubjectLocaleSwitcher";
import TokenSidebar from "./TokenSidebar";
import { EmailTemplate } from "../../../../lib/api/email";

const templateSchema = z.object({
    name: z.string().min(1, "Template name is required"),
    mailType: z.string().min(1, "Mail type is required"),
    subjects: z.record(z.string(), z.string()),
    baseHtml: z.string().min(1, "Base template is required"),
    bodyHtml: z.string(),
    samplePayload: z.string().optional()
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface TemplateEditorProps {
    template?: EmailTemplate;
    onSave: (data: TemplateFormData) => Promise<void>;
    onCancel: () => void;
    onPreview: (data: TemplateFormData) => void;
}

const MAIL_TYPES = [
    "booking_confirmation",
    "booking_cancellation", 
    "order_confirmation",
    "password_reset",
    "welcome",
    "event_reminder",
    "payment_failed",
    "refund_processed",
    "payment_link"
];

export default function TemplateEditor({ 
    template, 
    onSave, 
    onCancel, 
    onPreview 
}: TemplateEditorProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isDirty }
    } = useForm<TemplateFormData>({
        resolver: zodResolver(templateSchema),
        defaultValues: template || {
            name: "",
            mailType: "",
            subjects: { en: "" },
            baseHtml: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
</head>
<body>
    {{content}}
</body>
</html>`,
            bodyHtml: "",
            samplePayload: ""
        }
    });

    const baseHtml = watch("baseHtml");
    const hasContentToken = baseHtml.includes("{{content}}");

    const onSubmit = async (data: TemplateFormData) => {
        setIsSaving(true);
        try {
            await onSave(data);
        } catch (error) {
            console.error("Failed to save template:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePreview = async (data: TemplateFormData) => {
        setIsPreviewing(true);
        try {
            await onPreview(data);
        } catch (error) {
            console.error("Failed to preview template:", error);
        } finally {
            setIsPreviewing(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    {template ? "Edit Template" : "New Template"}
                </h1>
                <p className="text-gray-600 mt-2">
                    {template ? "Update your email template" : "Create a new email template"}
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Form Fields */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Information */}
                        <div className="rounded-2xl border bg-white shadow-sm p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Template Name *
                                    </label>
                                    <input
                                        type="text"
                                        {...register("name")}
                                        className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                            errors.name ? "border-red-300" : ""
                                        }`}
                                        placeholder="e.g., Booking Confirmation"
                                    />
                                    {errors.name && (
                                        <p className="text-xs text-red-600">{errors.name.message}</p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Mail Type *
                                    </label>
                                    <select
                                        {...register("mailType")}
                                        className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                            errors.mailType ? "border-red-300" : ""
                                        }`}
                                    >
                                        <option value="">Select mail type...</option>
                                        {MAIL_TYPES.map((type) => (
                                            <option key={type} value={type}>
                                                {type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.mailType && (
                                        <p className="text-xs text-red-600">{errors.mailType.message}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Subjects */}
                        <div className="rounded-2xl border bg-white shadow-sm p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Subjects</h3>
                            <SubjectLocaleSwitcher
                                subjects={watch("subjects")}
                                onSubjectsChange={(subjects) => setValue("subjects", subjects, { shouldDirty: true })}
                            />
                        </div>

                        {/* Base Template */}
                        <div className="rounded-2xl border bg-white shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Base Template *</h3>
                                {!hasContentToken && (
                                    <Badge variant="destructive">Missing {"{{content}}"} token</Badge>
                                )}
                            </div>
                            <p className="text-sm text-gray-600 mb-3">
                                This is your email layout. Use {"{{content}}"} to insert the body content.
                            </p>
                            <Textarea
                                {...register("baseHtml")}
                                className={`w-full h-64 font-mono text-xs ${
                                    errors.baseHtml ? "border-red-300" : ""
                                }`}
                                placeholder="<!DOCTYPE html>..."
                            />
                            {errors.baseHtml && (
                                <p className="text-xs text-red-600">{errors.baseHtml.message}</p>
                            )}
                        </div>

                        {/* Body Template */}
                        <div className="rounded-2xl border bg-white shadow-sm p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Body Template</h3>
                            <p className="text-sm text-gray-600 mb-3">
                                This content will be inserted into the {"{{content}}"} placeholder.
                            </p>
                            <Textarea
                                {...register("bodyHtml")}
                                className="w-full h-48 font-mono text-xs"
                                placeholder="<p>Your email content here...</p>"
                            />
                        </div>

                        {/* Sample Payload */}
                        <div className="rounded-2xl border bg-white shadow-sm p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sample Payload (Optional)</h3>
                            <p className="text-sm text-gray-600 mb-3">
                                JSON data for testing token replacement in preview.
                            </p>
                            <Textarea
                                {...register("samplePayload")}
                                className="w-full h-32 font-mono text-xs"
                                placeholder='{"user": {"firstName": "John"}, "event": {"title": "Sample Event"}}'
                            />
                        </div>
                    </div>

                    {/* Right Column - Token Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-4">
                            <TokenSidebar />
                            
                            <div className="mt-6 space-y-3">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={handleSubmit(handlePreview)}
                                    disabled={isPreviewing}
                                    className="w-full"
                                >
                                    {isPreviewing ? "Generating..." : "Preview Template"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-6 border-t">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onCancel}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={!isDirty || isSaving}
                    >
                        {isSaving ? "Saving..." : "Save Template"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
