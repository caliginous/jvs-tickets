import { useSession } from "next-auth/react";
import { AdminLayout } from "../../components/admin/layout";
import Link from "next/link";
import { getAdminServerSideProps } from "../../constants/serverUtil";
import { computeAvailability } from "../../lib/services/ticketing/availability";
import prisma from "../../lib/prisma";
import { InformationCircleIcon, CheckIcon, XIcon, EyeIcon, DownloadIcon, CurrencyPoundIcon, XCircleIcon, TrashIcon, LightningBoltIcon } from "@heroicons/react/solid";
import * as React from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import { PaymentType } from "../../store/factories/payment/PaymentFactory";
import { OrderDetailsDialog } from "../../components/admin/dialogs/OrderDetailsDialog";
import { PermissionSection, PermissionType } from "../../constants/interfaces";
import { useRouter } from "next/router";
import { NextPageContext } from "next";
import { MarkOrdersAsPayedDialog } from "../../components/admin/dialogs/MarkOrdersAsPayedDialog";
import axios from "axios";
import { OrderFilter } from "../../components/admin/OrderFilter";
import { SelectionList } from "../../components/admin/SelectionList";
import { FullSizeLoading } from "../../components/FullSizeLoading";
import AddOrderWithTicketTypes from "../../components/admin/dialogs/AddOrderWithTicketTypes";

import omitBy from "lodash/omitBy";
import isEmpty from "lodash/isEmpty";
import { hasPayedIcon } from "../../components/admin/OrderInformationDetails";
import { getEventTitle } from "../../constants/util";
import { getOption } from "../../lib/options";
import { Options } from "../../constants/Constants";
import { SaveButton } from "../../components/admin/SaveButton";
import { Button, Select, Dialog, showToast } from "../../ui";
import { DataTable, Pagination } from "../../components/ui";
import RefundDialog from "../../components/admin/RefundDialog";
import OrderSearchBar from "../../components/admin/OrderSearchBar";
import OrderQuickFilters from "../../components/admin/OrderQuickFilters";
import CancellationDialog from "../../components/admin/CancellationDialog";
import { DeleteOrderDialog } from "../../components/admin/dialogs/DeleteOrderDialog";
import { BulkDeleteOrdersDialog } from "../../components/admin/dialogs/BulkDeleteOrdersDialog";










