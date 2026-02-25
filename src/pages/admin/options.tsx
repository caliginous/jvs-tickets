import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { AdminLayout } from "../../components/admin/layout";
import { getAdminServerSideProps } from "../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../constants/interfaces";
import { Button } from "../../ui";
import { showToast } from "../../ui";
import EditOptionDialog from "../../components/admin/dialogs/EditOptionDialog";
import {
    CogIcon,
    CreditCardIcon,
    TruckIcon,
    DocumentTextIcon,
    ShieldCheckIcon,
    EyeIcon,
    PencilIcon,
    TrashIcon,
    PlusIcon
} from "@heroicons/react/solid";
import axios from "axios";
import { Options } from "../../constants/Constants";

interface Option {
    id: string;
    key: string;
    value: any;
    category: string;
    description?: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required: boolean;
    editable: boolean;
}

const DEFAULT_OPTIONS: Option[] = [
    {
        id: '1',
        key: 'shop.title',
        value: 'JVS Tickets',
        category: 'shop',
        description: 'Main shop title displayed on the homepage',
        type: 'string',
        required: true,
        editable: true
    },
    {
        id: '2',
        key: 'shop.subtitle',
        value: 'Events and Tickets',
        category: 'shop',
        description: 'Shop subtitle displayed below the main title',
        type: 'string',
        required: false,
        editable: true
    },
    {
        id: '3',
        key: 'payment.currency',
        value: 'GBP',
        category: 'payment',
        description: 'Default currency for all transactions',
        type: 'string',
        required: true,
        editable: true
    },
    // Email Common Settings
    {
        id: '4',
        key: 'email.support-email',
        value: 'support@jvs.org.uk',
        category: 'email',
        description: 'Support email address used in email templates',
        type: 'string',
        required: true,
        editable: true
    },
    {
        id: '5',
        key: 'email.app-name',
        value: 'JVS Events',
        category: 'email',
        description: 'Application name displayed in email templates',
        type: 'string',
        required: true,
        editable: true
    },
    {
        id: '6',
        key: 'email.app-url',
        value: 'https://jvs.org.uk',
        category: 'email',
        description: 'Application URL used in email templates',
        type: 'string',
        required: true,
        editable: true
    },
    {
        id: '7',
        key: 'email.sender-name',
        value: 'JVS Events',
        category: 'email',
        description: 'Default sender name for emails',
        type: 'string',
        required: true,
        editable: true
    }
];

