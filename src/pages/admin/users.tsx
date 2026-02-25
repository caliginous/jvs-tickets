import { useSession } from "next-auth/react";
import { AdminLayout } from "../../components/admin/layout";
import {
    getAdminServerSideProps
} from "../../constants/serverUtil";
import prisma from "../../lib/prisma";
import { useState } from "react";
import { ManageUserDialog } from "../../components/admin/dialogs/ManageUserDialog";
import { PlusIcon, PencilIcon } from "@heroicons/react/solid";
import { useRouter } from "next/router";
import { PermissionSection, PermissionType } from "../../constants/interfaces";
import { Button } from "../../ui";

export default function Users({ users, permissionDenied }) {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [user, setUser] = useState(null);
    const [addUserOpen, setAddUserOpen] = useState<boolean>(false);

    // Only show loading during genuine session loading, not on tab switches
    if (status === "loading") {
        return (
            <AdminLayout permissionDenied={permissionDenied}>
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="ml-3 text-gray-600">Loading users...</div>
                </div>
            </AdminLayout>
        );
    }

    const refreshProps = async () => {
        await router.replace(router.asPath);
    };

    return (
        <AdminLayout permissionDenied={permissionDenied}>
            <ManageUserDialog
                open={addUserOpen}
                user={user}
                onClose={() => {
                    setUser(null);
                    setAddUserOpen(false);
                }}
                onDelete={refreshProps}
                onChange={refreshProps}
                editRights={true}
            />
            <div className="pb-5">
                <h1 className="text-2xl font-bold">Users</h1>
            </div>
            <div>
                <div className="flex">
                    <div className="flex-grow" />
                    <Button
                        onClick={() => setAddUserOpen(true)}
                        id="add-user-button"
                        className="flex items-center space-x-2"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Add User
                    </Button>
                </div>
                {(users?.length ?? 0) === 0 ? (
                    <p className="text-base text-gray-900">
                        No users available yet
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-Mail</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Edit</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((user, index) => {
                                    return (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.userName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <button
                                                    onClick={() => setUser(user)}
                                                    className="user-edit-button p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}

export async function getServerSideProps(context) {
    return await getAdminServerSideProps(
        context,
        async () => {
            let users = await prisma.adminUser.findMany();
            users = users.map(user => ({...user, readRights: JSON.parse(user.readRights), writeRights: JSON.parse(user.writeRights)}))
            return {
                props: {
                    users
                }
            };
        },
        {
            permission: PermissionSection.UserManagement,
            permissionType: PermissionType.Read
        }
    );
}
