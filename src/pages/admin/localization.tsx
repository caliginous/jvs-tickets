import { getAdminServerSideProps } from "../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../constants/interfaces";
import i18nConfig from "../../../i18n";
import { AdminLayout } from "../../components/admin/layout";
import { useState } from "react";
import { showToast } from "../../ui";
import axios from "axios";
import { useRouter } from "next/router";
import { SaveButton } from "../../components/admin/SaveButton";
import { Input } from "../../ui";

const createObjectFromList = (list, value) => {
    return list.reduce((result, key) => ({...result, [key]: Object.assign({}, value)}), {});
}

export default function Localization({localization, locales, defaultLocale, permissionDenied}) {
    const [state, setState] = useState<Record<string, Record<string, Record<string, string>>>>(() => {
        // Safety check to prevent Object.entries error
        if (!localization || typeof localization !== 'object') {
            console.warn('Localization data is missing or invalid:', localization);
            return {};
        }
        
        try {
            return Object.entries(localization).reduce((result, namespace) => ({
                ...result, 
                [namespace[0]]: createObjectFromList(Object.keys(namespace[1]), {})
            }), {});
        } catch (error) {
            console.error('Error processing localization data:', error);
            return {};
        }
    });
    const router = useRouter();

    const refreshProps = async () => {
        await router.replace(router.asPath);
    };

    const handleChange = (namespace: string, locale: string, key: string, value: string) => {
        setState(prev => {
            prev[namespace][locale][key] = value;
            return prev;
        });
    };

    const handleSave = async () => {
        try {
            for (let namespace of Object.entries(state)) {
                for (let locale of Object.entries(namespace[1])) {
                    for (let key of Object.entries(locale[1])) {
                        await axios.post(`/api/admin/translation/${namespace[0]}/${key[0]}`, {
                            [locale[0]]: key[1]
                        });
                    }
                }
            }
        } catch (e) {
            showToast.error("Error: " + (e?.response?.data ?? e.message));
        }
    };

    return (
        <AdminLayout permissionDenied={permissionDenied}>
            <div className="pb-5">
                <h1 className="text-2xl font-bold">Localization</h1>
                <p className="text-base text-gray-900">Default Locale: {defaultLocale || 'Not configured'}</p>
                <p className="text-base text-gray-900">Supported Locales: {locales ? locales.join(", ") : 'Not configured'}</p>
                <div className="p-1" />
                {
                    // Safety check before rendering
                    localization && typeof localization === 'object' ? Object.keys(localization).map((namespace) => (
                        <div key={namespace} className="border border-gray-200 rounded-lg mb-4">
                            <details className="group">
                                <summary 
                                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 list-none"
                                    id={"namespace-" + namespace}
                                >
                                    <span className="text-base font-medium text-gray-900">
                                        Translation for namespace <span className="font-bold">{namespace}</span>
                                    </span>
                                    <div className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform">▼</div>
                                </summary>
                                <div className="px-4 pb-4 border-t border-gray-200">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
                                                    {
                                                        locales.map((locale) => <th key={locale} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{locale}{locale === defaultLocale && " (Default)"}</th>)
                                                    }
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {
                                                    Object.keys(localization[namespace][defaultLocale]).map((key) => (
                                                        <tr key={key} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{key}</td>
                                                            {
                                                                locales.map((locale) => (
                                                                    <td key={locale} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                        <Input
                                                                            defaultValue={localization[namespace][locale][key]}
                                                                            style={{minWidth: 200}}
                                                                            onChange={(event) => handleChange(namespace, locale, key, event.target.value)}
                                                                            id={`translation-${namespace}-${locale}-${key}`}
                                                                        />
                                                                    </td>
                                                                ))
                                                            }
                                                        </tr>
                                                    ))
                                                }
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </details>
                        </div>
                    )) : (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-yellow-800">⚠️ Localization data is not available. Please check the server configuration.</p>
                        </div>
                    )
                }
                <SaveButton
                    action={handleSave}
                    onComplete={refreshProps}
                    className="w-full"
                    id="localization-save"
                >
                    Save
                </SaveButton>
            </div>
        </AdminLayout>
    )
}

export async function getServerSideProps(context) {
    return await getAdminServerSideProps(
        context,
        async () => {
            let namespaces = (Object.values(i18nConfig.pages).flat() as string[])
                .filter((val, index, array) => array.indexOf(val) === index);

            const localization = namespaces.reduce((result, namespace) => ({...result, [namespace]: {}}), {});
            for (let namespace of namespaces) {
                for (let locale of i18nConfig.locales) {
                    localization[namespace][locale] = await i18nConfig.loadLocaleFrom(locale, namespace);
                }
            }
            return {
                props: {
                    localization,
                    defaultLocale: i18nConfig.defaultLocale,
                    locales: i18nConfig.locales
                }
            };
        },
        {
            permission: PermissionSection.Translation,
            permissionType: PermissionType.Read
        }
    );
}