export default function Orders({ permissionDenied, count, eventDates, events, paymentFees, currency, shippingFees}) {
    const { data: session } = useSession();
    const [orders, setOrders] = useState([]);
    const [order, setOrder] = useState(null);
    const [markAsPaidOpen, setMarkAsPaidOpen] = useState(false);
    const [addOrderNewOpen, setAddOrderNewOpen] = useState(false);


    const [refundDialogOpen, setRefundDialogOpen] = useState(false);
    const [selectedOrderForRefund, setSelectedOrderForRefund] = useState(null);
    const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
    const [selectedOrderForCancellation, setSelectedOrderForCancellation] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedOrderForDelete, setSelectedOrderForDelete] = useState(null);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [amount, setAmount] = useState("25");
    const [page, setPage] = useState("0");
    const router = useRouter();
    const filter = useRef({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [totalPages, setTotalPages] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [activeFilters, setActiveFilters] = useState<{[key: string]: string}>({});

    // Replace MUI useMediaQuery with custom hook
    const [isMdDown, setIsMdDown] = useState(false);
    
    useEffect(() => {
        const checkMediaQuery = () => {
            setIsMdDown(window.innerWidth < 768); // md breakpoint
        };
        
        checkMediaQuery();
        window.addEventListener('resize', checkMediaQuery);
        return () => window.removeEventListener('resize', checkMediaQuery);
    }, []);

    const getOrderUrl = (additionalParams = {}): string => {
        // Custom function to check if a value should be omitted
        const shouldOmit = (value: any) => {
            if (value === null || value === undefined) return true;
            if (typeof value === 'string' && value.trim() === '') return true;
            if (Array.isArray(value) && value.length === 0) return true;
            if (typeof value === 'object' && Object.keys(value).length === 0) return true;
            return false;
        };

        // Ensure filter.current exists and is an object
        const currentFilter = filter.current || {};
        const safeAdditionalParams = additionalParams || {};

        const filterParams = Object.fromEntries(
            Object.entries(currentFilter).filter(([_, value]) => !shouldOmit(value))
        );
        const additionalParamsFiltered = Object.fromEntries(
            Object.entries(safeAdditionalParams).filter(([_, value]) => !shouldOmit(value))
        );
        
        // Convert all values to strings for URLSearchParams
        const stringifiedFilterParams = Object.fromEntries(
            Object.entries(filterParams).map(([key, value]) => [key, String(value)])
        );
        const stringifiedAdditionalParams = Object.fromEntries(
            Object.entries(additionalParamsFiltered).map(([key, value]) => [key, String(value)])
        );
        
        const url = "api/admin/order?" + new URLSearchParams({...stringifiedFilterParams, ...stringifiedAdditionalParams});
        return url;
    }

    const loadOrders = useCallback(async (newFilter) => {
        setLoading(true);
        setError(null);
        
        try {
            // Ensure filter is properly initialized
            filter.current = {
                ...(newFilter || {}),
                ...({amount: amount || "25", page: page || "0"})
            };
            
            // Add search query to filter if present
            if (searchQuery) {
                (filter.current as any).search = searchQuery;
            }
            
            const url = getOrderUrl();
            const response = await axios.get(url, { withCredentials: true });
            const ordersData = response.data?.orders;
            
            // Validate and sanitize orders data
            if (Array.isArray(ordersData)) {
                const sanitizedOrders = ordersData.map(order => {
                    // Ensure order has required properties
                    if (!order || typeof order !== 'object') return null;
                    
                    try {
                        return {
                            ...order,
                            id: order.id || `order_${Date.now()}_${Math.random()}`,
                            user: order.user && typeof order.user === 'object' ? order.user : {},
                            tickets: Array.isArray(order.tickets) ? order.tickets : [],
                            eventDate: order.eventDate || null,
                            date: order.date || null,
                            status: order.status || 'UNKNOWN',
                            paymentResult: order.paymentResult || null,
                            shipping: order.shipping || null,
                            finalTotal: order.finalTotal || 0,
                            originalTotal: order.originalTotal || 0
                        };
                    } catch (error) {
                        console.error('Error sanitizing order:', error, order);
                        return null;
                    }
                }).filter(Boolean); // Remove null orders
                
                setOrders(sanitizedOrders);
            } else {
                console.warn('Orders data is not an array:', ordersData);
                setOrders([]);
            }
            
            const total = response.data?.total || 0;
            const pageSize = parseInt(amount) || 25;
            setTotalPages(Math.ceil(total / pageSize));
        } catch (e: any) {
            console.error('load orders failed', e?.response?.status, e?.message);
            setError(e?.response?.data?.error || e?.message || 'Failed to load orders');
            setOrders([]);
            setTotalPages(0);
        } finally {
            setLoading(false);
        }
    }, [amount, page, searchQuery]);

    // Search handlers
    const handleSearch = useCallback(async (query) => {
        setSearchQuery(query);
        setSearchLoading(true);
        
        // Update active filters
        if (query.trim()) {
            setActiveFilters(prev => ({ ...prev, search: query }));
        } else {
            setActiveFilters(prev => {
                const newFilters = { ...prev };
                delete newFilters.search;
                return newFilters;
            });
        }
        
        try {
            // Reset to first page when searching
            setPage("0");
            await loadOrders({ ...filter.current, search: query, page: "0" });
        } finally {
            setSearchLoading(false);
        }
    }, [loadOrders]);

    const handleQuickFilter = useCallback(async (query, label, filterId) => {
        setSearchLoading(true);
        
        // Update active filters
        setActiveFilters(prev => ({ ...prev, [filterId]: label }));
        
        try {
            // Reset to first page when applying quick filter
            setPage("0");
            
            // Parse quick filter query
            let filterParams = {};
            if (query === 'today') {
                filterParams = { today: 'true' };
            } else if (query.startsWith('status:')) {
                filterParams = { search: query };
            } else if (query.startsWith('recent:')) {
                filterParams = { recent: query.split(':')[1] };
            } else {
                filterParams = { search: query };
            }
            
            await loadOrders({ ...filterParams, page: "0" });
        } finally {
            setSearchLoading(false);
        }
    }, [loadOrders]);

    const handleClearAllFilters = useCallback(async () => {
        setSearchQuery('');
        setActiveFilters({});
        setSearchLoading(true);
        
        try {
            setPage("0");
            await loadOrders({ page: "0" });
            showToast.success('All filters cleared');
        } finally {
            setSearchLoading(false);
        }
    }, [loadOrders]);

    useEffect(() => {
        if (!session) return;
        loadOrders(filter.current || {}).catch(console.log);
    }, [session, loadOrders]);


    // Let AdminLayout handle authentication based on server-side props
    // Only show loading during genuine session loading, not on tab switches
    const { status } = useSession();
    if (status === "loading") {
        return (
            <AdminLayout permissionDenied={permissionDenied}>
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="ml-3 text-gray-600">Loading orders...</div>
                </div>
            </AdminLayout>
        );
    }

    const refreshProps = async () => {
        await router.replace(router.asPath);
    };

    const handleCloseDetails = () => {
        setOrder(null);
    };

    const handleRefundClick = (order, e) => {
        e.stopPropagation();
        setSelectedOrderForRefund(order);
        setRefundDialogOpen(true);
    };

    const handleRefundClose = () => {
        setRefundDialogOpen(false);
        setSelectedOrderForRefund(null);
    };

    const handleRefundSuccess = () => {
        setRefundDialogOpen(false);
        setSelectedOrderForRefund(null);
        loadOrders(filter.current || {});
    };

    const handleCancellationClick = (order, e) => {
        e.stopPropagation();
        setSelectedOrderForCancellation(order);
        setCancellationDialogOpen(true);
    };

    const handleCancellationClose = () => {
        setCancellationDialogOpen(false);
        setSelectedOrderForCancellation(null);
    };

    const handleCancellationSuccess = () => {
        setCancellationDialogOpen(false);
        setSelectedOrderForCancellation(null);
        loadOrders(filter.current || {});
    };

    const handleDeleteClick = (order, e) => {
        e.stopPropagation();
        setSelectedOrderForDelete(order);
        setDeleteDialogOpen(true);
    };

    const handleDeleteClose = () => {
        setDeleteDialogOpen(false);
        setSelectedOrderForDelete(null);
    };

    const handleDeleteSuccess = async () => {
        setDeleteDialogOpen(false);
        setSelectedOrderForDelete(null);
        await loadOrders(filter.current || {});
    };

    const handleBulkDeleteClick = () => {
        if (selectedOrders.length === 0) return;
        setBulkDeleteDialogOpen(true);
    };

    const handleBulkMarkAsPaidClick = async () => {
        if (selectedOrders.length === 0) return;
        
        try {
            setIsDeleting(true); // Reuse this loading state
            const validOrderIds = selectedOrders
                .filter(o => o && o.id)
                .map(o => o.id);

            // Use the existing bulk paid API pattern
            const response = await axios.post('/api/admin/order/bulk-mark-paid', {
                orderIds: validOrderIds
            });

            if (response.status === 200) {
                showToast.success(`Successfully marked ${validOrderIds.length} orders as paid`);
                
                // Track admin action
                if (typeof window !== 'undefined') {
                    import('../../lib/analytics').then(({ trackAdminAction }) => {
                        trackAdminAction({
                            actionType: 'bulk_mark_paid',
                            resource: 'order',
                            count: validOrderIds.length
                        });
                    }).catch(console.warn);
                }
                
                setSelectedOrders([]);
                
                // Force reload the orders to show updated payment status
                setLoading(true);
                try {
                    // Small delay to ensure database has processed updates
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await loadOrders(filter.current || {});
                } finally {
                    setLoading(false);
                }
            }
        } catch (error) {
            console.error('Error marking orders as paid:', error);
            showToast.error('Error marking orders as paid: ' + (error.response?.data?.error || error.message));
        } finally {
            setIsDeleting(false);
        }
    };

    const handleBulkDeleteClose = () => {
        setBulkDeleteDialogOpen(false);
    };

    const handleBulkDeleteSuccess = async () => {
        setBulkDeleteDialogOpen(false);
        setSelectedOrders([]);
        await loadOrders(filter.current || {});
    };

    const handleOrderSelectionChange = (orderId, isSelected) => {
        if (isSelected) {
            const order = orders.find(o => o && o.id === orderId);
            if (order) {
                setSelectedOrders(prev => [...prev, order]);
            }
        } else {
            setSelectedOrders(prev => prev.filter(o => o && o.id !== orderId));
        }
    };

    const handleSelectAllOrders = (isSelected) => {
        if (isSelected) {
            const validOrders = orders.filter(o => o && o.id);
            setSelectedOrders([...validOrders]);
        } else {
            setSelectedOrders([]);
        }
    };


    const handlePageChange = (newPage: number) => {
        if (newPage >= 0 && typeof newPage === 'number') {
            setPage(newPage.toString());
        }
    }



    

    const exportCsv = () => {
        try {
            const url = getOrderUrl({amount: "", page: "", exportFile: "csv"});
            window.location.href = window.location.origin + "/" + url;
        } catch (error) {
            console.error('Failed to export CSV:', error);
            showToast.error('Failed to export CSV');
        }
    }

    const downloadInvoices = async () => {
        try {
            const safeFilter = filter.current || {};
            const response = await axios.get("/api/admin/order/invoice?" + new URLSearchParams(omitBy(safeFilter, isEmpty)));
            const blob = await (await fetch(response.data)).blob();
            window.open(URL.createObjectURL(blob));
        } catch (error) {
            console.error('Failed to download invoices:', error);
            showToast.error('Failed to download invoices');
        }
    }

    return (
        <AdminLayout permissionDenied={permissionDenied}>
            <>
                <OrderDetailsDialog
                order={order}
                onClose={handleCloseDetails}
                onMarkAsPayed={() => loadOrders(filter.current || {})}
                onMarkAsShipped={() => loadOrders(filter.current || {})}
                onDelete={() => loadOrders(filter.current || {})}
            />
            <MarkOrdersAsPayedDialog
                open={markAsPaidOpen}
                onClose={async () => {
                    await refreshProps();
                    setMarkAsPaidOpen(false);
                }}
                currency={currency}
            />

            <AddOrderWithTicketTypes
                open={addOrderNewOpen}
                onClose={() => setAddOrderNewOpen(false)}
                onOrderCreated={(orderId) => {
                    console.log('Order created with ticket types:', orderId);
                    loadOrders(filter.current || {});
                    showToast.success('Order created successfully with ticket types!');
                }}
                events={events}
                eventDates={eventDates}
            />

            <div className="pb-5">
                <h1 className="text-2xl font-bold">Orders</h1>
            </div>
            {/* Primary Action Buttons */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Quick Actions</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                        className={isMdDown ? "w-full" : ""}
                        variant="secondary"
                        onClick={() => setMarkAsPaidOpen(true)}
                    >
                        Mark orders as paid
                    </Button>
                    <Button
                        className={isMdDown ? "w-full" : ""}
                        variant="secondary"
                        onClick={() => setAddOrderNewOpen(true)}
                    >
                        Add Order (Ticket Types)
                    </Button>

                    <SaveButton
                        className={isMdDown ? "w-full" : ""}
                        action={downloadInvoices}
                    >
                        Download Invoices
                    </SaveButton>
                    {selectedOrders.length > 0 && (
                        <>
                            <Button
                                className={isMdDown ? "w-full" : ""}
                                variant="secondary"
                                onClick={handleBulkMarkAsPaidClick}
                            >
                                <CheckIcon className="w-4 h-4 mr-2" />
                                Mark Selected as Paid ({selectedOrders.length})
                            </Button>
                            <Button
                                className={isMdDown ? "w-full" : ""}
                                variant="danger"
                                onClick={handleBulkDeleteClick}
                            >
                                <TrashIcon className="w-4 h-4 mr-2" />
                                Delete Selected ({selectedOrders.length})
                            </Button>
                        </>
                    )}
                </div>
            </div>
            
            {/* Enhanced Search & Filter Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
                {/* Section Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Search & Filter Orders</h3>
                    {Object.keys(activeFilters).length > 0 && (
                        <button
                            onClick={handleClearAllFilters}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <XIcon className="w-4 h-4 mr-1.5" />
                            Clear All Filters
                        </button>
                    )}
                </div>

                {/* Search Bar */}
                <div className="mb-4">
                    <OrderSearchBar
                        onSearch={handleSearch}
                        loading={searchLoading}
                        value={searchQuery}
                        className="w-full"
                    />
                </div>
                    
                {/* Quick Filters */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Quick Filters</label>
                        <span className="text-xs text-gray-500">
                            {Object.keys(activeFilters).length > 0 && 
                                `${Object.keys(activeFilters).length} filter${Object.keys(activeFilters).length > 1 ? 's' : ''} applied`
                            }
                        </span>
                    </div>
                    <OrderQuickFilters
                        onFilterSelect={(query, label, filterId) => handleQuickFilter(query, label, filterId)}
                        activeFilters={activeFilters}
                        className=""
                    />
                </div>

                {/* Active Filters Display */}
                {Object.keys(activeFilters).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">Active Filters:</span>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(activeFilters).map(([key, value]) => (
                                    <span
                                        key={key}
                                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                    >
                                        {key === 'search' ? `Search: "${value}"` : value}
                                        <button
                                            onClick={() => {
                                                const newFilters = { ...activeFilters };
                                                delete newFilters[key];
                                                setActiveFilters(newFilters);
                                                
                                                if (key === 'search') {
                                                    setSearchQuery('');
                                                    handleSearch('');
                                                } else {
                                                    // Clear the specific filter
                                                    handleClearAllFilters();
                                                }
                                            }}
                                            className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200"
                                        >
                                            <XIcon className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
                
            <div className="flex justify-end items-center gap-2">
                <OrderFilter
                        filterChanged={loadOrders}
                        events={events}
                    />

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={exportCsv}
                    title="Download all orders matching current filters as csv file"
                >
                    <DownloadIcon className="w-4 h-4" />
                </Button>
            </div>
            <div className="relative">
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <XCircleIcon className="h-5 w-5 text-red-400" />
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">
                                    Error loading orders
                                </h3>
                                <div className="mt-2 text-sm text-red-700">
                                    <p>{error}</p>
                                </div>
                                <div className="mt-4">
                                    <div className="-mx-2 -my-1.5 flex">
                                        <button
                                            type="button"
                                            className="bg-red-50 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                                            onClick={() => loadOrders(filter.current)}
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {(orders?.length ?? 0) === 0 && !loading && !error ? (
                    <p className="text-base text-gray-900">
                        No orders available yet
                    </p>
                ) : (
                    <div className="mb-4">
                        <DataTable
                            columns={[
                                {
                                    header: "Select",
                                    cell: ({ row }) => (
                                        <input
                                            type="checkbox"
                                            checked={selectedOrders.some(o => o && o.id === row.original.id)}
                                            onChange={(e) => {
                                                if (row.original && row.original.id) {
                                                    handleOrderSelectionChange(row.original.id, e.target.checked);
                                                }
                                            }}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    )
                                },
                                {
                                    header: "Event",
                                    cell: ({ row }) => {
                                        const eventDate = row.original.eventDate;
                                        if (!eventDate) {
                                            return <span className="text-gray-500">No event data</span>;
                                        }
                                        return (
                                            <Link href="/admin/events" passHref>
                                                <a className="text-blue-600 hover:underline cursor-pointer">
                                                    {getEventTitle(eventDate)}
                                                </a>
                                            </Link>
                                        );
                                    }
                                },
                                {
                                    header: "Order",
                                    cell: ({ row }) => {
                                        const tickets = row.original.tickets;
                                        return Array.isArray(tickets) ? tickets.length : 0;
                                    }
                                },
                                {
                                    header: "Status",
                                    cell: ({ row }) => {
                                        const status = row.original.status;
                                        const badges = {
                                            'PAID': { bg: 'bg-green-100', text: 'text-green-800', label: 'PAID', icon: '✓' },
                                            'CONFIRMED': { bg: 'bg-green-100', text: 'text-green-800', label: 'CONFIRMED', icon: '✓' },
                                            'COMPLETED': { bg: 'bg-green-100', text: 'text-green-800', label: 'COMPLETED', icon: '✓' },
                                            'PENDING': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'PENDING', icon: '⏳' },
                                            'EXPIRED': { bg: 'bg-gray-100', text: 'text-gray-600', label: 'EXPIRED', icon: '⏰' },
                                            'CANCELLED': { bg: 'bg-red-100', text: 'text-red-800', label: 'CANCELLED', icon: '✗' },
                                            'REFUNDED': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'REFUNDED', icon: '↩' },
                                        };
                                        const badge = badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status, icon: '?' };
                                        
                                        return (
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                                                <span className="mr-1">{badge.icon}</span>
                                                {badge.label}
                                            </span>
                                        );
                                    }
                                },
                                {
                                    header: "Customer",
                                    cell: ({ row }) => {
                                        // Helper function to get the best available address
                                        const getBestAddress = (order) => {
                                            try {
                                                // Safely access user data with fallbacks
                                                const user = order.user || {};
                                                const firstName = user.firstName || 'Unknown';
                                                const lastName = user.lastName || 'Unknown';
                                                
                                                if (order.shipping) {
                                                    try {
                                                        // First check if it's already a string value like "standard"
                                                        if (typeof order.shipping === 'string' && !order.shipping.startsWith('{')) {
                                                            // This is a legacy shipping method like "standard", not JSON
                                                            // Skip parsing and continue to fallback
                                                        } else {
                                                            const shipping = JSON.parse(order.shipping);
                                                            // Check if this is the new Stripe address format
                                                            if (shipping && shipping.line1 && shipping.city) {
                                                                return {
                                                                    name: shipping.name || `${firstName} ${lastName}`,
                                                                    address: shipping.line1 || 'Address not provided',
                                                                    city: shipping.city || 'City not provided',
                                                                    zip: shipping.postal_code || 'ZIP not provided',
                                                                    state: shipping.state || '',
                                                                    country: shipping.country || ''
                                                                };
                                                            }
                                                        }
                                                    } catch (parseError) {
                                                        console.warn('Failed to parse shipping data:', parseError, 'Raw data:', order.shipping);
                                                        // Continue to fallback - don't throw error
                                                    }
                                                }
                                                // Fallback to user data with safe access
                                                return {
                                                    name: `${firstName} ${lastName}`,
                                                    address: user.address || 'Address not provided',
                                                    city: user.city || 'City not provided',
                                                    zip: user.zip || 'ZIP not provided',
                                                    state: user.regionCode || '',
                                                    country: user.countryCode || ''
                                                };
                                            } catch (error) {
                                                console.error('Error getting address:', error);
                                                return {
                                                    name: 'Unknown Customer',
                                                    address: 'Address not provided',
                                                    city: 'City not provided',
                                                    zip: 'ZIP not provided',
                                                    state: '',
                                                    country: ''
                                                };
                                            }
                                        };
                                        
                                        const address = getBestAddress(row.original);
                                        
                                        return (
                                            <div>
                                                <div className="font-medium">{address.name || 'Unknown Customer'}</div>
                                                <div className="text-xs text-gray-500">
                                                    {address.address && address.address !== 'Address not provided' ? address.address : 'Address from Stripe'}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {address.zip && address.zip !== 'ZIP not provided' ? address.zip : ''} {address.city && address.city !== 'City not provided' ? address.city : ''}
                                                </div>
                                            </div>
                                        );
                                    }
                                },
                                {
                                    header: "Date",
                                    cell: ({ row }) => {
                                        const date = row.original.date;
                                        if (!date) {
                                            return <span className="text-gray-500">No date</span>;
                                        }
                                        try {
                                            return new Intl.DateTimeFormat('en-GB', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                timeZone: 'Europe/London'
                                            }).format(new Date(date));
                                        } catch (error) {
                                            return <span className="text-gray-500">Invalid date</span>;
                                        }
                                    }
                                },
                                {
                                    header: "Custom Info",
                                    cell: ({ row }) => {
                                        const customFields = row.original.user?.customFields;
                                        const eventCustomFields = row.original.eventDate?.event?.customFields;
                                        
                                        if (!customFields) {
                                            return <span className="text-gray-400 text-xs">-</span>;
                                        }
                                        
                                        try {
                                            const { formatCustomFieldsSummary } = require('../../utils/customFieldsFormatter');
                                            const summary = formatCustomFieldsSummary(customFields, eventCustomFields, 40);
                                            
                                            return (
                                                <div className="text-xs text-gray-600" title={formatCustomFieldsSummary(customFields, eventCustomFields, 200)}>
                                                    {summary}
                                                </div>
                                            );
                                        } catch (error) {
                                            return <span className="text-gray-400 text-xs">-</span>;
                                        }
                                    }
                                },
                                {
                                    header: "Details",
                                    cell: ({ row }) => (
                                        <div className="flex space-x-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (row.original && typeof row.original === 'object') {
                                                        setOrder(row.original);
                                                    }
                                                }}
                                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                                title="View Order Details"
                                            >
                                                <InformationCircleIcon className="w-4 h-4" />
                                            </button>
                                            {(row.original.status === "PAID" || (row.original.status === "PENDING" && row.original.paymentResult && row.original.paymentResult !== null)) && (
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            if (row.original && typeof row.original === 'object') {
                                                                handleRefundClick(row.original, e);
                                                            }
                                                        }}
                                                        className="p-2 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                                                        title="Process Refund"
                                                    >
                                                        <CurrencyPoundIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            if (row.original && typeof row.original === 'object') {
                                                                handleCancellationClick(row.original, e);
                                                            }
                                                        }}
                                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                        title="Cancel Booking"
                                                    >
                                                        <XCircleIcon className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    if (row.original && typeof row.original === 'object') {
                                                        handleDeleteClick(row.original, e);
                                                    }
                                                }}
                                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                                                title="Delete Order"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )
                                }
                            ]}
                            data={Array.isArray(orders) ? orders : []}
                            onRowClick={(order) => {
                                if (order && typeof order === 'object') {
                                    setOrder(order);
                                }
                            }}
                            emptyLabel={loading ? "Loading..." : "No orders found"}
                        />
                    </div>
                )}
                <div className="mt-4">
                    <Pagination
                        page={parseInt(page) || 1}
                        pageSize={parseInt(amount) || 25}
                        total={count || 0}
                        onPageChange={(newPage) => setPage(newPage.toString())}
                    />
                </div>
                <FullSizeLoading isLoading={loading} />
                
                {/* Refund Dialog */}
                {refundDialogOpen && selectedOrderForRefund && (
                    <RefundDialog
                        isOpen={refundDialogOpen}
                        onClose={handleRefundClose}
                        order={{
                            id: selectedOrderForRefund.id,
                            status: selectedOrderForRefund.status,
                            finalTotal: selectedOrderForRefund.finalTotal || selectedOrderForRefund.originalTotal || 0,
                            originalTotal: selectedOrderForRefund.originalTotal || 0,
                            customerName: selectedOrderForRefund.user ? `${selectedOrderForRefund.user.firstName} ${selectedOrderForRefund.user.lastName}` : undefined,
                            email: selectedOrderForRefund.user?.email
                        }}
                        onRefundSuccess={handleRefundSuccess}
                    />
                )}

                {/* Cancellation Dialog */}
                {cancellationDialogOpen && selectedOrderForCancellation && (
                    <CancellationDialog
                        isOpen={cancellationDialogOpen}
                        onClose={handleCancellationClose}
                        order={{
                            id: selectedOrderForCancellation.id,
                            status: selectedOrderForCancellation.status,
                            finalTotal: selectedOrderForCancellation.finalTotal || selectedOrderForCancellation.originalTotal || 0,
                            originalTotal: selectedOrderForCancellation.originalTotal || 0,
                            customerName: selectedOrderForCancellation.user ? `${selectedOrderForCancellation.user.firstName} ${selectedOrderForCancellation.user.lastName}` : undefined,
                            email: selectedOrderForCancellation.user?.email,
                            eventTitle: getEventTitle(selectedOrderForCancellation.eventDate)
                        }}
                        onCancellationSuccess={handleCancellationSuccess}
                    />
                )}

                {/* Delete Order Dialog */}
                {deleteDialogOpen && selectedOrderForDelete && (
                    <DeleteOrderDialog
                        isOpen={deleteDialogOpen}
                        onClose={handleDeleteClose}
                        order={selectedOrderForDelete}
                        onConfirm={async () => {
                            try {
                                setIsDeleting(true);
                                await axios.delete(`/api/admin/order/${selectedOrderForDelete.id}`);
                                showToast.success('Order deleted successfully');
                                handleDeleteSuccess();
                            } catch (error) {
                                console.error('Failed to delete order:', error);
                                showToast.error('Failed to delete order');
                            } finally {
                                setIsDeleting(false);
                            }
                        }}
                        isLoading={isDeleting}
                    />
                )}

                {/* Bulk Delete Orders Dialog */}
                {bulkDeleteDialogOpen && (
                    <BulkDeleteOrdersDialog
                        isOpen={bulkDeleteDialogOpen}
                        onClose={handleBulkDeleteClose}
                        selectedOrders={selectedOrders}
                                                        onConfirm={async () => {
                                    try {
                                        setIsDeleting(true);
                                        const validOrderIds = selectedOrders
                                            .filter(o => o && o.id)
                                            .map(o => o.id);
                                        
                                        if (validOrderIds.length === 0) {
                                            showToast.error('No valid orders to delete');
                                            return;
                                        }
                                        
                                        const response = await axios.post('/api/admin/order/bulk-delete', {
                                            orderIds: validOrderIds
                                        });
                                        
                                        if (response.data.success) {
                                            const { summary } = response.data;
                                            showToast.success(`Successfully deleted ${summary.successful} orders`);
                                            if (summary.failed > 0) {
                                                showToast.error(`${summary.failed} orders failed to delete`);
                                            }
                                            handleBulkDeleteSuccess();
                                        } else {
                                            showToast.error('Failed to delete orders');
                                        }
                                    } catch (error) {
                                        console.error('Failed to bulk delete orders:', error);
                                        showToast.error('Failed to delete orders');
                                    } finally {
                                        setIsDeleting(false);
                                    }
                                }}
                        isLoading={isDeleting}
                    />
                )}
            </div>

            {/* Mobile FAB — link to door sales */}
            <a
              href="/admin/door-sales"
              className="lg:hidden fixed bottom-6 right-6 z-30 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center"
              title="Door Sales"
            >
              <LightningBoltIcon className="w-6 h-6" />
            </a>
            </>
        </AdminLayout>
    );
}

export async function getServerSideProps(context: NextPageContext) {
    return await getAdminServerSideProps(
        context,
        async () => {
            const count = await prisma.order.count();
            
            // Fetch only essential event date info for dropdowns
            const eventDates = await prisma.eventDate.findMany({
                select: {
                    id: true,
                    date: true,
                    event: {
                        select: {
                            id: true,
                            title: true
                        }
                    }
                },
                orderBy: { date: 'desc' }
            });

            // Fetch minimal event info for filters
            const events = await prisma.event.findMany({
                select: {
                    id: true,
                    title: true,
                    dates: {
                        select: {
                            id: true,
                            date: true
                        },
                        orderBy: { date: 'desc' }
                    }
                },
                orderBy: { title: 'asc' }
            });

            return {
                props: {
                    count,
                    eventDates: JSON.parse(JSON.stringify(eventDates)),
                    events: JSON.parse(JSON.stringify(events)),
                    paymentFees: await getOption(Options.PaymentFeesPayment),
                    shippingFees: await getOption(Options.PaymentFeesShipping),
                    currency: await getOption(Options.Currency)
                }
            };
        },
        {
            permission: PermissionSection.Orders,
            permissionType: PermissionType.Read
        }
    );
}
