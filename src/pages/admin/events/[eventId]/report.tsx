import { useSession } from "next-auth/react";
import { AdminLayout } from "../../../../components/admin/layout";

import { getAdminServerSideProps } from "../../../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../../../constants/interfaces";
import prisma from "../../../../lib/prisma";
import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { NextPageContext } from "next";
import axios from "axios";
import { FullSizeLoading } from "../../../../components/FullSizeLoading";
import { ArrowLeftIcon, UsersIcon, CurrencyDollarIcon, ArrowDownIcon, PrinterIcon, ClipboardIcon, CalendarIcon, MapIcon, CreditCardIcon } from "@heroicons/react/solid";

// Using any types to avoid complex interface issues for now
type EventReport = any;
type OrderDetail = any;

export default function EventReportPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { eventId } = router.query;
    const [event, setEvent] = useState<EventReport | null>(null);
    const [orders, setOrders] = useState<OrderDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [permissionDenied, setPermissionDenied] = useState(false);

    const loadEventReport = useCallback(async () => {
        if (!eventId) return;
        
        try {
            setLoading(true);
            
            // Load event details
            const eventResponse = await axios.get(`/api/admin/events/${eventId}`);
            const eventData = eventResponse.data;
            
            // Load orders for this event
            const ordersResponse = await axios.get(`/api/admin/order?eventId=${eventId}`);
            const ordersData = ordersResponse.data;
            
            // Calculate totals from CONFIRMED orders only (exclude PENDING, EXPIRED, CANCELLED, fully REFUNDED)
            // Include PARTIALLY_REFUNDED as these customers still have valid tickets
            const confirmedOrders = ordersData.filter(order => 
                ['CONFIRMED', 'PAID', 'COMPLETED', 'PARTIALLY_REFUNDED'].includes(order.status)
            );
            
            const totalOrders = confirmedOrders.length;
            const totalRevenue = confirmedOrders.reduce((sum, order) => {
                const orderTotal = order.finalTotal || order.originalTotal || 0;
                // Convert from pence to pounds for display consistency
                return sum + (orderTotal / 100);
            }, 0);
            
            console.log(`💰 Revenue calculation: ${confirmedOrders.length} confirmed orders out of ${ordersData.length} total, revenue: £${totalRevenue.toFixed(2)}`);
            
            // Add calculated totals to event data
            const enrichedEventData = {
                ...eventData,
                totalOrders,
                totalRevenue
            };
            
            // Debug logging (remove in production)
            console.log('Event data:', eventData);
            console.log('Orders data:', ordersData);
            console.log('Sample order:', ordersData[0]);
            if (ordersData[0]?.tickets) {
                console.log('Sample tickets:', ordersData[0].tickets);
            }
            
            setEvent(enrichedEventData);
            setOrders(ordersData);
        } catch (error) {
            console.error('Error loading event report:', error);
            if (error.response?.status === 403) {
                setPermissionDenied(true);
            }
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        if (!session || !eventId) return;
        loadEventReport();
    }, [session, eventId, loadEventReport]);

        const getEventStatus = (event: EventReport) => {
        if (!event?.dates || event.dates.length === 0) return 'unknown';

        const now = new Date();
        const nextDate = new Date(event.dates[0].date);

        if (nextDate > now) return 'upcoming';
        if (nextDate <= now && nextDate.getTime() + (24 * 60 * 60 * 1000) > now.getTime()) return 'ongoing';
        return 'past';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'upcoming': return 'info';
            case 'ongoing': return 'success';
            case 'past': return 'default';
            default: return 'default';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'upcoming': return 'Upcoming';
            case 'ongoing': return 'Ongoing';
            case 'past': return 'Past';
            default: return 'Unknown';
        }
    };

    const exportCSV = () => {
        // Implementation for CSV export
        console.log('Exporting CSV for event:', eventId);
    };

    const printGuestList = () => {
        // Create a new window with the guest list content
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) return;

        // Generate the guest list HTML content
        const guestListHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Guest List - ${event?.title}</title>
                <style>
                    @page { size: A4; margin: 10mm 15mm; }
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        line-height: 1.3;
                        font-size: 11px;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 10px;
                        border-bottom: 1px solid #333;
                        padding-bottom: 8px;
                    }
                    .event-title {
                        font-size: 16px;
                        font-weight: bold;
                        margin-bottom: 3px;
                    }
                    .event-date {
                        font-size: 12px;
                        color: #666;
                        margin-bottom: 3px;
                    }
                    .generated-date {
                        font-size: 9px;
                        color: #999;
                    }
                    h2 {
                        font-size: 13px;
                        margin: 8px 0;
                    }
                    .guest-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 5px;
                    }
                    .guest-table th {
                        background-color: #f5f5f5;
                        border: 1px solid #ddd;
                        padding: 4px 6px;
                        text-align: left;
                        font-weight: bold;
                        font-size: 10px;
                    }
                    .guest-table td {
                        border: 1px solid #ddd;
                        padding: 4px 6px;
                        font-size: 11px;
                    }
                    .guest-table tr:nth-child(even) {
                        background-color: #f9f9f9;
                    }
                    .checkbox {
                        width: 14px;
                        height: 14px;
                        border: 1px solid #333;
                        display: inline-block;
                        text-align: center;
                        line-height: 14px;
                        font-size: 12px;
                    }
                    .page-break {
                        page-break-before: always;
                    }
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="event-title">${event?.title || 'Event'}</div>
                    <div class="event-date">${event?.dates?.[0]?.date ? formatDate(event.dates[0].date) : 'Date TBA'}</div>
                    <div class="generated-date">Generated on ${new Date().toLocaleDateString('en-GB')}</div>
                </div>
                
                <h2>Guest List</h2>
                
                <table class="guest-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Number of Tickets</th>
                            <th>Arrived</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${[...orders]
                            .sort((a, b) => {
                                const nameA = `${a.user?.firstName || ''} ${a.user?.lastName || ''}`.trim().toLowerCase();
                                const nameB = `${b.user?.firstName || ''} ${b.user?.lastName || ''}`.trim().toLowerCase();
                                return nameA.localeCompare(nameB);
                            })
                            .map((order, index) => {
                            const customer = order.user || { firstName: '', lastName: '', email: '' };
                            const tickets = order.tickets || [];
                            const totalQuantity = tickets.reduce((sum, ticket) => sum + (ticket.amount || 0), 0);
                            const fullName = `${customer.firstName} ${customer.lastName}`.trim() || customer.email || 'Unknown';
                            
                            return `
                                <tr>
                                    <td>${fullName}</td>
                                    <td>${totalQuantity}</td>
                                    <td><div class="checkbox"></div></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                
                <div class="no-print" style="margin-top: 30px; text-align: center;">
                    <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Print Guest List
                    </button>
                    <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
                        Close
                    </button>
                </div>
            </body>
            </html>
        `;

        // Write the content to the new window
        printWindow.document.write(guestListHTML);
        printWindow.document.close();

        // Wait for content to load, then open print dialog
        printWindow.onload = () => {
            printWindow.focus();
            // Small delay to ensure content is fully rendered
            setTimeout(() => {
                printWindow.print();
            }, 500);
        };
    };

    const copyEmails = () => {
        // Implementation for copying all customer emails
        const emails = orders.map(order => order.user?.email).filter(Boolean).join(', ');
        navigator.clipboard.writeText(emails);
        console.log('Copied emails to clipboard');
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatPrice = (price: number) => {
        return `£${price.toFixed(2)}`;
    };

    const getFullAddress = (venue: any) => {
        if (!venue) return 'Location TBA';
        const parts = [venue.name, venue.address, venue.city, venue.postcode].filter(Boolean);
        return parts.join(', ');
    };

    // Only show loading during genuine session loading or data loading, not on tab switches
    if (status === "loading" || loading) {
        return (
            <AdminLayout>
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </AdminLayout>
        );
    }

    if (!event) {
        return (
            <AdminLayout>
                <div className="p-6">
                    <h2 className="text-lg font-medium text-red-600">
                        Event not found
                    </h2>
                </div>
            </AdminLayout>
        );
    }

            const eventStatus = getEventStatus(event);
        const nextDate = event.dates?.[0]?.date;
        const categories = event.categories || [];
        const ordersList = orders || [];

        return (
            <AdminLayout permissionDenied={permissionDenied}>
                <div className="p-6">
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            JVS Event Orders Manager
                        </h1>
                        <p className="text-gray-600">
                            Welcome, JVS Admin
                        </p>
                    </div>

                    {/* Navigation */}
                    <div className="mb-6">
                        <button
                            className="mb-4 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
                            onClick={() => router.push('/admin/events')}
                        >
                            <ArrowLeftIcon className="w-4 h-4" />
                            Back to Events
                        </button>

                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            {event.title}
                        </h2>
                    </div>

                    {/* Event Details Card */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Event Details
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="flex items-center gap-2">
                                    <CalendarIcon className="w-5 h-5 text-gray-500" />
                                    <span className="text-sm text-gray-600">
                                        {nextDate ? formatDate(nextDate) : 'Date TBA'}
                                    </span>
                                </div>
                                <div>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        eventStatus === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                                        eventStatus === 'ongoing' ? 'bg-green-100 text-green-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {getStatusLabel(eventStatus)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapIcon className="w-5 h-5 text-gray-500" />
                                    <span className="text-sm text-gray-600">
                                        {getFullAddress(event.venue)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CreditCardIcon className="w-5 h-5 text-gray-500" />
                                    <span className="text-sm text-gray-600">
                                        Price TBA
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary Statistics Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <div className="bg-blue-600 text-white rounded-lg p-6 shadow-lg">
                            <div className="flex items-center gap-3">
                                <UsersIcon className="w-10 h-10" />
                                <div>
                                    <div className="text-3xl font-bold">
                                        {event.totalOrders || 0}
                                    </div>
                                    <div className="text-blue-100">
                                        Total Orders
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-green-600 text-white rounded-lg p-6 shadow-lg">
                            <div className="flex items-center gap-3">
                                <CurrencyDollarIcon className="w-10 h-10" />
                                <div>
                                    <div className="text-3xl font-bold">
                                        {formatPrice(event.totalRevenue || 0)}
                                    </div>
                                    <div className="text-green-100">
                                        Total Revenue
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <ArrowDownIcon className="w-6 h-6 text-blue-600" />
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Actions
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <button
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center justify-center gap-2"
                                    onClick={exportCSV}
                                >
                                    <ArrowDownIcon className="w-4 h-4" />
                                    Export CSV
                                </button>
                                <button
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center gap-2"
                                    onClick={printGuestList}
                                >
                                    <PrinterIcon className="w-4 h-4" />
                                    Print Guest List
                                </button>
                                <button
                                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center justify-center gap-2"
                                    onClick={copyEmails}
                                >
                                    <ClipboardIcon className="w-4 h-4" />
                                    Copy Emails
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Custom Fields Summary */}
                    {event.customFields && event.customFields.length > 0 && (() => {
                        const { formatCustomFieldsForDisplay } = require('../../../../utils/customFieldsFormatter');
                        
                        // Aggregate custom field responses
                        const customFieldsData = event.customFields.map(fieldDef => {
                            const responses = orders
                                .map(order => {
                                    if (!order.customFields) return null;
                                    try {
                                        const parsed = JSON.parse(order.customFields);
                                        return parsed[fieldDef.name];
                                    } catch {
                                        return null;
                                    }
                                })
                                .filter(Boolean);
                            
                            return {
                                label: fieldDef.label,
                                name: fieldDef.name,
                                responses: responses,
                                responseCount: responses.length,
                                uniqueResponses: Array.from(new Set(responses))
                            };
                        });
                        
                        return (
                            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Fields Summary</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {customFieldsData.map((field, idx) => (
                                        <div key={idx} className="border border-gray-200 rounded-lg p-4">
                                            <div className="text-sm font-medium text-gray-900 mb-2">{field.label}</div>
                                            <div className="text-xs text-gray-600">
                                                {field.responseCount} responses
                                            </div>
                                            {field.uniqueResponses.length <= 5 && (
                                                <div className="mt-2 space-y-1">
                                                    {field.uniqueResponses.map((response, ridx) => {
                                                        const count = field.responses.filter(r => r === response).length;
                                                        return (
                                                            <div key={ridx} className="text-xs text-gray-700">
                                                                • {response} ({count})
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Orders Table */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Orders ({ordersList.length})
                            </h3>

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
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Custom Info</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {ordersList.map((order) => {
                                            const customer = order.user || { firstName: '', lastName: '', email: '' };
                                            const tickets = order.tickets || [];
                                            
                                            // Calculate totals using correct field names from schema
                                            const totalQuantity = tickets.reduce((sum, ticket) => sum + (ticket.amount || 0), 0);
                                            const ticketTypes = tickets.map(ticket => {
                                                // Handle different possible structures for category
                                                if (ticket.category?.label) return ticket.category.label;
                                                if (ticket.category?.name) return ticket.category.name;
                                                if (ticket.categoryName) return ticket.categoryName;
                                                return 'Unknown';
                                            }).join(', ');
                                            
                                            // Use correct total field from schema
                                            const orderTotal = order.finalTotal || order.originalTotal || 0;
                                            
                                            return (
                                                <tr key={order.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {order.orderId || order.id}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {customer.firstName && customer.lastName 
                                                            ? `${customer.firstName} ${customer.lastName}`
                                                            : 'N/A'
                                                        }
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {customer.email || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {customer.phone || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {tickets.length > 0 ? ticketTypes : 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {totalQuantity}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {formatPrice(orderTotal)}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-900">
                                                        {(() => {
                                                            const { formatCustomFieldsSummary } = require('../../../../utils/customFieldsFormatter');
                                                            return formatCustomFieldsSummary(order.customFields, event.customFields, 40);
                                                        })()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                            order.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {order.status || 'Unknown'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </AdminLayout>
        );
}

// Temporarily remove getServerSideProps to test client-side authentication