export default function OptionsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [options, setOptions] = useState<Option[]>(DEFAULT_OPTIONS);
    const [loading, setLoading] = useState(true);
    const [selectedOption, setSelectedOption] = useState<Option | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    // Remove the fetchOptions function since we're loading options directly in useEffect
    
    const handleDelete = async (option: Option) => {
        try {
            setOptions(prev => prev.filter(opt => opt.id !== option.id));
            setIsDeleteDialogOpen(false);
            setSelectedOption(null);
            showToast.success('Option deleted successfully');
        } catch (error) {
            console.error('Error deleting option:', error);
            showToast.error('Failed to delete option');
        }
    };

    const handleEdit = (option: Option) => {
        setSelectedOption(option);
        setIsEditDialogOpen(true);
    };

    const handleSave = async (key: string, value: any) => {
        try {
            // Call the backend API to save the option
            await axios.post("/api/admin/options", {
                key: key,
                value: value
            });
            
            // Update local state after successful save
            setOptions(prev => prev.map(opt =>
                opt.key === key ? { ...opt, value } : opt
            ));
            
            showToast.success('Option updated successfully');
        } catch (error) {
            console.error('Error saving option:', error);
            showToast.error('Failed to save option');
        }
    };

    useEffect(() => {
        const loadOptions = async () => {
            try {
                setLoading(true);
                
                // Load actual values from backend for email settings
                const emailOptions = [
                    Options.EmailSupportEmail,
                    Options.EmailAppName,
                    Options.EmailAppUrl,
                    Options.EmailSenderName
                ];
                
                // Add timeout to prevent infinite loading
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Loading timeout')), 10000); // 10 second timeout
                });
                
                const loadPromise = Promise.all(
                    emailOptions.map(async (key) => {
                        try {
                            const response = await axios.get(`/api/admin/options?key=${key}`);
                            // If the option exists in the database, use that value
                            if (response.data.value !== null) {
                                return response.data.value;
                            } else {
                                // If option doesn't exist in database, use default value
                                const defaultOption = DEFAULT_OPTIONS.find(opt => opt.key === key);
                                return defaultOption ? defaultOption.value : null;
                            }
                        } catch (error) {
                            console.error(`Error loading option ${key}:`, error);
                            // Return the default value from DEFAULT_OPTIONS if loading fails
                            const defaultOption = DEFAULT_OPTIONS.find(opt => opt.key === key);
                            return defaultOption ? defaultOption.value : null;
                        }
                    })
                );
                
                const loadedOptions = await Promise.race([loadPromise, timeoutPromise]);
                
                // Update options with real values from backend
                setOptions(prev => prev.map(option => {
                    const index = emailOptions.indexOf(option.key as Options);
                    if (index !== -1 && loadedOptions[index] !== null) {
                        return { ...option, value: loadedOptions[index] };
                    }
                    return option;
                }));
                
                // Create any missing email options in the database
                await Promise.all(
                    emailOptions.map(async (key, index) => {
                        if (loadedOptions[index] === null) {
                            // Option doesn't exist in database, create it with default value
                            const defaultOption = DEFAULT_OPTIONS.find(opt => opt.key === key);
                            if (defaultOption) {
                                try {
                                    await axios.post("/api/admin/options", {
                                        key: key,
                                        value: defaultOption.value
                                    });
                                    console.log(`Created missing option: ${key}`);
                                } catch (error) {
                                    console.error(`Failed to create option ${key}:`, error);
                                }
                            }
                        }
                    })
                );
            } catch (error) {
                console.error('Error loading options:', error);
                // On error, just use the default options
                setOptions(DEFAULT_OPTIONS);
            } finally {
                setLoading(false);
            }
        };
        
        loadOptions();
    }, []);

    // Handle both JWT mode (session has user data directly) and database mode (session.user exists)
    const hasValidSession = session && (
        session.user || // Database mode
        ((session as any).name && (session as any).email) // JWT mode
    );

    // Only show loading during genuine session loading, not on tab switches
    if (status === "loading") {
        return (
            <AdminLayout>
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="ml-3 text-gray-600">Loading options...</div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">System Options</h1>
                    <p className="mt-2 text-gray-600">
                        Configure shop settings, payment methods, delivery options, and system templates
                    </p>
                </div>

                {/* Options Grid */}
                {loading ? (
                    <div className="flex justify-center items-center min-h-[400px]">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <div className="ml-3 text-gray-600">Loading options...</div>
                    </div>
                ) : options.length === 0 ? (
                    <div className="text-center py-12">
                        <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No options found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Get started by creating a new option.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {options.map((option) => (
                            <div key={option.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="text-sm font-medium text-gray-900">{option.key}</h3>
                                        <p className="text-xs text-gray-500">{option.category}</p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedOption(option)}
                                        >
                                            <EyeIcon className="h-4 w-4" />
                                        </Button>
                                        {option.editable && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEdit(option)}
                                            >
                                                <PencilIcon className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {!option.required && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedOption(option);
                                                    setIsDeleteDialogOpen(true);
                                                }}
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                
                                {option.description && (
                                    <p className="mt-3 text-sm text-gray-600">
                                        {option.description}
                                    </p>
                                )}
                                
                                <div className="mt-4">
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span className="capitalize">{option.type}</span>
                                        {option.required && (
                                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                                Required
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                                        <p className="text-sm font-mono text-gray-700 break-all">
                                            {typeof option.value === 'object' 
                                                ? JSON.stringify(option.value, null, 2)
                                                : String(option.value)
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            {isDeleteDialogOpen && selectedOption && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3 text-center">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Option</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Are you sure you want to delete the option &quot;{selectedOption.key}&quot;? This action cannot be undone.
                            </p>
                            <div className="flex justify-center space-x-3">
                                <Button
                                    onClick={() => setIsDeleteDialogOpen(false)}
                                    variant="outline"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => handleDelete(selectedOption)}
                                    variant="danger"
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Option Dialog */}
            <EditOptionDialog
                isOpen={isEditDialogOpen}
                onClose={() => {
                    setIsEditDialogOpen(false);
                    setSelectedOption(null);
                }}
                option={selectedOption}
                onSave={handleSave}
            />
        </AdminLayout>
    );
}

export async function getServerSideProps(context) {
    return getAdminServerSideProps(
        context,
        async () => {
            return { props: {} };
        },
        {
            permission: PermissionSection.Options,
            permissionType: PermissionType.Read
        }
    );
}
