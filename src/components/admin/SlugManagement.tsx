import React, { useState, useEffect } from 'react';
import { Button } from '../../ui';
import { showToast } from '../../ui';
import axios from 'axios';
import { getEventUrl } from '../../utils/slug';

interface EventSlugInfo {
    id: number;
    title: string;
    slug: string | null;
    hasSlug: boolean;
}

interface SlugStats {
    total: number;
    withSlug: number;
    withoutSlug: number;
    events: EventSlugInfo[];
}

export const SlugManagement: React.FC = () => {
    const [stats, setStats] = useState<SlugStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
    const [regeneratingId, setRegeneratingId] = useState<number | null>(null);

    useEffect(() => {
        loadSlugStats();
    }, []);

    const loadSlugStats = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/admin/events/slugs', { withCredentials: true });
            setStats(response.data);
        } catch (error: any) {
            console.error('Error loading slug stats:', error);
            showToast.error('Failed to load slug statistics');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateMissingSlugs = async () => {
        if (!stats || stats.withoutSlug === 0) return;

        try {
            setGenerating(true);
            const response = await axios.post('/api/admin/events/slugs', {
                action: 'generate-missing'
            }, { withCredentials: true });

            showToast.success(`Generated slugs for ${response.data.successCount} events`);
            await loadSlugStats(); // Reload stats
        } catch (error: any) {
            console.error('Error generating slugs:', error);
            showToast.error(error.response?.data?.error || 'Failed to generate slugs');
        } finally {
            setGenerating(false);
        }
    };

    const handleRegenerateSlug = async (eventId: number) => {
        try {
            setRegeneratingId(eventId);
            const response = await axios.post('/api/admin/events/slugs', {
                action: 'regenerate',
                eventId
            }, { withCredentials: true });

            showToast.success('Slug regenerated successfully');
            await loadSlugStats(); // Reload stats
        } catch (error: any) {
            console.error('Error regenerating slug:', error);
            showToast.error(error.response?.data?.error || 'Failed to regenerate slug');
        } finally {
            setRegeneratingId(null);
        }
    };

    const handleUpdateSlug = async (eventId: number, newSlug: string) => {
        try {
            const response = await axios.post('/api/admin/events/slugs', {
                action: 'update',
                eventId,
                slug: newSlug
            }, { withCredentials: true });

            showToast.success('Slug updated successfully');
            await loadSlugStats(); // Reload stats
            setSelectedEvent(null);
        } catch (error: any) {
            console.error('Error updating slug:', error);
            showToast.error(error.response?.data?.error || 'Failed to update slug');
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="p-6">
                <div className="text-center text-gray-500">
                    Failed to load slug statistics
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                    <div className="text-sm text-gray-500">Total Events</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg shadow">
                    <div className="text-2xl font-bold text-green-600">{stats.withSlug}</div>
                    <div className="text-sm text-gray-500">Events with Slugs</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg shadow">
                    <div className="text-2xl font-bold text-yellow-600">{stats.withoutSlug}</div>
                    <div className="text-sm text-gray-500">Events without Slugs</div>
                </div>
            </div>

            {/* Bulk Actions */}
            <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Bulk Actions</h3>
                <div className="flex gap-3">
                    <Button
                        onClick={handleGenerateMissingSlugs}
                        disabled={generating || stats.withoutSlug === 0}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {generating ? 'Generating...' : `Generate Slugs for ${stats.withoutSlug} Events`}
                    </Button>
                    <Button
                        onClick={loadSlugStats}
                        variant="outline"
                        disabled={loading}
                    >
                        Refresh Stats
                    </Button>
                </div>
            </div>

            {/* Events Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Event Slugs</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Event
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Slug
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Public URL
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {stats.events.map((event) => (
                                <tr key={event.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {event.title}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            ID: {event.id}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {selectedEvent === event.id ? (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    defaultValue={event.slug || ''}
                                                    className="flex-1 px-2 py-1 border rounded text-sm"
                                                    placeholder="Enter slug"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            const input = e.target as HTMLInputElement;
                                                            handleUpdateSlug(event.id, input.value);
                                                        } else if (e.key === 'Escape') {
                                                            setSelectedEvent(null);
                                                        }
                                                    }}
                                                    autoFocus
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setSelectedEvent(null)}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-900">
                                                {event.slug || <span className="text-gray-400 italic">No slug</span>}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {event.hasSlug ? (
                                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                                ✓ Has Slug
                                            </span>
                                        ) : (
                                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                                                ⚠ No Slug
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {event.slug ? (
                                            <a
                                                href={getEventUrl(event)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 hover:text-blue-800 underline"
                                            >
                                                View Event →
                                            </a>
                                        ) : (
                                            <span className="text-sm text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        {event.hasSlug ? (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleRegenerateSlug(event.id)}
                                                    disabled={regeneratingId === event.id}
                                                >
                                                    {regeneratingId === event.id ? '...' : 'Regenerate'}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setSelectedEvent(event.id)}
                                                >
                                                    Edit
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                size="sm"
                                                onClick={() => handleRegenerateSlug(event.id)}
                                                disabled={regeneratingId === event.id}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                {regeneratingId === event.id ? '...' : 'Generate'}
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};













