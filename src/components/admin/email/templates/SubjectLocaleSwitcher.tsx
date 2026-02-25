import { useState } from "react";
import { GlobeAltIcon, ExclamationIcon } from "@heroicons/react/outline";
import { Badge } from "../../../ui/Badge";

interface SubjectLocaleSwitcherProps {
    subjects: { [locale: string]: string };
    onSubjectsChange: (subjects: { [locale: string]: string }) => void;
    className?: string;
}

const SUPPORTED_LOCALES = [
    { code: "en", name: "English", flag: "🇬🇧" },
    { code: "de", name: "Deutsch", flag: "🇩🇪" },
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "es", name: "Español", flag: "🇪🇸" },
    { code: "he", name: "עברית", flag: "🇮🇱" }
];

export default function SubjectLocaleSwitcher({
    subjects,
    onSubjectsChange,
    className = ""
}: SubjectLocaleSwitcherProps) {
    const [activeLocale, setActiveLocale] = useState("en");
    const [showAddLocale, setShowAddLocale] = useState(false);
    const [newLocale, setNewLocale] = useState("");

    const availableLocales = SUPPORTED_LOCALES.filter(
        locale => !subjects[locale.code] || subjects[locale.code] !== ""
    );

    const handleSubjectChange = (locale: string, value: string) => {
        const newSubjects = { ...subjects, [locale]: value };
        onSubjectsChange(newSubjects);
    };

    const addLocale = () => {
        if (newLocale && !subjects[newLocale]) {
            handleSubjectChange(newLocale, "");
            setActiveLocale(newLocale);
            setNewLocale("");
            setShowAddLocale(false);
        }
    };

    const removeLocale = (locale: string) => {
        if (locale === "en") return; // Don't allow removing default locale
        
        const newSubjects = { ...subjects };
        delete newSubjects[locale];
        onSubjectsChange(newSubjects);
        
        if (activeLocale === locale) {
            setActiveLocale("en");
        }
    };

    const hasEmptySubjects = Object.values(subjects).some(subject => !subject.trim());
    const hasMultipleLocales = Object.keys(subjects).length > 1;

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Locale tabs */}
            <div className="flex items-center space-x-2">
                <GlobeAltIcon className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Subject per locale:</span>
                
                {Object.keys(subjects).map((locale) => {
                    const localeInfo = SUPPORTED_LOCALES.find(l => l.code === locale);
                    const isEmpty = !subjects[locale]?.trim();
                    
                    return (
                        <button
                            key={locale}
                            onClick={() => setActiveLocale(locale)}
                            className={`
                                flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                                ${activeLocale === locale
                                    ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                                }
                            `}
                        >
                            <span>{localeInfo?.flag || locale}</span>
                            <span>{localeInfo?.name || locale}</span>
                            {isEmpty && (
                                <ExclamationIcon className="w-4 h-4 text-amber-500" />
                            )}
                            {hasMultipleLocales && locale !== "en" && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeLocale(locale);
                                    }}
                                    className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
                                    title="Remove locale"
                                >
                                    ×
                                </button>
                            )}
                        </button>
                    );
                })}
                
                {availableLocales.length > 0 && (
                    <button
                        onClick={() => setShowAddLocale(!showAddLocale)}
                        className="flex items-center space-x-1 px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <span>+</span>
                        <span>Add</span>
                    </button>
                )}
            </div>

            {/* Add locale dropdown */}
            {showAddLocale && (
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <select
                        value={newLocale}
                        onChange={(e) => setNewLocale(e.target.value)}
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Select locale...</option>
                        {availableLocales.map((locale) => (
                            <option key={locale.code} value={locale.code}>
                                {locale.flag} {locale.name}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={addLocale}
                        disabled={!newLocale}
                        className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Add
                    </button>
                    <button
                        onClick={() => setShowAddLocale(false)}
                        className="px-3 py-2 text-gray-600 text-sm font-medium hover:text-gray-800"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Subject input for active locale */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                    Subject ({SUPPORTED_LOCALES.find(l => l.code === activeLocale)?.name || activeLocale})
                </label>
                <input
                    type="text"
                    value={subjects[activeLocale] || ""}
                    onChange={(e) => handleSubjectChange(activeLocale, e.target.value)}
                    placeholder="Enter email subject..."
                    className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {!subjects[activeLocale]?.trim() && (
                    <div className="flex items-center space-x-2 text-amber-600 text-sm">
                        <ExclamationIcon className="w-4 h-4" />
                        <span>Subject is required for this locale</span>
                    </div>
                )}
            </div>

            {/* Validation summary */}
            {hasEmptySubjects && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                        <ExclamationIcon className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-amber-800">
                            <p className="font-medium mb-1">Some locales are missing subjects:</p>
                            <ul className="list-disc list-inside space-y-1">
                                {Object.entries(subjects).map(([locale, subject]) => {
                                    if (!subject?.trim()) {
                                        const localeInfo = SUPPORTED_LOCALES.find(l => l.code === locale);
                                        return (
                                            <li key={locale}>
                                                {localeInfo?.flag} {localeInfo?.name || locale}
                                            </li>
                                        );
                                    }
                                    return null;
                                })}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
