import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { sendTest, listTemplates } from "../../../../lib/api/email";

const testEmailSchema = z.object({
    to: z.string().email("Must be a valid email address"),
    templateId: z.string().optional(),
    locale: z.string().min(1, "Locale is required"),
    payload: z.string().optional().refine(
        (val) => !val || (() => {
            try {
                JSON.parse(val);
                return true;
            } catch {
                return false;
            }
        })(),
        "Must be valid JSON"
    ),
});

type TestEmailFormData = z.infer<typeof testEmailSchema>;



const availableLocales = [
    { code: "en", name: "English" },
    { code: "de", name: "German" },
    { code: "fr", name: "French" },
    { code: "es", name: "Spanish" },
];

export default function TestEmailPanel() {
    const [isSending, setIsSending] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [sendStatus, setSendStatus] = useState<"idle" | "success" | "error">("idle");
    const [messageId, setMessageId] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [availableTemplates, setAvailableTemplates] = useState([
        { id: "", name: "No Template (Raw Email)" }
    ]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<TestEmailFormData>({
        resolver: zodResolver(testEmailSchema),
        defaultValues: {
            locale: "en",
        },
    });

    // Load available templates
    useEffect(() => {
        const loadTemplates = async () => {
            try {
                const templates = await listTemplates();
                setAvailableTemplates([
                    { id: "", name: "No Template (Raw Email)" },
                    ...templates.map(t => ({ id: t.id, name: t.name }))
                ]);
            } catch (error) {
                console.error("Failed to load templates:", error);
            } finally {
                setIsLoadingTemplates(false);
            }
        };
        
        loadTemplates();
    }, []);

    const onSubmit = async (data: TestEmailFormData) => {
        setIsSending(true);
        setSendStatus("idle");
        setErrorMessage("");
        setMessageId("");

        try {
            const payload = {
                to: data.to,
                templateId: data.templateId || undefined,
                locale: data.locale,
                payload: data.payload ? JSON.parse(data.payload) : undefined,
            };

            const result = await sendTest(payload);
            setSendStatus("success");
            setMessageId(result.messageId);
            reset();
        } catch (error) {
            console.error("Failed to send test email:", error);
            setSendStatus("error");
            setErrorMessage(error instanceof Error ? error.message : "Failed to send test email");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Status Messages */}
            {sendStatus === "success" && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                    ✅ Test email sent successfully! Message ID: {messageId}
                </div>
            )}
            
            {sendStatus === "error" && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    ❌ {errorMessage}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Recipient Email */}
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">To Email</label>
                        <input
                            type="email"
                            {...register("to")}
                            className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="test@example.com"
                        />
                        {errors.to && (
                            <p className="text-xs text-red-600">{errors.to.message}</p>
                        )}
                    </div>

                    {/* Template Selection */}
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Template</label>
                        <select
                            {...register("templateId")}
                            className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            disabled={isLoadingTemplates}
                        >
                            {isLoadingTemplates ? (
                                <option>Loading templates...</option>
                            ) : (
                                <>
                                    <option value="">Select template</option>
                                    {availableTemplates.map((template) => (
                                        <option key={template.id} value={template.id}>
                                            {template.name}
                                        </option>
                                    ))}
                                </>
                            )}
                        </select>
                        <p className="text-xs text-gray-500">Leave empty to test with raw HTML</p>
                    </div>

                    {/* Locale Selection */}
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Locale</label>
                        <select
                            {...register("locale")}
                            className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {availableLocales.map((locale) => (
                                <option key={locale.code} value={locale.code}>
                                    {locale.name}
                                </option>
                            ))}
                        </select>
                        {errors.locale && (
                            <p className="text-xs text-red-600">{errors.locale.message}</p>
                        )}
                    </div>
                </div>

                {/* Advanced Options */}
                <div>
                    <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        {showAdvanced ? "Hide" : "Show"} Advanced Options
                    </button>
                    
                    {showAdvanced && (
                        <div className="mt-3 space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Sample Payload (JSON)</label>
                            <textarea
                                {...register("payload")}
                                rows={4}
                                className="w-full rounded-xl border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder='{"user": {"firstName": "John", "lastName": "Doe"}, "event": {"title": "Test Event"}}'
                            />
                            <p className="text-xs text-gray-500">
                                Optional JSON payload to test template variables
                            </p>
                            {errors.payload && (
                                <p className="text-xs text-red-600">{errors.payload.message}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Send Button */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={isSending}
                        className={`
                            inline-flex items-center rounded-xl px-6 py-2 text-sm font-medium
                            ${!isSending
                                ? "bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                            }
                        `}
                    >
                        {isSending ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Sending...
                            </>
                        ) : (
                            "Send Test Email"
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
