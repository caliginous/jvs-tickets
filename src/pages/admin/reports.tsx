import { useSession } from "next-auth/react";
import { AdminLayout } from "../../components/admin/layout";
import Link from "next/link";
import Image from "next/image";
import { getAdminServerSideProps } from "../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../constants/interfaces";
import prisma from "../../lib/prisma";
import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { NextPageContext } from "next";
import axios from "axios";
import { FullSizeLoading } from "../../components/FullSizeLoading";
import { 
    SearchIcon,
    AdjustmentsIcon,
    DownloadIcon,
    ChartBarIcon,
    CalendarIcon,
    CurrencyPoundIcon,
    UsersIcon,
    CalendarIcon as CalendarDaysIcon,
    MapIcon,
    TrendingUpIcon,
    EyeIcon
} from "@heroicons/react/solid";
import { Button, Card, Input, Select } from "../../ui";

// Event Status Types
const EVENT_STATUS = {
    UPCOMING: 'upcoming',
    ONGOING: 'ongoing',
    PAST: 'past',
    CANCELLED: 'cancelled'
};

// Event Status Colors
const STATUS_COLORS = {
    [EVENT_STATUS.UPCOMING]: 'success',
    [EVENT_STATUS.ONGOING]: 'info',
    [EVENT_STATUS.PAST]: 'default',
    [EVENT_STATUS.CANCELLED]: 'error'
};

// Event Status Labels
const STATUS_LABELS = {
    [EVENT_STATUS.UPCOMING]: 'Upcoming',
    [EVENT_STATUS.ONGOING]: 'Ongoing',
    [EVENT_STATUS.PAST]: 'Past',
    [EVENT_STATUS.CANCELLED]: 'Cancelled'
};

interface EventSummary {
    id: number;
    title: string;
    description?: string;
    coverImage?: string;
    venue?: {
        name: string;
        address?: string;
        city?: string;
        postcode?: string;
    };
    dates: Array<{
        id: number;
        date: Date;
        totalTicketLimit?: number;
    }>;
    categories: Array<{
        id: number;
        name: string;
        price: number;
        maxAmount?: number;
    }>;
    totalOrders: number;
    totalRevenue: number;
    status: string;
}

interface FinancialMetrics {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    revenueTrend: number; // percentage change
}

