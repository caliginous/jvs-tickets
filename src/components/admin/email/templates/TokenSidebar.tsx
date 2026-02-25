import { useState } from "react";
import { ClipboardCopyIcon, CheckIcon } from "@heroicons/react/outline";
import { Badge } from "../../../ui/Badge";

interface TokenSidebarProps {
    className?: string;
}

interface TokenGroup {
    title: string;
    tokens: Array<{
        key: string;
        description: string;
        example: string;
    }>;
}

export default function TokenSidebar({ className = "" }: TokenSidebarProps) {
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    const tokenGroups: TokenGroup[] = [
        {
            title: "User",
            tokens: [
                { key: "{{user.firstName}}", description: "User's first name", example: "John" },
                { key: "{{user.lastName}}", description: "User's last name", example: "Doe" },
                { key: "{{user.email}}", description: "User's email address", example: "john@example.com" },
                { key: "{{user.fullName}}", description: "User's full name", example: "John Doe" }
            ]
        },
        {
            title: "Event",
            tokens: [
                { key: "{{event.title}}", description: "Event title", example: "Rosh Hashanah Dinner" },
                { key: "{{event.date}}", description: "Event date", example: "15 September 2024" },
                { key: "{{event.time}}", description: "Event time", example: "7:00 PM" },
                { key: "{{event.venue}}", description: "Event venue", example: "JVS Community Centre" },
                { key: "{{event.url}}", description: "Event booking URL", example: "https://jvs.org.uk/events/123" },
                { key: "{{event.bespoke.message}}", description: "Custom event message", example: "Please bring dietary requirements form" }
            ]
        },
        {
            title: "Booking",
            tokens: [
                { key: "{{booking.id}}", description: "Booking reference", example: "BK-2024-001" },
                { key: "{{booking.seats}}", description: "Number of seats", example: "2" },
                { key: "{{booking.total}}", description: "Total amount", example: "£40.00" },
                { key: "{{booking.status}}", description: "Booking status", example: "Confirmed" },
                { key: "{{booking.createdAt}}", description: "Booking date", example: "10 September 2024" }
            ]
        },
        {
            title: "Common",
            tokens: [
                { key: "{{common.greeting}}", description: "Time-based greeting", example: "Good morning" },
                { key: "{{common.appName}}", description: "Application name", example: "Tessera" },
                { key: "{{common.supportEmail}}", description: "Support contact", example: "support@jvs.org.uk" },
                { key: "{{common.baseUrl}}", description: "Application base URL", example: "https://jvs.org.uk" }
            ]
        }
    ];

    const copyToClipboard = async (token: string) => {
        try {
            await navigator.clipboard.writeText(token);
            setCopiedToken(token);
            setTimeout(() => setCopiedToken(null), 2000);
        } catch (err) {
            console.error("Failed to copy token:", err);
        }
    };

    return (
        <div className={`sticky top-4 rounded-2xl border bg-white p-4 ${className}`}>
            <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Available Tokens</h3>
                <p className="text-xs text-gray-600">
                    Click any token to copy it to your clipboard
                </p>
            </div>

            <div className="space-y-4">
                {tokenGroups.map((group) => (
                    <div key={group.title}>
                        <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
                            {group.title}
                        </h4>
                        <div className="space-y-2">
                            {group.tokens.map((token) => (
                                <div
                                    key={token.key}
                                    className="group cursor-pointer rounded-lg border border-gray-200 p-2 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                                    onClick={() => copyToClipboard(token.key)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-mono text-gray-900 group-hover:text-indigo-700">
                                                {token.key}
                                            </div>
                                            <div className="text-xs text-gray-600 mt-1">
                                                {token.description}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1 italic">
                                                Example: {token.example}
                                            </div>
                                        </div>
                                        <div className="ml-2 flex-shrink-0">
                                            {copiedToken === token.key ? (
                                                <CheckIcon className="w-4 h-4 text-green-600" />
                                            ) : (
                                                <ClipboardCopyIcon className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-600">
                    <p className="mb-2">
                        <strong>Note:</strong> The <code className="bg-gray-100 px-1 rounded">{"{{content}}"}</code> token is required in your base template.
                    </p>
                    <p>
                        All tokens are automatically replaced with actual data when emails are sent.
                    </p>
                </div>
            </div>
        </div>
    );
}
