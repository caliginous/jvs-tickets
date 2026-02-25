import { useState, useEffect } from 'react';
import { Button } from '../../ui';
import { showToast } from '../../ui';
import {
    ExclamationIcon,
    CheckCircleIcon,
    RefreshIcon,
    ArrowRightIcon,
    InformationCircleIcon
} from '@heroicons/react/solid';

interface MigrationEvent {
    id: number;
    title: string;
    categories: Array<{
        id: number;
        name: string;
        price: number;
        maxAmount: number;
    }>;
    totalOrders: number;
    totalTickets: number;
}

export default function CategoryMigrationPanel() {
    const [events, setEvents] = useState<MigrationEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [migrating, setMigrating] = useState<number | null>(null);
    const [migratedEvents, setMigratedEvents] = useState<Set<number>>(new Set());

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/events/migrate-categories-to-ticket-types');
            if (response.ok) {
                const data = await response.json();
                setEvents(data.events);
            } else {
                showToast.error('Failed to load events');
            }
        } catch (error) {
            console.error('Error loading events:', error);
            showToast.error('Failed to load events');
        } finally {
            setLoading(false);
        }
    };

    const migrateEvent = async (eventId: number) => {
        if (!confirm(`Are you sure you want to migrate this event? This will:\n\n1. Create new EventTicketTypes from categories\n2. Update ${events.find(e => e.id === eventId)?.totalTickets || 0} existing tickets\n3. This cannot be undone\n\nProceed?`)) {
            return;
        }

        try {
            setMigrating(eventId);
            const response = await fetch('/api/admin/events/migrate-categories-to-ticket-types', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ eventId })
            });

            if (response.ok) {
                const result = await response.json();
                showToast.success(`✅ Migration successful! Created ${result.result.ticketTypesCreated} ticket types and migrated ${result.result.ticketsMigrated} tickets.`);
                setMigratedEvents(new Set([...Array.from(migratedEvents), eventId]));
                // Reload events to update the list
                loadEvents();
            } else {
                const error = await response.json();
                showToast.error(`Migration failed: ${error.error}`);
            }
        } catch (error) {
            console.error('Error migrating event:', error);
            showToast.error('Migration failed');
        } finally {
            setMigrating(null);
        }
    };

    const migrateAll = async () => {
        if (!confirm(`Migrate ALL ${events.length} events at once?\n\nThis will create EventTicketTypes for all category-based events.\n\nProceed?`)) {
            return;
        }

        for (const event of events) {
            if (!migratedEvents.has(event.id)) {
                await migrateEvent(event.id);
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const remainingEvents = events.filter(e => !migratedEvents.has(e.id));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start space-x-3">
                    <InformationCircleIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-lg font-medium text-blue-900 mb-2">
                            Category → EventTicketType Migration Tool
                        </h3>
                        <p className="text-sm text-blue-800 leading-relaxed">
                            This tool migrates legacy category-based events to the modern EventTicketType system.
                            Categories are deprecated and should no longer be used for ticket pricing.
                        </p>
                        <div className="mt-3 text-sm text-blue-900 space-y-1">
                            <p><strong>What this does:</strong></p>
                            <ul className="list-disc list-inside ml-2 space-y-1">
                                <li>Creates EventTicketTypes matching your categories</li>
                                <li>Converts category prices (pounds) to ticket type prices (pence)</li>
                                <li>Updates existing tickets to reference new ticket types</li>
                                <li>Preserves all order data and customer information</li>
                                <li>Maintains capacity limits and sold counts</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Events Needing Migration</p>
                    <p className="text-3xl font-bold text-gray-900">{remainingEvents.length}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Already Migrated</p>
                    <p className="text-3xl font-bold text-green-600">{migratedEvents.size}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Tickets to Migrate</p>
                    <p className="text-3xl font-bold text-blue-600">
                        {remainingEvents.reduce((sum, e) => sum + e.totalTickets, 0)}
                    </p>
                </div>
            </div>

            {/* Actions */}
            {remainingEvents.length > 0 && (
                <div className="flex justify-end space-x-3">
                    <Button
                        onClick={loadEvents}
                        variant="outline"
                    >
                        <RefreshIcon className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button
                        onClick={migrateAll}
                        disabled={migrating !== null}
                        variant="solid"
                    >
                        <ArrowRightIcon className="h-4 w-4 mr-2" />
                        Migrate All ({remainingEvents.length})
                    </Button>
                </div>
            )}

            {/* Events List */}
            {remainingEvents.length === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
                    <CheckCircleIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-green-900 mb-2">
                        All Done! 🎉
                    </h3>
                    <p className="text-green-800">
                        All events have been migrated to the EventTicketType system.
                    </p>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h4 className="text-lg font-medium text-gray-900">
                            Events Requiring Migration ({remainingEvents.length})
                        </h4>
                    </div>
                    <div className="divide-y divide-gray-200">
                        {remainingEvents.map((event) => (
                            <div key={event.id} className="p-6 hover:bg-gray-50">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h5 className="text-base font-medium text-gray-900 mb-2">
                                            {event.title}
                                        </h5>
                                        <div className="space-y-2">
                                            <p className="text-sm text-gray-600">
                                                <strong>Categories ({event.categories.length}):</strong>
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {event.categories.map((cat) => (
                                                    <div key={cat.id} className="text-sm bg-gray-100 rounded px-3 py-2">
                                                        <div className="font-medium">{cat.name}</div>
                                                        <div className="text-gray-600">
                                                            £{cat.price.toFixed(2)} 
                                                            {cat.maxAmount && ` • Max: ${cat.maxAmount}`}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-3">
                                                <span>📦 {event.totalOrders} orders</span>
                                                <span>🎫 {event.totalTickets} tickets</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="ml-6">
                                        <Button
                                            onClick={() => migrateEvent(event.id)}
                                            disabled={migrating !== null}
                                            loading={migrating === event.id}
                                            variant="solid"
                                        >
                                            {migrating === event.id ? (
                                                <>
                                                    <RefreshIcon className="h-4 w-4 mr-2 animate-spin" />
                                                    Migrating...
                                                </>
                                            ) : (
                                                <>
                                                    <ArrowRightIcon className="h-4 w-4 mr-2" />
                                                    Migrate
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Warning */}
            {remainingEvents.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                        <ExclamationIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-800">
                            <p className="font-medium mb-1">Important Notes:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Migration creates new EventTicketTypes - existing categories remain unchanged</li>
                                <li>Existing tickets will be updated to reference new ticket types</li>
                                <li>Category prices (in pounds) will be converted to pence (£15.00 → 1500 pence)</li>
                                <li>This operation is safe but cannot be automatically reversed</li>
                                <li>Test with a single event first before migrating all</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
