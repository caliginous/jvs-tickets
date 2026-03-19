import { useSession } from "next-auth/react";
import { AdminLayout } from "../../../../components/admin/layout";
import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { FullSizeLoading } from "../../../../components/FullSizeLoading";
import { showToast } from "../../../../ui";
import { ArrowLeftIcon } from "@heroicons/react/solid";

interface WaitlistEntry {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    requestedQuantity: number;
    status: string;
    createdAt: string;
    eventTicketType: { id: number; name: string };
    eventDate: { id: number; title: string | null; date: string | null };
    offers: Array<{ id: string; status: string; expiresAt: string }>;
}

interface ActiveOffer {
    id: string;
    quantity: number;
    status: string;
    expiresAt: string;
    createdAt: string;
    waitlistEntry: { email: string; firstName: string | null; lastName: string | null };
    eventTicketType: { id: number; name: string };
}

interface WaitlistData {
    entries: WaitlistEntry[];
    activeOffers: ActiveOffer[];
    summary: {
        entries: Record<string, number>;
        offers: Record<string, number>;
    };
    conversionRate: string;
}

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    OFFERED: 'bg-blue-100 text-blue-800',
    FULFILLED: 'bg-purple-100 text-purple-800',
    EXPIRED: 'bg-gray-100 text-gray-600',
    DECLINED: 'bg-orange-100 text-orange-800',
    REMOVED: 'bg-red-100 text-red-800',
    CLAIMED: 'bg-purple-100 text-purple-800',
    CANCELLED: 'bg-red-100 text-red-800',
};

function StatusBadge({ status }: { status: string }) {
    const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
            {status}
        </span>
    );
}

export default function EventWaitlistPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const { eventId } = router.query;
    const [data, setData] = useState<WaitlistData | null>(null);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        if (!eventId) return;
        try {
            const resp = await axios.get(`/api/admin/events/${eventId}/waitlist`);
            setData(resp.data);
        } catch (err) {
            console.error('Failed to load waitlist data:', err);
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRemoveEntry = async (entryId: string) => {
        if (!confirm('Remove this waitlist entry? Any active offer will be cancelled.')) return;
        try {
            await axios.post(`/api/admin/waitlist/${entryId}/remove`);
            showToast.success('Entry removed');
            loadData();
        } catch (err: any) {
            showToast.error(err.response?.data?.error || 'Failed to remove entry');
        }
    };

    const handleExpireOffer = async (offerId: string) => {
        if (!confirm('Manually expire this offer?')) return;
        try {
            await axios.post(`/api/admin/waitlist/offers/${offerId}/expire`);
            showToast.success('Offer expired');
            loadData();
        } catch (err: any) {
            showToast.error(err.response?.data?.error || 'Failed to expire offer');
        }
    };

    const handleResendOffer = async (offerId: string) => {
        try {
            await axios.post(`/api/admin/waitlist/offers/${offerId}/resend`);
            showToast.success('Offer email resent');
        } catch (err: any) {
            showToast.error(err.response?.data?.error || 'Failed to resend');
        }
    };

    const handleAllocate = async () => {
        try {
            const resp = await axios.post(`/api/admin/events/${eventId}/waitlist/allocate`);
            const results = resp.data.results || [];
            const totalCreated = results.reduce((s: number, r: any) => s + (r.offersCreated || 0), 0);
            showToast.success(`Allocation complete: ${totalCreated} offers created`);
            loadData();
        } catch (err: any) {
            showToast.error(err.response?.data?.error || 'Allocation failed');
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <FullSizeLoading isLoading={true} />
            </AdminLayout>
        );
    }

    const entries = data?.entries || [];
    const activeOffers = data?.activeOffers || [];
    const summary = data?.summary || { entries: {}, offers: {} };

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <button onClick={() => router.back()} className="p-1 rounded hover:bg-gray-100">
                            <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900">Waitlist</h1>
                    </div>
                    <button
                        onClick={handleAllocate}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Run Allocation
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <SummaryCard label="Active Entries" value={summary.entries?.ACTIVE || 0} />
                    <SummaryCard label="Active Offers" value={summary.offers?.ACTIVE || 0} />
                    <SummaryCard label="Fulfilled" value={summary.entries?.FULFILLED || 0} />
                    <SummaryCard label="Conversion Rate" value={data?.conversionRate || '0%'} isText />
                </div>

                {/* Stat pills */}
                <div className="flex flex-wrap gap-2 text-xs">
                    {Object.entries(summary.entries).map(([status, count]) => (
                        <span key={`e-${status}`} className="px-2 py-1 bg-gray-100 rounded">
                            Entries {status}: {count as number}
                        </span>
                    ))}
                    {Object.entries(summary.offers).map(([status, count]) => (
                        <span key={`o-${status}`} className="px-2 py-1 bg-gray-100 rounded">
                            Offers {status}: {count as number}
                        </span>
                    ))}
                </div>

                {/* Active Offers */}
                {activeOffers.length > 0 && (
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-3">Active Offers</h2>
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {activeOffers.map(offer => (
                                        <tr key={offer.id}>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="font-medium text-gray-900">
                                                    {offer.waitlistEntry.firstName} {offer.waitlistEntry.lastName}
                                                </div>
                                                <div className="text-gray-500 text-xs">{offer.waitlistEntry.email}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{offer.eventTicketType.name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{offer.quantity}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                {new Date(offer.expiresAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right space-x-2">
                                                <button onClick={() => handleResendOffer(offer.id)} className="text-blue-600 hover:text-blue-800 text-xs">Resend</button>
                                                <button onClick={() => handleExpireOffer(offer.id)} className="text-red-600 hover:text-red-800 text-xs">Expire</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* All Entries */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">All Entries ({entries.length})</h2>
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {entries.map(entry => (
                                    <tr key={entry.id}>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="font-medium text-gray-900">
                                                {entry.firstName || ''} {entry.lastName || ''}
                                            </div>
                                            <div className="text-gray-500 text-xs">{entry.email}</div>
                                            {entry.phone && <div className="text-gray-400 text-xs">{entry.phone}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{entry.eventTicketType?.name}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{entry.requestedQuantity}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <StatusBadge status={entry.status} />
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {new Date(entry.createdAt).toLocaleDateString('en-GB')}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right">
                                            {(entry.status === 'ACTIVE' || entry.status === 'OFFERED') && (
                                                <button onClick={() => handleRemoveEntry(entry.id)} className="text-red-600 hover:text-red-800 text-xs">Remove</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {entries.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">
                                            No waitlist entries yet
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

function SummaryCard({ label, value, isText }: { label: string; value: number | string; isText?: boolean }) {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{isText ? value : value}</p>
        </div>
    );
}
