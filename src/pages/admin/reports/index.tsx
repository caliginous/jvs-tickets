import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { AdminLayout } from "../../../components/admin/layout";
import { Button } from "../../../ui";
import { showToast } from "../../../ui";
import { getAdminServerSideProps } from "../../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../../constants/interfaces";
import UserReports from "../../../components/admin/reports/UserReports";
import {
    ChartBarIcon,
    CalendarIcon,
    MapIcon,
    CurrencyPoundIcon,
    UserGroupIcon,
    DocumentTextIcon,
    EyeIcon,
    DownloadIcon,
    PrinterIcon,
    ClipboardIcon,
    ArrowLeftIcon,
    CheckIcon,
    XIcon
} from "@heroicons/react/solid";

interface EventReport {
    id: string;
    title: string;
    date: string;
    status: 'upcoming' | 'past';
    venue: string;
    priceRange: string; // Display price range (e.g., "Free" or "£5.00 - £15.00")
    ticketsSold: number;
    totalRevenue: number;
    orders: Order[];
    customFields?: any[]; // Custom field definitions for the event
    isActive: boolean; // Whether the event is active or inactive
}

interface Order {
    id: string;
    customerName: string;
    email: string;
    phone: string;
    ticketType: string;
    quantity: number;
    finalTotal?: number;
    originalTotal?: number;
    arrived?: boolean;
    customFields?: string; // JSON string of custom field responses
}

interface ReportData {
    totalEvents: number;
    totalRevenue: number;
    totalTickets: number;
    upcomingEvents: number;
    pastEvents: number;
}



