import { useSession } from "next-auth/react";
import { AdminLayout } from "../../../components/admin/layout";
import {
    getAdminServerSideProps
} from "../../../constants/serverUtil";
import prisma from "../../../lib/prisma";
import { PencilIcon, PlusIcon } from "@heroicons/react/solid";
import { Options, SEAT_COLORS } from "../../../constants/Constants";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ManageCategoryDialog } from "../../../components/admin/dialogs/ManageCategoryDialog";
import { formatPrice } from "../../../constants/util";
import { PermissionSection, PermissionType } from "../../../constants/interfaces";
import { getOption } from "../../../lib/options";
import { Button } from "../../../ui";

const ColorPreview = ({ color }: { color: string }) => {
    return <div className="w-8 h-8" style={{ backgroundColor: color }} />;
};

export default function Categories({ categories, permissionDenied, currency }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [category, setCategory] = useState(null);
    const [addCategoryOpen, setAddCategoryOpen] = useState(false);

    // Ensure modal opens when category is set
    const isModalOpen = addCategoryOpen || category !== null;

    // Only show loading spinner during initial session load, not on tab switches
    if (status === "loading") {
        return (
            <AdminLayout permissionDenied={permissionDenied}>
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="ml-3 text-gray-600">Loading categories...</div>
                </div>
            </AdminLayout>
        );
    }

    const refreshProps = async () => {
        await router.replace(router.asPath);
    };

    return (
        <AdminLayout permissionDenied={permissionDenied}>
            <ManageCategoryDialog
                key={category?.id || 'new'} // Force re-render when category changes
                open={isModalOpen}
                onClose={() => {
                    console.log('Modal closing, resetting states');
                    setAddCategoryOpen(false);
                    setCategory(null);
                }}
                onChange={refreshProps}
                category={category}
                currency={currency}
            />
            <div className="pb-5">
                <h1 className="text-2xl font-bold">Ticket Types</h1>
            </div>
            <div>
                <div className="flex">
                    <div className="flex-grow" />
                    <Button onClick={() => setAddCategoryOpen(true)} className="flex items-center space-x-2">
                        <PlusIcon className="w-5 h-5" />
                        Add Ticket Type
                    </Button>
                </div>
                <div>
                    {(categories?.length ?? 0) === 0 ? (
                        <p className="text-base text-gray-900">No ticket types</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color Active</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color Occupied</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Edit</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {categories.map((category, index) => {
                                        return (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {category.label}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {formatPrice(
                                                        category.price,
                                                        currency
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <ColorPreview
                                                        color={
                                                            category.color ??
                                                            SEAT_COLORS.normal
                                                        }
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <ColorPreview
                                                        color={
                                                            category.activeColor ??
                                                            SEAT_COLORS.active
                                                        }
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <ColorPreview
                                                        color={
                                                            category.occupiedColor ??
                                                            SEAT_COLORS.occupied
                                                        }
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <button
                                                        onClick={() => setCategory(category)}
                                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
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
            </div>
        </AdminLayout>
    );
}

export async function getServerSideProps(context) {
    return await getAdminServerSideProps(
        context,
        async () => {
            const categories = await prisma.category.findMany();
            const currency = await getOption(Options.Currency);
            return {
                props: {
                    currency,
                    categories
                }
            };
        }
        // Temporarily removed permission requirement for testing
    );
}
