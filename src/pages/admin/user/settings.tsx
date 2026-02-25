import { signOut, useSession } from "next-auth/react";
import { AdminLayout } from "../../../components/admin/layout";
import { Button, Input, Select } from "../../../ui";
import { getAdminServerSideProps } from "../../../constants/serverUtil";
import prisma from "../../../lib/prisma";
import { ChevronDownIcon } from "@heroicons/react/solid";
import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { ChangePasswordDialog } from "../../../components/admin/dialogs/ChangePasswordDialog";
import { TrashIcon } from "@heroicons/react/solid";

import { AddApiKeyDialog } from "../../../components/admin/dialogs/AddApiKeyDialog";
import { PlusIcon } from "@heroicons/react/solid";
import { ConfirmDialog } from "../../../components/admin/dialogs/ConfirmDialog";
import { showToast } from "../../../ui/toast";
import { ManageNotificationDialog } from "../../../components/admin/dialogs/ManageNotificationDialog";
import { PencilIcon } from '@heroicons/react/solid';

export default function UserSettings({ user }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [username, setUsername] = useState(user?.userName);
    const [email, setEmail] = useState(user?.email);
    const [changePasswordOpen, setChangePasswordOpen] = useState(false);
    const [addApiKeyOpen, setAddApiKeyOpen] = useState(false);
    const [deleteApiKeyIndex, setDeleteApiKeyIndex] = useState(null);
    const [notificationDeleteIndex, setNotificationDeleteIndex] = useState(null);
    const [addNotificationOpen, setAddNotificationOpen] = useState(false);
    const [notificationChange, setNotificationChange] = useState(null);

    const [isLgUp, setIsLgUp] = useState(false);

    useEffect(() => {
        const checkScreenSize = () => {
            setIsLgUp(window.innerWidth >= 1024); // lg breakpoint
        };
        
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    useEffect(() => {
        if (user) return;
        signOut().catch(alert);
    }, [user]);

    const deleteApiKey = async () => {
        try {
            await axios.delete(
                "/api/admin/user/apiKey/" + deleteApiKeyIndex.id
            );
            setDeleteApiKeyIndex(null);
            await refreshProps();
        } catch (e) {
            setDeleteApiKeyIndex(null);
            showToast.error("Error while deleting api key!");
        }
    };

    const deleteNotification = async () => {
        try {
            await axios.delete(
                "/api/admin/notifications/" + notificationDeleteIndex.id
            );
            setDeleteApiKeyIndex(null);
            await refreshProps();
        } catch (e) {
            setDeleteApiKeyIndex(null);
            showToast.error("Error: " + (e?.response?.data ?? e.message));
        }
    }

    const refreshProps = async () => {
        await router.replace(router.asPath);
    };

    const onSave = async () => {
        try {
            await axios.put("/api/admin/user/" + user.id, {
                username: username,
                email: email
            });
            signOut().catch(alert);
        } catch (e) {
            showToast.error("Error while saving!");
        }
    };

    const hasChange = username !== user?.userName || email !== user?.email;

    // Show loading state while session is loading
    if (status === "loading") {
        return (
            <AdminLayout>
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </AdminLayout>
        );
    }

    // Show nothing if no session
    // Handle both JWT mode (session has user data directly) and database mode (session.user exists)
    const hasValidSession = session && (
        session.user || // Database mode
        ((session as any).name && (session as any).email) // JWT mode
    );
    
    if (!hasValidSession) {
        return null;
    }

    return (
        <AdminLayout>
            <ManageNotificationDialog
                notification={notificationChange}
                open={notificationChange !== null || addNotificationOpen}
                onClose={() => {
                    setNotificationChange(null);
                    setAddNotificationOpen(false);
                }}
                onChange={refreshProps}
            />
            <ChangePasswordDialog
                open={changePasswordOpen}
                onClose={() => setChangePasswordOpen(false)}
                user={user}
            />
            <AddApiKeyDialog
                open={addApiKeyOpen}
                onClose={() => setAddApiKeyOpen(false)}
                onKeyGenerated={refreshProps}
            />
            <ConfirmDialog
                text={`Delete API <b>${deleteApiKeyIndex?.name}</b>`}
                open={deleteApiKeyIndex !== null}
                onConfirm={deleteApiKey}
                onClose={() => setDeleteApiKeyIndex(null)}
            />
            <ConfirmDialog
                text={`Delete <b>${notificationDeleteIndex?.type}</b> Notification`}
                open={notificationDeleteIndex !== null}
                onConfirm={deleteNotification}
                onClose={() => setNotificationDeleteIndex(null)}
            />
            <div className="space-y-4">
                <h1 className="text-2xl font-semibold text-gray-900">Account Settings</h1>
                <details className="border border-gray-200 rounded-lg">
                    <summary className="px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 font-medium text-gray-900 flex items-center justify-between">
                        <span className="text-lg font-medium">Account</span>
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </summary>
                    <div className="p-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={username}
                                onChange={(event) =>
                                    setUsername(event.target.value)
                                }
                                id={"change-username"}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                            <input
                                type="email"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                id={"change-email"}
                            />
                        </div>
                        <button
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={onSave}
                            disabled={!hasChange}
                            id={"change-save"}
                        >
                            Save
                        </button>
                        <button
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                            onClick={() => setChangePasswordOpen(true)}
                            id={"change-password"}
                        >
                            Change Password
                        </button>
                    </div>
                </details>
                <details className="border border-gray-200 rounded-lg">
                    <summary className="px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 font-medium text-gray-900 flex items-center justify-between">
                        <span className="text-lg font-medium">Api-Keys</span>
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </summary>
                    <div className="p-4 space-y-4">
                        <div className={`flex ${isLgUp ? 'flex-row' : 'flex-col'} pb-2`}>
                            <div className="flex-grow">
                                <p className="text-gray-900">
                                    Api Keys are used to access sensible data,
                                    e.g. using direct HTTP REST calls or the
                                    command line interface for the ticketshop.
                                    <br />
                                    Once you generated an API Key and closed the
                                    confirmation, you can&apos;t restore it.
                                </p>
                            </div>
                            <button
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 min-w-[50px]"
                                onClick={() => setAddApiKeyOpen(true)}
                                id={"add-api-key-button"}
                            >
                                <PlusIcon className="w-4 h-4" /> Add Api Key
                            </button>
                        </div>
                        {user?.apiKeys.length === 0 ? (
                            <p className="text-gray-900">
                                You don&apos;t have any API keys yet!
                            </p>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delete</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {user?.apiKeys.map((apiKey, index) => {
                                        return (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {apiKey.name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <button
                                                        className="p-2 text-red-600 hover:text-red-800 rounded delete-api-key-button"
                                                        onClick={() =>
                                                            setDeleteApiKeyIndex(
                                                                apiKey
                                                            )
                                                        }
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </details>
                <details className="border border-gray-200 rounded-lg">
                    <summary className="px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 font-medium text-gray-900 flex items-center justify-between">
                        <span className="text-lg font-medium">Notifications</span>
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </summary>
                    <div className="p-4 space-y-4">
                        <div className={`flex ${isLgUp ? 'flex-row' : 'flex-col'} pb-2`}>
                            <div className="flex-grow">
                                <p className="text-gray-900">
                                    With notifications, you can set up immediate
                                    feedback on new orders, purchase
                                    confirmations and others stuff
                                </p>
                            </div>
                            <button
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 min-w-[50px]"
                                onClick={() => setAddNotificationOpen(true)}
                                id={"add-notification-button"}
                            >
                                <PlusIcon className="w-4 h-4" /> Add Notification
                            </button>
                        </div>
                        {user?.notifications.length === 0 ? (
                            <p className="text-gray-900">
                                You don&apos;t have any notifications set up yet!
                            </p>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Edit</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delete</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {user?.notifications.map((notification, index) => {
                                        return (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {notification.type}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <button
                                                        className="p-2 text-gray-600 hover:text-gray-800 rounded edit-notification-button"
                                                        onClick={() =>
                                                            setNotificationChange(notification)
                                                        }
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <button
                                                        className="p-2 text-red-600 hover:text-red-800 rounded delete-notification-button"
                                                        onClick={() =>
                                                            setNotificationDeleteIndex(
                                                                notification
                                                            )
                                                        }
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </details>
            </div>
        </AdminLayout>
    );
}

export async function getServerSideProps(context) {
    return await getAdminServerSideProps(context, async (session) => {
        const user = await prisma.adminUser.findUnique({
            where: {
                email: session.user.email
            },
            include: {
                apiKeys: true,
                notifications: true
            }
        });
        return {
            props: {
                user
            }
        };
    });
}