export default function ReportsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [eventReports, setEventReports] = useState<EventReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<string>("overview");
    const [dateRange, setDateRange] = useState("30"); // days
    const [financialDateFilter, setFinancialDateFilter] = useState("always");
    const [financialSelectedYear, setFinancialSelectedYear] = useState(new Date().getFullYear().toString());
    const [isExporting, setIsExporting] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<EventReport | null>(null);
    const [showEventDetails, setShowEventDetails] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    
    // Generate year options for the last 10 years
    const yearOptions = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

    // Check for eventId query parameter and open event report modal
    useEffect(() => {
        
        if (router.query.eventId && eventReports.length > 0) {
            const eventId = Array.isArray(router.query.eventId) ? router.query.eventId[0] : router.query.eventId;
            // Try multiple comparison methods
            const eventToShow = eventReports.find(e => 
                e.id.toString() === eventId ||
                e.id.toString() === parseInt(eventId).toString() ||
                e.id === eventId
            );
            console.log('Found event to show:', eventToShow);
            if (eventToShow) {
                handleEventView(eventToShow);
                setSelectedReport("events");
                // Clean up the URL
                router.replace('/admin/reports', undefined, { shallow: true });
            }
        }
    }, [router.query.eventId, eventReports, router]);

    // Alternative approach: Check on mount and after data loads
    useEffect(() => {
        if (router.query.eventId && eventReports.length > 0) {
            const eventId = Array.isArray(router.query.eventId) ? router.query.eventId[0] : router.query.eventId;
            // Try multiple comparison methods
            const eventToShow = eventReports.find(e => 
                e.id.toString() === eventId ||
                e.id.toString() === parseInt(eventId).toString() ||
                e.id === eventId
            );
            if (eventToShow) {
                console.log('Opening event report for event:', eventToShow);
                handleEventView(eventToShow);
                setSelectedReport("events");
                // Clean up the URL
                router.replace('/admin/reports', undefined, { shallow: true });
            }
        }
    }, [eventReports, router]);

    const fetchReportData = async () => {
        try {
            // Fetch real data from the API
            const response = await fetch('/api/admin/reports/events');
            if (!response.ok) {
                throw new Error('Failed to fetch report data');
            }
            
            const events = await response.json();
            
            // Transform API data to match our interface
            const transformedEvents: EventReport[] = events.map((event: any) => {
                // Calculate price range from EventTicketTypes only (ignore deprecated categories)
                let priceRange = 'Free';
                
                if (event.ticketTypes && event.ticketTypes.length > 0) {
                    const prices = event.ticketTypes
                        .filter(tt => tt.isActive)
                        .map(tt => tt.price / 100); // Convert pence to pounds
                    
                    if (prices.length > 0) {
                        const minPrice = Math.min(...prices);
                        const maxPrice = Math.max(...prices);
                        
                        if (minPrice === maxPrice) {
                            priceRange = minPrice === 0 ? 'Free' : `£${minPrice.toFixed(2)}`;
                        } else {
                            priceRange = `£${minPrice.toFixed(2)} - £${maxPrice.toFixed(2)}`;
                        }
                    }
                } else if (event.totalRevenue > 0) {
                    // Fallback: if no ticket types but has revenue, show average
                    const avgPrice = event.totalTicketsSold > 0 
                        ? (event.totalRevenue || 0) / event.totalTicketsSold 
                        : 0;
                    priceRange = `£${avgPrice.toFixed(2)}`;
                }
                
                return {
                    id: event.id.toString(),
                    title: event.title,
                    date: event.nextDate ? new Date(event.nextDate).toISOString() : 'No upcoming date',
                    status: event.nextDate && new Date(event.nextDate) > new Date() ? 'upcoming' : 'past',
                    venue: event.venue?.name || 'No venue',
                    priceRange: priceRange, // Show price range from EventTicketTypes only
                    ticketsSold: event.totalTicketsSold || 0,
                    totalRevenue: event.totalRevenue || 0,
                    orders: [],
                    isActive: event.isActive !== false // Default to true if not specified
                };
            });

            // Calculate report data from real events
            const totalEvents = transformedEvents.length;
            const totalRevenue = transformedEvents.reduce((sum, event) => sum + event.totalRevenue, 0);
            const totalTickets = transformedEvents.reduce((sum, event) => sum + event.ticketsSold, 0);
            const upcomingEvents = transformedEvents.filter(event => event.status === 'upcoming').length;
            const pastEvents = transformedEvents.filter(event => event.status === 'past').length;

            setReportData({
                totalEvents,
                totalRevenue,
                totalTickets,
                upcomingEvents,
                pastEvents
            });

            setEventReports(transformedEvents);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching report data:', error);
            showToast.error('Failed to fetch report data');
            setLoading(false);
        }
    };

    const handleExport = async (reportType: string) => {
        setIsExporting(true);
        try {
            // Simulate export process
            await new Promise(resolve => setTimeout(resolve, 2000));
            showToast.success(`${reportType} exported successfully`);
        } catch (error) {
            showToast.error(`Failed to export ${reportType}`);
        } finally {
            setIsExporting(false);
        }
    };

    // Filter financial data based on date filter
    const getFilteredFinancialData = () => {
        if (financialDateFilter === 'always') {
            return eventReports;
        }

        const now = new Date();
        let dateFrom: Date;

        if (financialDateFilter === 'month') {
            dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        } else if (financialDateFilter === 'quarter') {
            dateFrom = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        } else if (financialDateFilter === 'sixmonths') {
            dateFrom = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        } else if (financialDateFilter === 'year') {
            dateFrom = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
        } else if (financialDateFilter === 'selectyear') {
            const selectedYearNum = parseInt(financialSelectedYear);
            const yearStart = new Date(selectedYearNum, 0, 1);
            const yearEnd = new Date(selectedYearNum, 11, 31, 23, 59, 59);
            return eventReports.filter(event => {
                const eventDate = new Date(event.date);
                return eventDate >= yearStart && eventDate <= yearEnd;
            });
        } else {
            return eventReports;
        }

        return eventReports.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate >= dateFrom;
        });
    };

    // Calculate filtered revenue totals
    const getFilteredRevenueSummary = () => {
        const filtered = getFilteredFinancialData();
        const totalRevenue = filtered.reduce((sum, event) => sum + event.totalRevenue, 0);
        const totalTickets = filtered.reduce((sum, event) => sum + event.ticketsSold, 0);
        const avgTicketPrice = totalTickets > 0 ? totalRevenue / totalTickets : 0;
        
        return { totalRevenue, totalTickets, avgTicketPrice, eventCount: filtered.length };
    };

    const handleEventView = async (event: EventReport) => {
        try {
            // Fetch detailed order data for this specific event
            const response = await fetch(`/api/admin/reports/events/${event.id}/orders`);
            if (response.ok) {
                const orderData = await response.json();
                const eventWithOrders = {
                    ...event,
                    orders: orderData.orders || [],
                    customFields: orderData.customFields || [] // Store custom field definitions
                };
                setSelectedEvent(eventWithOrders);
            } else {
                // Fallback to event without orders if API fails
                setSelectedEvent(event);
            }
        } catch (error) {
            console.error('Error fetching event orders:', error);
            // Fallback to event without orders if API fails
            setSelectedEvent(event);
        }
        setShowEventDetails(true);
    };

    const handleExportCSV = async (event: EventReport) => {
        setIsExporting(true);
        try {
            // Prepare CSV headers
            const headers = ['Order ID', 'Customer', 'Email', 'Phone', 'Ticket Type', 'Quantity', 'Total'];
            
            // Add custom field headers if event has custom fields
            if (event.customFields && event.customFields.length > 0) {
                event.customFields.forEach((field: any) => {
                    headers.push(field.label);
                });
            }
            
            headers.push('Arrived');
            
            // Prepare CSV rows
            const rows = event.orders.map(order => {
                const row: string[] = [
                    `"${order.id}"`,
                    `"${order.customerName}"`,
                    `"${order.email}"`,
                    `"${order.phone || ''}"`,
                    `"${order.ticketType}"`,
                    order.quantity.toString(),
                    `"£${((order as any).total || 0).toFixed(2)}"`
                ];
                
                // Add custom field values
                if (event.customFields && event.customFields.length > 0) {
                    if ((order as any).customFields) {
                        try {
                            const parsed = JSON.parse((order as any).customFields);
                            event.customFields.forEach((field: any) => {
                                const value = parsed[field.name] || '';
                                // Escape quotes and wrap in quotes
                                row.push(`"${value.toString().replace(/"/g, '""')}"`);
                            });
                        } catch {
                            // If parsing fails, add empty values
                            event.customFields.forEach(() => row.push('""'));
                        }
                    } else {
                        // No custom fields for this order, add empty values
                        event.customFields.forEach(() => row.push('""'));
                    }
                }
                
                row.push(order.arrived ? 'Yes' : 'No');
                
                return row.join(',');
            });
            
            // Combine headers and rows
            const csvContent = [headers.join(','), ...rows].join('\n');
            
            // Create and download CSV file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `${event.title.replace(/[^a-z0-9]/gi, '_')}_orders_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showToast.success(`CSV exported for ${event.title}`);
        } catch (error) {
            console.error('CSV export error:', error);
            showToast.error('Failed to export CSV');
        } finally {
            setIsExporting(false);
        }
    };

    const handlePrintGuestList = async (event: EventReport) => {
        try {
            // Create a new window for printing
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                showToast.error('Popup blocked. Please allow popups for this site.');
                return;
            }

            // Generate the guest list HTML
            const guestListHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${event.title} - Guest List</title>
                    <style>
                        @page { size: A4; margin: 10mm 15mm; }
                        body { font-family: Arial, sans-serif; margin: 0; font-size: 11px; }
                        .header { text-align: center; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #333; }
                        .title { font-size: 16px; font-weight: bold; margin-bottom: 3px; }
                        .subtitle { font-size: 12px; color: #666; margin-bottom: 2px; }
                        .generated { font-size: 9px; color: #999; }
                        table { width: 100%; border-collapse: collapse; margin-top: 5px; }
                        th, td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; font-size: 11px; }
                        th { background-color: #f8f9fa; font-weight: bold; font-size: 10px; }
                        .checkbox { width: 14px; height: 14px; }
                        .summary { margin-top: 10px; text-align: right; font-weight: bold; font-size: 11px; }
                        @media print {
                            body { margin: 0; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="title">${event.title}</div>
                        <div class="subtitle">Guest List</div>
                        <div class="generated">Generated on ${new Date().toLocaleDateString('en-GB')}</div>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Number of Tickets</th>
                                <th>Arrived</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${[...event.orders]
                                .sort((a, b) => a.customerName.localeCompare(b.customerName))
                                .map(order => `
                                <tr>
                                    <td>${order.customerName}</td>
                                    <td>${order.quantity}</td>
                                    <td><input type="checkbox" class="checkbox" /></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                    <div class="summary">
                        <div>Total Guests: ${event.orders.length}</div>
                        <div>Total Tickets: ${event.orders.reduce((sum, order) => sum + order.quantity, 0)}</div>
                    </div>
                    
                    <div class="no-print" style="margin-top: 30px; text-align: center;">
                        <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            Print Guest List
                        </button>
                        <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
                            Close
                        </button>
                    </div>
                </body>
                </html>
            `;

            // Write the HTML to the new window
            printWindow.document.write(guestListHTML);
            printWindow.document.close();

            // Wait for content to load, then show print dialog
            printWindow.onload = () => {
                printWindow.focus();
                showToast.success(`Guest list generated for ${event.title}`);
            };

        } catch (error) {
            console.error('Error generating guest list:', error);
            showToast.error('Failed to generate guest list');
        }
    };

    const handleCopyEmails = async (event: EventReport) => {
        try {
            const emails = event.orders.map(order => order.email).join(', ');
            await navigator.clipboard.writeText(emails);
            showToast.success('Emails copied to clipboard');
        } catch (error) {
            showToast.error('Failed to copy emails');
        }
    };

    const filteredEvents = eventReports.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.venue.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        fetchReportData();
    }, [dateRange]);

    // Only show loading during genuine session loading, not on tab switches
    if (status === "loading") {
        return (
            <AdminLayout>
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="ml-3 text-gray-600">Loading reports...</div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Reports Dashboard</h1>
                    <p className="mt-2 text-gray-600">
                        Comprehensive reporting and analytics for events, orders, and revenue
                    </p>
                </div>

                {/* Report Navigation */}
                <div className="mb-6">
                    <nav className="flex space-x-8">
                        <button
                            onClick={() => setSelectedReport("overview")}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                selectedReport === "overview"
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setSelectedReport("events")}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                selectedReport === "events"
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                        >
                            Event Reports
                        </button>
                        <button
                            onClick={() => setSelectedReport("financial")}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                selectedReport === "financial"
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                        >
                            Financial
                        </button>
                        <button
                            onClick={() => setSelectedReport("users")}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                selectedReport === "users"
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                        >
                            Users
                        </button>
                    </nav>
                </div>

                {/* Overview Report */}
                {selectedReport === "overview" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <CalendarIcon className="h-8 w-8 text-blue-600" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-500">Total Events</p>
                                        <p className="text-2xl font-semibold text-gray-900">{reportData?.totalEvents || 0}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <CurrencyPoundIcon className="h-8 w-8 text-green-600" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                                        <p className="text-2xl font-semibold text-gray-900">£{reportData?.totalRevenue?.toFixed(2) || '0.00'}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <UserGroupIcon className="h-8 w-8 text-purple-600" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-500">Total Tickets</p>
                                        <p className="text-2xl font-semibold text-gray-900">{reportData?.totalTickets || 0}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <ChartBarIcon className="h-8 w-8 text-orange-600" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-500">Upcoming Events</p>
                                        <p className="text-2xl font-semibold text-gray-900">{reportData?.upcomingEvents || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                            <div className="space-y-3">
                                {eventReports.slice(0, 5).map((event) => (
                                    <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-3 h-3 rounded-full ${
                                                event.status === 'upcoming' ? 'bg-blue-500' : 'bg-gray-400'
                                            }`} />
                                            <div>
                                                <p className="font-medium text-gray-900">{event.title}</p>
                                                <p className="text-sm text-gray-500">{event.date} • {event.venue}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium text-gray-900">£{event.totalRevenue.toFixed(2)}</p>
                                            <p className="text-sm text-gray-500">{event.ticketsSold} tickets</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Event Reports */}
                {selectedReport === "events" && (
                    <div className="space-y-6">
                        {/* Search and Filters */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="Search events by name or venue..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <Button
                                onClick={() => fetchReportData()}
                                className="whitespace-nowrap"
                            >
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                Refresh
                            </Button>
                            <Button
                                onClick={() => showToast.success('Cache cleared')}
                                variant="outline"
                                className="whitespace-nowrap"
                            >
                                Clear Cache
                            </Button>
                        </div>

                        {/* Events Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredEvents.map((event) => (
                                <div key={event.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-medium text-gray-900 mb-2">{event.title}</h3>
                                            <div className="space-y-2">
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <CalendarIcon className="h-4 w-4 mr-2" />
                                                    {event.date}
                                                </div>
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <MapIcon className="h-4 w-4 mr-2" />
                                                    {event.venue}
                                                </div>
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <CurrencyPoundIcon className="h-4 w-4 mr-2" />
                                                    {event.priceRange}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                event.status === 'upcoming' 
                                                    ? 'bg-blue-100 text-blue-800' 
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {event.status === 'upcoming' ? 'Upcoming' : 'Past'}
                                            </span>
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                event.isActive 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {event.isActive ? '✓ Active' : '✗ Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center justify-center mb-1">
                                                <UserGroupIcon className="h-5 w-5 text-gray-600" />
                                            </div>
                                            <p className="text-sm text-gray-500">Tickets Sold</p>
                                            <p className="text-lg font-semibold text-gray-900">{event.ticketsSold}</p>
                                        </div>
                                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center justify-center mb-1">
                                                <DocumentTextIcon className="h-5 w-5 text-gray-600" />
                                            </div>
                                            <p className="text-sm text-gray-500">Revenue</p>
                                            <p className="text-lg font-semibold text-gray-900">£{event.totalRevenue.toFixed(2)}</p>
                                        </div>
                                    </div>

                                    <div className="flex space-x-2">
                                        <Button
                                            onClick={() => handleEventView(event)}
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                        >
                                            <EyeIcon className="h-4 w-4 mr-1" />
                                            View Details
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Financial Report */}
                {selectedReport === "financial" && (
                    <div className="space-y-6">
                        {/* Date Filter Controls */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                                    <select
                                        value={financialDateFilter}
                                        onChange={(e) => setFinancialDateFilter(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="always">All Time</option>
                                        <option value="month">Last Month</option>
                                        <option value="quarter">Last Quarter</option>
                                        <option value="sixmonths">Last 6 Months</option>
                                        <option value="year">Last 12 Months</option>
                                        <option value="selectyear">Select Year</option>
                                    </select>
                                </div>
                                
                                {financialDateFilter === 'selectyear' && (
                                    <div className="w-full md:w-40">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                                        <select
                                            value={financialSelectedYear}
                                            onChange={(e) => setFinancialSelectedYear(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {yearOptions.map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Summary</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-green-600">£{getFilteredRevenueSummary().totalRevenue.toFixed(2)}</p>
                                    <p className="text-sm text-gray-500">Total Revenue</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-blue-600">{getFilteredRevenueSummary().totalTickets}</p>
                                    <p className="text-sm text-gray-500">Total Tickets Sold</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-purple-600">£{getFilteredRevenueSummary().avgTicketPrice.toFixed(2)}</p>
                                    <p className="text-sm text-gray-500">Average Ticket Price</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue by Event ({getFilteredRevenueSummary().eventCount})</h3>
                            <div className="space-y-3">
                                {getFilteredFinancialData()
                                    .filter(event => event.totalRevenue > 0)
                                    .sort((a, b) => b.totalRevenue - a.totalRevenue)
                                    .map((event) => (
                                        <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <p className="font-medium text-gray-900">{event.title}</p>
                                                <p className="text-sm text-gray-500">{event.date}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium text-gray-900">£{event.totalRevenue.toFixed(2)}</p>
                                                <p className="text-sm text-gray-500">{event.ticketsSold} tickets</p>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Users Report */}
                {selectedReport === "users" && (
                    <UserReports />
                )}
            </div>

            {/* Event Details Modal */}
            {showEventDetails && selectedEvent && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={() => setShowEventDetails(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <ArrowLeftIcon className="h-6 w-6" />
                                    </button>
                                    <div>
                                        <h3 className="text-2xl font-bold text-gray-900">{selectedEvent.title}</h3>
                                        <p className="text-gray-600">Event Details and Orders</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowEventDetails(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <XIcon className="h-6 w-6" />
                                </button>
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <div className="flex items-center">
                                        <CalendarIcon className="h-6 w-6 text-blue-600 mr-2" />
                                        <div>
                                            <p className="text-sm text-blue-600">Date</p>
                                            <p className="font-semibold text-blue-900">{selectedEvent.date}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <div className="flex items-center">
                                        <MapIcon className="h-6 w-6 text-green-600 mr-2" />
                                        <div>
                                            <p className="text-sm text-green-600">Venue</p>
                                            <p className="font-semibold text-green-900">{selectedEvent.venue}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-lg">
                                    <div className="flex items-center">
                                        <UserGroupIcon className="h-6 w-6 text-purple-600 mr-2" />
                                        <div>
                                            <p className="text-sm text-purple-600">Total Orders</p>
                                            <p className="font-semibold text-purple-900">{selectedEvent.orders.length}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-orange-50 p-4 rounded-lg">
                                    <div className="flex items-center">
                                        <CurrencyPoundIcon className="h-6 w-6 text-orange-600 mr-2" />
                                        <div>
                                            <p className="text-sm text-orange-600">Total Revenue</p>
                                            <p className="font-semibold text-orange-900">£{selectedEvent.totalRevenue.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex space-x-3 mb-6">
                                <Button
                                    onClick={() => handleExportCSV(selectedEvent)}
                                    disabled={isExporting}
                                    className="flex items-center"
                                >
                                    <DownloadIcon className="h-4 w-4 mr-2" />
                                    {isExporting ? 'Exporting...' : 'Export CSV'}
                                </Button>
                                <Button
                                    onClick={() => handlePrintGuestList(selectedEvent)}
                                    variant="outline"
                                    className="flex items-center"
                                >
                                    <PrinterIcon className="h-4 w-4 mr-2" />
                                    Print Guest List
                                </Button>
                                <Button
                                    onClick={() => handleCopyEmails(selectedEvent)}
                                    variant="outline"
                                    className="flex items-center"
                                >
                                    <ClipboardIcon className="h-4 w-4 mr-2" />
                                    Copy Emails
                                </Button>
                            </div>

                            {/* Orders Table */}
                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <h4 className="text-lg font-medium text-gray-900">Orders ({selectedEvent.orders.length})</h4>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket Type</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                                {selectedEvent.customFields && selectedEvent.customFields.length > 0 && (
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Custom Info</th>
                                                )}
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arrived</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {selectedEvent.orders.map((order) => (
                                                <tr key={order.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.id}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.customerName}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.email}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.phone}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.ticketType}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.quantity}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">£{((order as any).total || 0).toFixed(2)}</td>
                                                    {selectedEvent.customFields && selectedEvent.customFields.length > 0 && (
                                                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                                                            {(() => {
                                                                if (!(order as any).customFields) return '-';
                                                                try {
                                                                    const parsed = JSON.parse((order as any).customFields);
                                                                    const entries = Object.entries(parsed).map(([key, value]) => {
                                                                        const fieldDef = selectedEvent.customFields?.find((f: any) => f.name === key);
                                                                        const label = fieldDef?.label || key;
                                                                        return `${label}: ${value}`;
                                                                    }).join(', ');
                                                                    return entries.length > 50 ? entries.substring(0, 50) + '...' : entries;
                                                                } catch {
                                                                    return '-';
                                                                }
                                                            })()}
                                                        </td>
                                                    )}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={order.arrived || false}
                                                                onChange={() => {
                                                                    // Toggle arrival status
                                                                    const updatedOrders = selectedEvent.orders.map(o =>
                                                                        o.id === order.id ? { ...o, arrived: !o.arrived } : o
                                                                    );
                                                                    setSelectedEvent({ ...selectedEvent, orders: updatedOrders });
                                                                }}
                                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                            />
                                                            <span className="ml-2 text-sm text-gray-500">
                                                                {order.arrived ? 'Yes' : 'No'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
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
            permission: PermissionSection.Orders,
            permissionType: PermissionType.Read
        }
    );
}
