import { useSession } from "next-auth/react";
import { AdminLayout } from "../../../../components/admin/layout";
import { getAdminServerSideProps } from "../../../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../../../constants/interfaces";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "../../../../ui";
import { PlusIcon, PencilIcon, TrashIcon, ViewGridIcon, EyeIcon } from "@heroicons/react/solid";
import axios from "axios";
import { showToast } from "../../../../ui";

interface SeatMap {
    id: string;
    definition: string;
    createdAt: string;
    updatedAt: string;
}

export default function SeatMapsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [seatMaps, setSeatMaps] = useState<SeatMap[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSeatMap, setSelectedSeatMap] = useState<SeatMap | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const fetchSeatMaps = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/admin/seatmap');
            setSeatMaps(response.data);
        } catch (error) {
            console.error('Error fetching seat maps:', error);
            showToast.error('Failed to fetch seat maps');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (seatMap: SeatMap) => {
        try {
            await axios.delete(`/api/admin/seatmap/${seatMap.id}`);
            showToast.success('Seat map deleted successfully');
            fetchSeatMaps();
            setIsDeleteDialogOpen(false);
            setSelectedSeatMap(null);
        } catch (error) {
            console.error('Error deleting seat map:', error);
            showToast.error('Failed to delete seat map');
        }
    };

    const handlePreview = (seatMap: SeatMap) => {
        setSelectedSeatMap(seatMap);
        setIsPreviewOpen(true);
    };

    useEffect(() => {
        fetchSeatMaps();
    }, []);

    if (status === "loading") {
        return (
            <AdminLayout>
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="ml-3 text-gray-600">Loading seat maps...</div>
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

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    const getSeatMapInfo = (definition: string) => {
        try {
            const parsed = JSON.parse(definition);
            if (parsed && typeof parsed === 'object') {
                const rows = parsed.rows || 0;
                const cols = parsed.cols || 0;
                const seats = parsed.seats || [];
                return {
                    rows,
                    cols,
                    totalSeats: seats.length,
                    isValid: true
                };
            }
        } catch (e) {
            // Invalid JSON
        }
        return { rows: 0, cols: 0, totalSeats: 0, isValid: false };
    };

    return (
        <AdminLayout>
            <div className="pb-5 space-y-1">
                <h1 className="text-2xl font-bold pl-2">Seat Maps Management</h1>
                
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-gray-900">Seat Maps</h2>
                        <Button 
                            onClick={() => setIsCreateDialogOpen(true)}
                            className="flex items-center space-x-2"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Add Seat Map
                        </Button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-8">
                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <div className="ml-3 text-gray-600">Loading...</div>
                        </div>
                    ) : seatMaps.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500">No seat maps found</p>
                            <p className="text-sm text-gray-400 mt-2">Create your first seat map to get started</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Layout</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {seatMaps.map((seatMap) => {
                                        const info = getSeatMapInfo(seatMap.definition);
                                        return (
                                            <tr key={seatMap.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                                                    {seatMap.id}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900">
                                                    <div className="flex items-center space-x-2">
                                                        <ViewGridIcon className="w-4 h-4 text-gray-400" />
                                                        <span>
                                                            {info.isValid 
                                                                ? `${info.rows} × ${info.cols} (${info.totalSeats} seats)`
                                                                : 'Invalid format'
                                                            }
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                        info.isValid 
                                                            ? 'bg-green-100 text-green-800' 
                                                            : 'bg-red-100 text-red-800'
                                                    }`}>
                                                        {info.isValid ? 'Valid' : 'Invalid'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <div>
                                                        <div>{formatDate(seatMap.createdAt)}</div>
                                                        <div className="text-xs text-gray-500">{formatTime(seatMap.createdAt)}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <div>
                                                        <div>{formatDate(seatMap.updatedAt)}</div>
                                                        <div className="text-xs text-gray-500">{formatTime(seatMap.updatedAt)}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handlePreview(seatMap)}
                                                        disabled={!info.isValid}
                                                    >
                                                        <EyeIcon className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSelectedSeatMap(seatMap);
                                                            setIsEditDialogOpen(true);
                                                        }}
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSelectedSeatMap(seatMap);
                                                            setIsDeleteDialogOpen(true);
                                                        }}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </Button>
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

            {/* Create/Edit Dialog Placeholder */}
            {(isCreateDialogOpen || isEditDialogOpen) && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3 text-center">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                {isCreateDialogOpen ? 'Create Seat Map' : 'Edit Seat Map'}
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">
                                {isCreateDialogOpen 
                                    ? 'Create a new seat map for your events' 
                                    : 'Edit the selected seat map'
                                }
                            </p>
                            <div className="flex justify-center space-x-3">
                                <Button
                                    onClick={() => {
                                        setIsCreateDialogOpen(false);
                                        setIsEditDialogOpen(false);
                                        setSelectedSeatMap(null);
                                    }}
                                    variant="outline"
                                >
                                    Close
                                </Button>
                                <Button
                                    onClick={() => {
                                        showToast.success('Seat map dialog functionality coming soon');
                                    }}
                                >
                                    {isCreateDialogOpen ? 'Create' : 'Save'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Dialog */}
            {isPreviewOpen && selectedSeatMap && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-3/4 max-w-4xl shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-900">Seat Map Preview</h3>
                                <Button
                                    onClick={() => {
                                        setIsPreviewOpen(false);
                                        setSelectedSeatMap(null);
                                    }}
                                    variant="outline"
                                >
                                    Close
                                </Button>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-600 mb-4">
                                    Seat map ID: <span className="font-mono">{selectedSeatMap.id}</span>
                                </p>
                                <div className="bg-white p-4 rounded border">
                                    <pre className="text-xs text-gray-700 overflow-auto max-h-96">
                                        {JSON.stringify(JSON.parse(selectedSeatMap.definition), null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            {isDeleteDialogOpen && selectedSeatMap && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3 text-center">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Seat Map</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Are you sure you want to delete the seat map <strong>ID: {selectedSeatMap.id}</strong>? 
                                This action cannot be undone.
                            </p>
                            <div className="flex justify-center space-x-3">
                                <Button
                                    onClick={() => {
                                        setIsDeleteDialogOpen(false);
                                        setSelectedSeatMap(null);
                                    }}
                                    variant="outline"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => handleDelete(selectedSeatMap)}
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
            permission: PermissionSection.EventSeatMaps,
            permissionType: PermissionType.Read
        }
    );
}
