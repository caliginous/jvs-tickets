import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getSettings, updateSettings, EmailSettings } from "../../../../lib/api/email";

const settingsSchema = z.object({
    senderEmail: z.string().email("Must be a valid email address"),
    senderName: z.string().optional(),
    bccEmail: z.string().email().optional().or(z.literal("")),
    appBaseUrl: z.string().url("Must be a valid URL"),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function EmailSettingsForm() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isDirty },
        reset,
    } = useForm<SettingsFormData>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            senderEmail: "noreply@jvs.org.uk",
            senderName: "JVS Team",
            appBaseUrl: "https://tickets.jvs.org.uk",
        },
    });

    const loadSettings = useCallback(async () => {
        try {
            const settings = await getSettings();
            reset(settings);
            setIsLoading(false);
        } catch (error) {
            console.error("Failed to load settings:", error);
            setErrorMessage("Failed to load email settings");
            setIsLoading(false);
        }
    }, [reset]);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const onSubmit = async (data: SettingsFormData) => {
        setIsSaving(true);
        setSaveStatus("idle");
        setErrorMessage("");

        try {
            await updateSettings(data);
            setSaveStatus("success");
            reset(data); // Reset form to mark as pristine
            setTimeout(() => setSaveStatus("idle"), 3000);
        } catch (error) {
            console.error("Failed to save settings:", error);
            setSaveStatus("error");
            setErrorMessage(error instanceof Error ? error.message : "Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Email Settings</h2>
                    <p className="text-sm text-gray-600">
                        Configure email sender information and application settings. The system now uses Mailgun API for reliable email delivery.
                    </p>
                </div>

                {errorMessage && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-600">
                            ❌ {errorMessage}
                        </p>
                    </div>
                )}

                {/* Common Settings */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Email Configuration</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Sender Email</label>
                            <input
                                type="email"
                                {...register("senderEmail")}
                                className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="noreply@jvs.org.uk"
                            />
                            <p className="text-xs text-gray-500">Email address shown in the &apos;From&apos; header</p>
                            {errors.senderEmail && (
                                <p className="text-xs text-red-600">{errors.senderEmail.message}</p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Sender Name</label>
                            <input
                                type="text"
                                {...register("senderName")}
                                className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="JVS Team"
                            />
                            <p className="text-xs text-gray-500">Name shown in the &apos;From&apos; header</p>
                            {errors.senderName && (
                                <p className="text-xs text-red-600">{errors.senderName.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">BCC Address (Optional)</label>
                        <input
                            type="email"
                            {...register("bccEmail")}
                            className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="admin@jvs.org.uk"
                        />
                        <p className="text-xs text-gray-500">All emails will be BCC&apos;d to this address</p>
                        {errors.bccEmail && (
                            <p className="text-xs text-red-600">{errors.bccEmail.message}</p>
                        )}
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Application Base URL</label>
                        <input
                            type="url"
                            {...register("appBaseUrl")}
                            className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="https://tickets.jvs.org.uk"
                        />
                        <p className="text-xs text-gray-500">Used for generating absolute URLs in emails</p>
                        {errors.appBaseUrl && (
                            <p className="text-xs text-red-600">{errors.appBaseUrl.message}</p>
                        )}
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-6">
                    <button
                        type="submit"
                        disabled={isSaving || !isDirty}
                        className={`px-6 py-2 rounded-xl text-sm font-medium transition-colors ${
                            isSaving || !isDirty
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : "bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        }`}
                    >
                        {isSaving ? "Saving..." : "Save Settings"}
                    </button>
                </div>

                {/* Save Status */}
                {saveStatus === "success" && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-sm text-green-600">✅ Settings saved successfully!</p>
                    </div>
                )}

                {saveStatus === "error" && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-600">❌ Failed to save settings</p>
                    </div>
                )}
            </div>
        </form>
    );
}