export default function Reports({ permissionDenied }) {
    const { data: session, status } = useSession();
    const [events, setEvents] = useState<EventSummary[]>([]);
    const [filteredEvents, setFilteredEvents] = useState<EventSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(12);
    const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics>({
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        revenueTrend: 0
    });
    const [statusFilterAnchor, setStatusFilterAnchor] = useState<null | HTMLElement>(null);
    
    const router = useRouter();
    const [isMdDown, setIsMdDown] = useState(false);

    useEffect(() => {
        const checkScreenSize = () => {
            setIsMdDown(window.innerWidth < 768); // md breakpoint
        };
        
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    // Define all functions before any early returns
    const loadReportsData = async () => {
        setLoading(true);
        try {
            // Load events with order data
            const eventsResponse = await axios.get('/api/admin/reports/events');
            const eventsData = eventsResponse.data;
            setEvents(eventsData);

            // Calculate financial metrics
            const totalRevenue = eventsData.reduce((sum, event) => sum + event.totalRevenue, 0);
            const totalOrders = eventsData.reduce((sum, event) => sum + event.totalOrders, 0);
            const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
            
            setFinancialMetrics({
                totalRevenue,
                totalOrders,
                averageOrderValue,
                revenueTrend: 5.2 // Mock trend - would calculate from historical data
            });
        } catch (error) {
            console.error('Error loading reports data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterEvents = useCallback(() => {
        let filtered = events;

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(event => 
                event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                event.venue?.name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(event => event.status === statusFilter);
        }

        setFilteredEvents(filtered);
        setPage(0); // Reset to first page when filtering
    }, [events, searchTerm, statusFilter]);

    const getEventStatus = (event: EventSummary): string => {
        const now = new Date();
        const nextDate = event.dates[0]?.date;
        
        if (!nextDate) return EVENT_STATUS.PAST;
        
        const eventDate = new Date(nextDate);
        const diffTime = eventDate.getTime() - now.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        
        if (diffDays < 0) return EVENT_STATUS.PAST;
        if (diffDays <= 1) return EVENT_STATUS.ONGOING;
        return EVENT_STATUS.UPCOMING;
    };

    const handlePageChange = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleStatusFilterClick = (event: React.MouseEvent<HTMLElement>) => {
        setStatusFilterAnchor(event.currentTarget);
    };

    const handleStatusFilterClose = () => {
        setStatusFilterAnchor(null);
    };

    const handleStatusFilterSelect = (status: string) => {
        setStatusFilter(status);
        handleStatusFilterClose();
    };

    const exportEventsCsv = () => {
        // Implementation for CSV export
        console.log('Exporting events CSV...');
    };

    const getEventCard = (event: EventSummary) => {
        const status = getEventStatus(event);
        const nextDate = event.dates[0]?.date;
        const venueName = event.venue?.name || 'Location TBA';
        const totalTickets = event.dates.reduce((sum, date) => sum + (date.totalTicketLimit || 0), 0);
        const availableTickets = totalTickets - event.totalOrders;

        return (
            <Link href={`/admin/events/${event.id}/report`} passHref style={{ textDecoration: 'none' }}>
                <div key={event.id} className="h-full flex flex-col cursor-pointer transition-all duration-200 ease-in-out hover:-translate-y-1 hover:shadow-lg border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300">
                <div className="relative">
                    {event.coverImage ? (
                        <Image 
                            src={event.coverImage} 
                            alt={event.title}
                            width={800}
                            height={450}
                            className="w-full h-48 object-cover"
                        />
                    ) : (
                        <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                            <CalendarIcon className="w-15 h-15 text-gray-400" />
                        </div>
                    )}
                    <span className={`absolute top-2 right-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        status === 'active' ? 'bg-green-100 text-green-800 ring-green-600/20' :
                        status === 'draft' ? 'bg-gray-100 text-gray-800 ring-gray-600/20' :
                        status === 'cancelled' ? 'bg-red-100 text-red-800 ring-red-600/20' :
                        'bg-blue-100 text-blue-800 ring-blue-600/20'
                    }`}>
                        {STATUS_LABELS[status]}
                    </span>
                </div>
                
                <div className="flex-grow flex flex-col p-4">
                    <h3 className="text-lg font-bold mb-2 event-title line-clamp-2">
                        {event.title}
                    </h3>
                    
                    <div className="space-y-1 mb-2">
                        {nextDate && (
                            <div className="flex items-center gap-1">
                                <CalendarIcon className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-600">
                                    {new Date(nextDate).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                            <MapIcon className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                                {venueName}
                            </span>
                        </div>
                    </div>

                    <div className="mt-auto">
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="text-center p-1 bg-gray-50 rounded">
                                <div className="text-lg font-bold text-blue-600">
                                    £{event.totalRevenue}
                                </div>
                                <div className="text-xs text-gray-600">
                                    Revenue
                                </div>
                            </div>
                            <div className="text-center p-1 bg-gray-50 rounded">
                                <div className="text-lg font-bold text-green-600">
                                    {event.totalOrders}
                                </div>
                                <div className="text-xs text-gray-600">
                                    Orders
                                </div>
                            </div>
                        </div>
                        
                        <div className="text-center p-1 bg-blue-50 rounded">
                            <div className="text-sm text-blue-600">
                                {availableTickets >= 0 ? `${availableTickets} tickets available` : 'Sold out'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </Link>
        );
    };

    useEffect(() => {
        if (!session) return;
        loadReportsData();
    }, [session]);

    useEffect(() => {
        filterEvents();
    }, [events, searchTerm, statusFilter, filterEvents]);

    // Only show loading during genuine session loading, not on tab switches
    if (status === "loading") {
        return (
            <AdminLayout permissionDenied={permissionDenied}>
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="ml-3 text-gray-600">Loading reports...</div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout permissionDenied={permissionDenied}>
            <div className="p-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold mb-2">
                        Event Reports Dashboard
                    </h1>
                    <p className="text-gray-600">
                        Monitor event performance, revenue, and order analytics
                    </p>
                </div>

                {/* Financial Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div className="bg-blue-600 text-white rounded-lg p-6 shadow-lg">
                        <div className="flex items-center gap-3">
                            <CurrencyPoundIcon className="w-10 h-10" />
                            <div>
                                <div className="text-3xl font-bold">
                                    £{financialMetrics.totalRevenue.toFixed(2)}
                                </div>
                                <div className="text-blue-100">
                                    Total Revenue
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-green-600 text-white rounded-lg p-6 shadow-lg">
                        <div className="flex items-center gap-3">
                            <UsersIcon className="w-10 h-10" />
                            <div>
                                <div className="text-3xl font-bold">
                                    {financialMetrics.totalOrders}
                                </div>
                                <div className="text-green-100">
                                    Total Orders
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-blue-500 text-white rounded-lg p-6 shadow-lg">
                        <div className="flex items-center gap-3">
                            <TrendingUpIcon className="w-10 h-10" />
                            <div>
                                <div className="text-3xl font-bold">
                                    £{financialMetrics.averageOrderValue.toFixed(2)}
                                </div>
                                <div className="text-blue-100">
                                    Avg Order Value
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-amber-500 text-white rounded-lg p-6 shadow-lg">
                        <div className="flex items-center gap-3">
                            <CalendarIcon className="w-10 h-10" />
                            <div>
                                <div className="text-3xl font-bold">
                                    {events.length}
                                </div>
                                <div className="text-amber-100">
                                    Total Events
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <div className="md:col-span-1">
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Search events by name or venue..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        <div className="md:col-span-1">
                            <div className="relative">
                                <button
                                    className="w-full px-4 py-2 text-left border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    onClick={handleStatusFilterClick}
                                >
                                    <div className="flex items-center justify-between">
                                        <span>Status: {statusFilter === 'all' ? 'All' : STATUS_LABELS[statusFilter]}</span>
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </button>
                                
                                {statusFilterAnchor && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                                        <div className="py-1">
                                            <button
                                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                onClick={() => handleStatusFilterSelect('all')}
                                            >
                                                All Statuses
                                            </button>
                                            {Object.values(EVENT_STATUS).map((status) => (
                                                <button
                                                    key={status}
                                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                    onClick={() => handleStatusFilterSelect(status)}
                                                >
                                                    {STATUS_LABELS[status]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="md:col-span-1">
                            <button
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center gap-2"
                                onClick={exportEventsCsv}
                            >
                                <DownloadIcon className="w-5 h-5" />
                                Export CSV
                            </button>
                        </div>
                    </div>
                </div>

                {/* Events Grid */}
                {filteredEvents.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No events found
                        </h3>
                        <p className="text-gray-600">
                            {searchTerm || statusFilter !== 'all' 
                                ? 'Try adjusting your search criteria or filters.'
                                : 'No events have been created yet.'
                            }
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredEvents
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map(getEventCard)
                            }
                        </div>

                        {/* Pagination */}
                        <div className="mt-6 flex justify-center">
                            <div className="flex items-center gap-2">
                                <button
                                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => handlePageChange(null, page - 1)}
                                    disabled={page === 0}
                                >
                                    Previous
                                </button>
                                
                                <span className="px-3 py-2 text-sm text-gray-700">
                                    Page {page + 1} of {Math.ceil(filteredEvents.length / rowsPerPage)}
                                </span>
                                
                                <button
                                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => handlePageChange(null, page + 1)}
                                    disabled={page >= Math.ceil(filteredEvents.length / rowsPerPage) - 1}
                                >
                                    Next
                                </button>
                                
                                <select
                                    className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={rowsPerPage}
                                    onChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
                                >
                                    {[6, 12, 24, 48].map((option) => (
                                        <option key={option} value={option}>
                                            {option} per page
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </AdminLayout>
    );
}

// Temporarily remove getServerSideProps to test client-side authentication
