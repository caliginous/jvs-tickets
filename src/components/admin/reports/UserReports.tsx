import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../../ui';
import { showToast } from '../../../ui';
import {
    SearchIcon,
    UserGroupIcon,
    CurrencyPoundIcon,
    TicketIcon,
    CalendarIcon,
    DownloadIcon,
    XIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    FilterIcon,
    StarIcon,
    ClockIcon,
    MailIcon
} from '@heroicons/react/solid';

interface UserAnalytics {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    zip: string;
    countryCode: string;
    totalOrders: number;
    uniqueEvents: number;
    totalTickets: number;
    totalRevenue: number;
    averageOrderValue: number;
    firstPurchase: string;
    lastPurchase: string;
    segment: 'New' | 'Regular' | 'VIP';
    isActive: boolean;
    orders: Array<{
        id: string;
        date: string;
        eventTitle: string;
        eventDate: string;
        total: number;
        ticketCount: number;
        status: string;
    }>;
}

interface Summary {
    totalUsers: number;
    totalRevenue: number;
    totalOrders: number;
    totalTickets: number;
    averageRevenuePerUser: number;
    activeUsers: number;
    vipUsers: number;
    regularUsers: number;
    newUsers: number;
}

export default function UserReports() {
    const [users, setUsers] = useState<UserAnalytics[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('recent');
    const [segment, setSegment] = useState('all');
    const [dateFilter, setDateFilter] = useState('always');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [selectedUser, setSelectedUser] = useState<UserAnalytics | null>(null);
    const [showUserDetails, setShowUserDetails] = useState(false);

    // Generate year options for the last 10 years
    const yearOptions = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                sortBy,
                segment,
                dateFilter,
                ...(dateFilter === 'selectyear' && { year: selectedYear }),
                ...(searchTerm && { search: searchTerm })
            });
            
            const response = await fetch(`/api/admin/reports/users?${params}`);
            if (response.ok) {
                const data = await response.json();
                setUsers(data.users);
                setSummary(data.summary);
            } else {
                showToast.error('Failed to load user data');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            showToast.error('Failed to load user data');
        } finally {
            setLoading(false);
        }
    }, [sortBy, segment, dateFilter, selectedYear, searchTerm]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleSearch = () => {
        fetchUsers();
    };

    const handleExportEmails = () => {
        const emails = users.map(u => u.email).join(', ');
        navigator.clipboard.writeText(emails);
        showToast.success(`${users.length} email addresses copied to clipboard`);
    };

    const handleExportCSV = () => {
        const headers = [
            'Name',
            'Email',
            'Phone',
            'City',
            'Total Orders',
            'Events Attended',
            'Total Tickets',
            'Total Spent',
            'Avg Order Value',
            'First Purchase',
            'Last Purchase',
            'Segment',
            'Status'
        ];

        const rows = users.map(user => [
            `"${user.firstName} ${user.lastName}"`,
            `"${user.email}"`,
            `"${user.phone || ''}"`,
            `"${user.city}"`,
            user.totalOrders,
            user.uniqueEvents,
            user.totalTickets,
            `"£${(user.totalRevenue / 100).toFixed(2)}"`,
            `"£${(user.averageOrderValue / 100).toFixed(2)}"`,
            `"${new Date(user.firstPurchase).toLocaleDateString('en-GB')}"`,
            `"${new Date(user.lastPurchase).toLocaleDateString('en-GB')}"`,
            user.segment,
            user.isActive ? 'Active' : 'Inactive'
        ].join(','));

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `user_analytics_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast.success('User data exported to CSV');
    };

    const formatCurrency = (pence: number) => {
        return `£${(pence / 100).toFixed(2)}`;
    };

    const getSegmentColor = (segment: string) => {
        switch (segment) {
            case 'VIP': return 'bg-purple-100 text-purple-800';
            case 'Regular': return 'bg-blue-100 text-blue-800';
            case 'New': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading && users.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Statistics */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Customers</p>
                                <p className="text-2xl font-bold text-gray-900">{summary.totalUsers}</p>
                            </div>
                            <UserGroupIcon className="h-10 w-10 text-blue-500" />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            {summary.activeUsers} active • {summary.vipUsers} VIP
                        </p>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Revenue</p>
                                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalRevenue)}</p>
                            </div>
                            <CurrencyPoundIcon className="h-10 w-10 text-green-500" />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            {formatCurrency(summary.averageRevenuePerUser)} avg per customer
                        </p>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Orders</p>
                                <p className="text-2xl font-bold text-gray-900">{summary.totalOrders}</p>
                            </div>
                            <TicketIcon className="h-10 w-10 text-purple-500" />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            {summary.totalTickets} tickets sold
                        </p>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Customer Segments</p>
                                <p className="text-2xl font-bold text-gray-900">{summary.vipUsers}</p>
                            </div>
                            <StarIcon className="h-10 w-10 text-yellow-500" />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            {summary.regularUsers} regular • {summary.newUsers} new
                        </p>
                    </div>
                </div>
            )}

            {/* Search and Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Search by name or email..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Sort */}
                    <div className="w-full md:w-48">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="recent">Most Recent</option>
                            <option value="alphabetical">Alphabetical</option>
                            <option value="tickets">Most Tickets</option>
                            <option value="revenue">Highest Spend</option>
                            <option value="events">Most Events</option>
                        </select>
                    </div>

                    {/* Segment Filter */}
                    <div className="w-full md:w-48">
                        <select
                            value={segment}
                            onChange={(e) => setSegment(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Customers</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="vip">VIP</option>
                            <option value="regular">Regular</option>
                            <option value="new">New</option>
                        </select>
                    </div>

                    {/* Date Filter */}
                    <div className="w-full md:w-48">
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
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

                    {/* Year Selector (conditional) */}
                    {dateFilter === 'selectyear' && (
                        <div className="w-full md:w-32">
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {yearOptions.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                        <Button onClick={handleExportEmails} variant="outline" className="flex items-center">
                            <MailIcon className="h-4 w-4 mr-2" />
                            Emails
                        </Button>
                        <Button onClick={handleExportCSV} variant="outline" className="flex items-center">
                            <DownloadIcon className="h-4 w-4 mr-2" />
                            CSV
                        </Button>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segment</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Events</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tickets</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Purchase</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => {
                                    setSelectedUser(user);
                                    setShowUserDetails(true);
                                }}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {user.firstName} {user.lastName}
                                                </div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSegmentColor(user.segment)}`}>
                                            {user.segment === 'VIP' && <StarIcon className="h-3 w-3 mr-1" />}
                                            {user.segment}
                                        </span>
                                        {user.isActive && (
                                            <span className="ml-2 inline-flex items-center text-xs text-green-600">
                                                <div className="h-2 w-2 bg-green-500 rounded-full mr-1"></div>
                                                Active
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {user.totalOrders}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {user.uniqueEvents}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {user.totalTickets}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {formatCurrency(user.totalRevenue)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(user.lastPurchase).toLocaleDateString('en-GB')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:text-blue-800">
                                        View Details →
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* User Details Modal */}
            {showUserDetails && selectedUser && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white mb-10">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-gray-900">
                                {selectedUser.firstName} {selectedUser.lastName}
                            </h3>
                            <button
                                onClick={() => setShowUserDetails(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XIcon className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Customer Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="space-y-4">
                                <h4 className="font-semibold text-gray-900">Contact Information</h4>
                                <div className="space-y-2 text-sm">
                                    <p><span className="font-medium">Email:</span> {selectedUser.email}</p>
                                    <p><span className="font-medium">Phone:</span> {selectedUser.phone || 'N/A'}</p>
                                    <p><span className="font-medium">Address:</span> {selectedUser.address}</p>
                                    <p><span className="font-medium">City:</span> {selectedUser.city}, {selectedUser.zip}</p>
                                    <p><span className="font-medium">Country:</span> {selectedUser.countryCode}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="font-semibold text-gray-900">Purchase Summary</h4>
                                <div className="space-y-2 text-sm">
                                    <p><span className="font-medium">Total Spent:</span> {formatCurrency(selectedUser.totalRevenue)}</p>
                                    <p><span className="font-medium">Total Orders:</span> {selectedUser.totalOrders}</p>
                                    <p><span className="font-medium">Total Tickets:</span> {selectedUser.totalTickets}</p>
                                    <p><span className="font-medium">Events Attended:</span> {selectedUser.uniqueEvents}</p>
                                    <p><span className="font-medium">Avg Order Value:</span> {formatCurrency(selectedUser.averageOrderValue)}</p>
                                    <p><span className="font-medium">Customer Since:</span> {new Date(selectedUser.firstPurchase).toLocaleDateString('en-GB')}</p>
                                    <p><span className="font-medium">Last Purchase:</span> {new Date(selectedUser.lastPurchase).toLocaleDateString('en-GB')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Order History */}
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-4">Order History ({selectedUser.orders.length})</h4>
                            <div className="max-h-96 overflow-y-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tickets</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {selectedUser.orders.map((order) => (
                                            <tr key={order.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {new Date(order.date).toLocaleDateString('en-GB')}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{order.eventTitle}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{order.ticketCount}</td>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                    {formatCurrency(order.total)}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                        order.status === 'PAID' || order.status === 'CONFIRMED'
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
