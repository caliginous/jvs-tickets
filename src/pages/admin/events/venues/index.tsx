import { useSession } from "next-auth/react";
import { AdminLayout } from "../../../../components/admin/layout";
import { getAdminServerSideProps } from "../../../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../../../constants/interfaces";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "../../../../ui";
import { PlusIcon, PencilIcon, TrashIcon, MapIcon } from "@heroicons/react/solid";
import axios from "axios";
import { showToast } from "../../../../ui";
import { ManageVenueDialog } from "../../../../components/admin/dialogs/ManageVenueDialog";

interface Venue {
    id: string;
    name: string;
    address?: string;
    city?: string;
    postcode?: string;
    description?: string;
    createdAt: string;
    createdBy: {
        userName: string;
        email: string;
    };
    _count: {
        events: number;
    };
}

export default function VenuesPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const fetchVenues = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/admin/venues');
            setVenues(response.data);
        } catch (error) {
            console.error('Error fetching venues:', error);
            showToast.error('Failed to fetch venues');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (venue: Venue) => {
        try {
            await axios.delete(`/api/admin/venues/${venue.id}`);
            showToast.success('Venue deleted successfully');
            fetchVenues();
            setIsDeleteDialogOpen(false);
            setSelectedVenue(null);
        } catch (error) {
            console.error('Error deleting venue:', error);
            showToast.error('Failed to delete venue');
        }
    };

    useEffect(() => {
        fetchVenues();
    }, []);

    if (status === "loading") {
        return (
            <AdminLayout>
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="ml-3 text-gray-600">Loading venues...</div>
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

    return (
        <AdminLayout>
            <div className="pb-5 space-y-1">
                <h1 className="text-2xl font-bold pl-2">Venues Management</h1>
                
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-gray-900">Venues</h2>
                        <Button 
                            onClick={() => setIsCreateDialogOpen(true)}
                            className="flex items-center space-x-2"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Add Venue
                        </Button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-8">
                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <div className="ml-3 text-gray-600">Loading...</div>
                        </div>
                    ) : venues.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500">No venues found</p>
                            <p className="text-sm text-gray-400 mt-2">Create your first venue to get started</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Events</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {venues.map((venue) => (
                                        <tr key={venue.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {venue.name}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                <div className="flex items-center space-x-1">
                                                    <MapIcon className="w-4 h-4 text-gray-400" />
                                                    <span>
                                                        {venue.address && venue.city && venue.postcode 
                                                            ? `${venue.address}, ${venue.city} ${venue.postcode}`
                                                            : venue.address || venue.city || venue.postcode || 'No location'
                                                        }
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                                                {venue.description || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {venue._count.events} event{venue._count.events !== 1 ? 's' : ''}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatDate(venue.createdAt)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedVenue(venue);
                                                        setIsEditDialogOpen(true);
                                                    }}
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedVenue(venue);
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
            <ManageVenueDialog
                open={isCreateDialogOpen || isEditDialogOpen}
                venue={isEditDialogOpen ? selectedVenue : null}
                onClose={() => {
                    setIsCreateDialogOpen(false);
                    setIsEditDialogOpen(false);
                    setSelectedVenue(null);
                }}
                onChange={fetchVenues}
            />

            {/* Delete Confirmation Dialog */}
            {isDeleteDialogOpen && selectedVenue && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3 text-center">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Venue</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Are you sure you want to delete the venue <strong>{selectedVenue.name}</strong>? 
                                {selectedVenue._count.events > 0 && (
                                    <span className="block mt-2 text-red-600">
                                        ⚠️ This venue has {selectedVenue._count.events} event{selectedVenue._count.events !== 1 ? 's' : ''} associated with it.
                                    </span>
                                )}
                                This action cannot be undone.
                            </p>
                            <div className="flex justify-center space-x-3">
                                <Button
                                    onClick={() => {
                                        setIsDeleteDialogOpen(false);
                                        setSelectedVenue(null);
                                    }}
                                    variant="outline"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => handleDelete(selectedVenue)}
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
