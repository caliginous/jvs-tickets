import { useSession } from "next-auth/react";
import { AdminLayout } from "../../../components/admin/layout";
import { getAdminServerSideProps } from "../../../constants/serverUtil";
import { PencilIcon, PlusIcon, RefreshIcon } from "@heroicons/react/solid";
import prisma from "../../../lib/prisma";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ManageEventDialog } from "../../../components/admin/dialogs/ManageEventDialog";
import { PermissionSection, PermissionType } from "../../../constants/interfaces";
import { getOption } from "../../../lib/options";
import { Options } from "../../../constants/Constants";
import { Button, toast } from "../../../ui";

export default function Events({
    events,
    seatmaps,
    categories,
    venues,
    permissionDenied,
    currency
}) {
    const { data: session, status } = useSession();
    const [addEventOpen, setAddEventOpen] = useState(false);
    const [event, setEvent] = useState(null);
    const [revalidating, setRevalidating] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const [localEvents, setLocalEvents] = useState(events || []);
    const router = useRouter();

    // Check for editEvent query parameter and open edit modal
    useEffect(() => {







        
        if (router.query.editEvent && localEvents.length > 0) {
            const editEventId = Array.isArray(router.query.editEvent) ? router.query.editEvent[0] : router.query.editEvent;
            // Try multiple comparison methods
            const eventToEdit = localEvents.find(e => 
                e.id.toString() === editEventId ||
                e.id === parseInt(editEventId) ||
                e.id === editEventId
            );

            if (eventToEdit) {
                setEvent(eventToEdit);
                setAddEventOpen(true);
                // Clean up the URL
                router.replace('/admin/events', undefined, { shallow: true });
            }
        }
    }, [router.query.editEvent, localEvents, router]);
    


    // Let AdminLayout handle authentication - don't return null here as it causes blank pages

    const refreshProps = async () => {
        try {
            const response = await fetch('/api/admin/events');
            if (response.ok) {
                const updatedEvents = await response.json();
                setLocalEvents(updatedEvents);
            }
        } catch (error) {
            // Silent error handling
        }
    };

    const revalidateMainSite = async () => {
        setRevalidating(true);
        try {
            const response = await fetch('https://jvs-vercel.vercel.app/api/revalidate-events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    secret: 'VXAm6hyyfcxfdBrw9bIZZIzCo3nF1G2aVZuyKsiRMSA=',
                    action: 'events_updated'
                })
            });

            if (response.ok) {
                const responseData = await response.json();
                setSnackbar({
                    open: true,
                    message: '✅ Main website events updated successfully!',
                    severity: 'success'
                });
            } else {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
        } catch (error) {


            setSnackbar({
                open: true,
                message: `❌ Failed to update main website: ${error.message}`,
                severity: 'error'
            });
        } finally {
            setRevalidating(false);
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };



    // Only show loading spinner during initial session load, not on tab switches
    if (status === "loading") {
        return (
            <AdminLayout permissionDenied={permissionDenied}>
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="ml-3 text-gray-600">Loading events...</div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout permissionDenied={permissionDenied}>
            <ManageEventDialog
                open={addEventOpen}
                event={event}
                onClose={() => {
                    setEvent(null)
                    setAddEventOpen(false)
                }}
                seatmaps={seatmaps}
                onChange={refreshProps}
                categories={categories}
                venues={venues}
                currency={currency}
            />
            {snackbar.open && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg ${
                    snackbar.severity === 'error' ? 'bg-red-100 border border-red-400 text-red-700' :
                    'bg-green-100 border border-green-400 text-green-700'
                }`}>
                    <div className="flex items-center justify-between">
                        <span>{snackbar.message}</span>
                        <button
                            onClick={handleCloseSnackbar}
                            className="ml-4 text-gray-400 hover:text-gray-600"
                        >
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
            <div className="pb-5">
                <h1 className="text-2xl font-semibold text-gray-900">Events</h1>
            </div>
            <div className="flex">
                <div className="flex-grow" />
                <button 
                    className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    onClick={revalidateMainSite}
                    disabled={revalidating}
                >
                    <RefreshIcon className="w-4 h-4" />
                    {revalidating ? 'Updating...' : 'Update Main Website'}
                </button>

                <button 
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 flex items-center gap-2"
                    onClick={() => setAddEventOpen(true)}
                >
                    <PlusIcon className="w-4 h-4" /> Add Event
                </button>
            </div>
            <div>
                {(localEvents?.length ?? 0) === 0 ? (
                    <p className="text-gray-900">
                        No events available yet
                    </p>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Edit</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {localEvents.map((event, index) => {
                                // Get the earliest event date for display
                                const getEarliestDate = (event) => {
                                    if (!event.dates || event.dates.length === 0) return 'No date set';
                                    const validDates = event.dates
                                        .filter(date => date.date)
                                        .map(date => new Date(date.date));
                                    if (validDates.length === 0) return 'No date set';
                                    const earliestDate = new Date(Math.min(...validDates));
                                    return new Intl.DateTimeFormat('en-GB', {
                                        weekday: 'short',
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        timeZone: 'Europe/London'
                                    }).format(earliestDate);
                                };

                                return (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{event.title}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {getEarliestDate(event)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                event.isActive 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {event.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {event.ticketsBought}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                                onClick={() => setEvent(event)}
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </AdminLayout>
    );
}

export async function getServerSideProps(context) {
    return await getAdminServerSideProps(
        context,
        async () => {
            const events = await prisma.event.findMany({
                include: {
                    dates: {
                        include: {
                            orders: {
                                select: {
                                    tickets: true
                                }
                            },
                        }
                    },
                    customFields: true,
                    categories: {
                        include: {
                            category: true
                        }
                    }
                }
            });

            const serializableEvents = events.map((event) => {
                return {
                    ...event,
                    ticketsBought: event.dates.map(date => date.orders).flat().reduce(
                        (a, order) =>
                            a + order.tickets.length,
                        0
                    ),
                    orders: [],
                    dates: event.dates.map(({orders, ...date}) => ({
                        ...date,
                        date: date.date?.toISOString() ?? null,
                        ticketSaleStartDate: date.ticketSaleStartDate?.toISOString() ?? null,
                        ticketSaleEndDate: date.ticketSaleEndDate?.toISOString() ?? null
                    }))
                };
            }).sort((a, b) => {
                // Sort by the earliest event date (latest events first)
                const getEarliestDate = (event) => {
                    if (!event.dates || event.dates.length === 0) return new Date(0);
                    const validDates = event.dates
                        .filter(date => date.date)
                        .map(date => new Date(date.date));
                    if (validDates.length === 0) return new Date(0);
                    return new Date(Math.min(...validDates));
                };
                
                const dateA = getEarliestDate(a);
                const dateB = getEarliestDate(b);
                
                // Sort latest to oldest (descending order)
                return dateB.getTime() - dateA.getTime();
            });

            const seatmaps = (await prisma.seatMap.findMany())
                .map(seatmap => ({...seatmap, preview: null, containsPreview: seatmap.preview !== null}));
            const categories = await prisma.category.findMany();
            const venues = await (prisma as any).venue.findMany({
                where: { isActive: true },
                orderBy: { name: 'asc' }
            });

            return {
                props: {
                    events: serializableEvents,
                    seatmaps,
                    categories,
                    venues,
                    currency: await getOption(Options.Currency)
                }
            };
        },
        {
            permission: PermissionSection.EventManagement,
            permissionType: PermissionType.Read
        }
    );
}
