import { useSession } from "next-auth/react";
import { AdminLayout } from "../../../../components/admin/layout";
import { getAdminServerSideProps } from "../../../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../../../constants/interfaces";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "../../../../ui";
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from "@heroicons/react/solid";
import axios from "axios";
import { showToast } from "../../../../ui";
import { CreateDiscountCodeDialog } from "../../../../components/admin/dialogs/CreateDiscountCodeDialog";

interface DiscountCode {
    id: string;
    code: string;
    description: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    validFrom: string;
    validUntil?: string;
    usageLimit?: number;
    isActive: boolean;
    appliesToEvents: string[];
    appliesToCategories: string[];
    minimumOrderValue?: number;
    maximumDiscount?: number;
    createdAt: string;
    createdBy: {
        userName: string;
        email: string;
    };
}

export default function DiscountCodesPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCode, setSelectedCode] = useState<DiscountCode | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [editData, setEditData] = useState<DiscountCode | null>(null);

    const fetchDiscountCodes = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/admin/discount-codes');
            setDiscountCodes(response.data);
        } catch (error) {
            console.error('Error fetching discount codes:', error);
            showToast.error('Failed to fetch discount codes');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (code: DiscountCode) => {
        try {
            await axios.delete(`/api/admin/discount-codes/${code.id}`);
            showToast.success('Discount code deleted successfully');
            fetchDiscountCodes();
            setIsDeleteDialogOpen(false);
            setSelectedCode(null);
        } catch (error) {
            console.error('Error deleting discount code:', error);
            showToast.error('Failed to delete discount code');
        }
    };

    const handleToggleActive = async (code: DiscountCode) => {
        try {
            await axios.put(`/api/admin/discount-codes/${code.id}`, {
                ...code,
                isActive: !code.isActive
            });
            showToast.success(`Discount code ${!code.isActive ? 'activated' : 'deactivated'} successfully`);
            fetchDiscountCodes();
        } catch (error) {
            console.error('Error updating discount code:', error);
            showToast.error('Failed to update discount code');
        }
    };

    useEffect(() => {
        fetchDiscountCodes();
    }, []);

    if (status === "loading") {
        return (
            <AdminLayout>
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="ml-3 text-gray-600">Loading discount codes...</div>
                </div>
            </AdminLayout>
        );
    }

    // Handle both JWT mode (session has user data directly) and database mode (session.user exists)
    const hasValidSession = session && (
        session.user || // Database mode
        ((session as any).name && (session as any).email) // JWT mode
    );
    
    if (!hasValidSession) {
        return null;
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const formatDiscountValue = (code: DiscountCode) => {
        if (code.discountType === 'percentage') {
            return `${code.discountValue}%`;
        }
        return `£${code.discountValue.toFixed(2)}`;
    };

    return (
        <AdminLayout>
            <div className="pb-5 space-y-1">
                <h1 className="text-2xl font-bold pl-2">Discount Codes Management</h1>
                
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-gray-900">Discount Codes</h2>
                        <Button 
                            onClick={() => setIsCreateDialogOpen(true)}
                            className="flex items-center space-x-2"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Add Discount Code
                        </Button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-8">
                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <div className="ml-3 text-gray-600">Loading...</div>
                        </div>
                    ) : discountCodes.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500">No discount codes found</p>
                            <p className="text-sm text-gray-400 mt-2">Create your first discount code to get started</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valid From</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valid Until</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {discountCodes.map((code) => (
                                        <tr key={code.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-900">
                                                {code.code}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                                                {code.description || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatDiscountValue(code)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatDate(code.validFrom)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {code.validUntil ? formatDate(code.validUntil) : 'No expiry'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    code.isActive 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {code.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setEditData(code);
                                                        setIsEditDialogOpen(true);
                                                    }}
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleToggleActive(code)}
                                                >
                                                    {code.isActive ? 'Deactivate' : 'Activate'}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedCode(code);
                                                        setIsDeleteDialogOpen(true);
                                                    }}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Create/Edit Dialog */}
            <CreateDiscountCodeDialog
                isOpen={isCreateDialogOpen || isEditDialogOpen}
                onClose={() => {
                    setIsCreateDialogOpen(false);
                    setIsEditDialogOpen(false);
                    setEditData(null);
                }}
                onSuccess={() => {
                    fetchDiscountCodes();
                    setIsCreateDialogOpen(false);
                    setIsEditDialogOpen(false);
                    setEditData(null);
                }}
                editData={isEditDialogOpen ? editData : null}
            />

            {/* Delete Confirmation Dialog */}
            {isDeleteDialogOpen && selectedCode && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3 text-center">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Discount Code</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Are you sure you want to delete the discount code <strong>{selectedCode.code}</strong>? 
                                This action cannot be undone.
                            </p>
                            <div className="flex justify-center space-x-3">
                                <Button
                                    onClick={() => {
                                        setIsDeleteDialogOpen(false);
                                        setSelectedCode(null);
                                    }}
                                    variant="outline"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => handleDelete(selectedCode)}
                                    variant="danger"
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

export async function getServerSideProps(context) {
    return await getAdminServerSideProps(
        context,
        async () => {
            return { props: {} };
        },
        {
            permission: PermissionSection.EventManagement,
            permissionType: PermissionType.Read
        }
    );
}


