import { useSession } from "next-auth/react";
import { AdminLayout } from "../../components/admin/layout";
import { getAdminServerSideProps } from "../../constants/serverUtil";
import prisma from "../../lib/prisma";
import { getEventTitle } from "../../constants/util";
import { getOption } from "../../lib/options";
import { Options } from "../../constants/Constants";
import Link from "next/link";
import { CalendarIcon, EyeIcon, PencilIcon, ShoppingCartIcon } from "@heroicons/react/solid";

export default function Dashboard({upcomingEvents, recentOrders, currency, permissionDenied, authStep}) {
    const { data: session, status } = useSession();

    // Debug logging
      // Debug logging removed for production

    // Only show loading spinner during initial session load, not on tab switches
    if (status === "loading") {
        return (
            <AdminLayout permissionDenied={permissionDenied} authStep={authStep}>
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="ml-3 text-gray-600">Loading admin dashboard...</div>
                </div>
            </AdminLayout>
        );
    }

    // For unauthenticated status or missing session, let AdminLayout handle it
    // The AdminLayout will redirect to login based on permissionDenied prop from server-side props
    if (status === "unauthenticated") {
        // Don't show loading - let AdminLayout handle the redirect
        return (
            <AdminLayout permissionDenied={true} authStep="unauthenticated">
                <div></div>
            </AdminLayout>
        );
    }

    // Debug logging removed for production

    return (
        <AdminLayout permissionDenied={permissionDenied} authStep={authStep}>
            <div className="pb-5 space-y-6">
                <h1 className="text-2xl font-bold pl-2">Hi, Welcome back <span className="font-bold">{session.user?.name || (session as any).name || 'User'}</span></h1>
                
                {/* Upcoming Events Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center">
                            <CalendarIcon className="h-6 w-6 text-blue-600 mr-3" />
                            <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
                        </div>
                    </div>
                    <div className="p-6">
                        {upcomingEvents && upcomingEvents.length > 0 ? (
                            <div className="space-y-4">
                                {upcomingEvents.map((event) => (
                                    <div key={event.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-900">{event.title}</h3>
                                            <p className="text-sm text-gray-600">
                                                {new Intl.DateTimeFormat('en-GB', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    timeZone: 'Europe/London'
                                                }).format(new Date(event.date))}
                                            </p>
                                            <p className="text-sm text-gray-500">{event.venue || 'Venue TBC'}</p>
                                        </div>
                                        <div className="flex space-x-2">
                                            <Link href={`/admin/events?editEvent=${event.id}`}>
                                                <a className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                                    <PencilIcon className="h-4 w-4 mr-2" />
                                                    Edit Event
                                                </a>
                                            </Link>
                                            <Link href={`/admin/reports?eventId=${event.id}`}>
                                                <a className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                                    <EyeIcon className="h-4 w-4 mr-2" />
                                                    Show Report
                                                </a>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming events</h3>
                                <p className="mt-1 text-sm text-gray-500">Get started by creating your first event.</p>
                                <div className="mt-6">
                                    <Link href="/admin/events">
                                        <a className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                            <CalendarIcon className="h-4 w-4 mr-2" />
                                            Create Event
                                        </a>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Orders Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <ShoppingCartIcon className="h-6 w-6 text-green-600 mr-3" />
                                <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
                            </div>
                            <Link href="/admin/orders">
                                <a className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                                    View all orders →
                                </a>
                            </Link>
                        </div>
                    </div>
                    <div className="p-6">
                        {recentOrders && recentOrders.length > 0 ? (
                            <div className="space-y-3">
                                {recentOrders.map((order) => (
                                    <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {order.user?.firstName} {order.user?.lastName}
                                                </span>
                                                <span className="text-xs text-gray-500">•</span>
                                                <span className="text-sm text-gray-600">
                                                    {order.tickets?.length || 0} ticket{order.tickets?.length !== 1 ? 's' : ''}
                                                </span>
                                                <span className="text-xs text-gray-500">•</span>
                                                <span className="text-sm text-gray-600">
                                                    {getEventTitle(order.eventDate)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Intl.DateTimeFormat('en-GB', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    timeZone: 'Europe/London'
                                                }).format(new Date(order.date))}
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                order.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                                order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {order.status}
                                            </span>
                                            <Link href={`/admin/orders?orderId=${order.id}`}>
                                                <a className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                                                    View →
                                                </a>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <ShoppingCartIcon className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No recent orders</h3>
                                <p className="mt-1 text-sm text-gray-500">Orders will appear here once customers start booking.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

export async function getServerSideProps(context) {
    try {
        return await getAdminServerSideProps(context, async () => {
            try {
                const currentDate = new Date();
                let currency = "GBP";

                // Fetch upcoming events (events with dates in the future)
                let upcomingEvents = [];
                try {
                    upcomingEvents = await prisma.eventDate.findMany({
                        where: {
                            date: {
                                gte: currentDate
                            }
                        },
                        include: {
                            event: {
                                select: {
                                    id: true,
                                    title: true,
                                    venue: {
                                        select: {
                                            name: true
                                        }
                                    }
                                }
                            }
                        },
                        orderBy: {
                            date: 'asc'
                        },
                        take: 10 // Limit to 10 upcoming events
                    });

                    // Transform the data to include title and venue
                    upcomingEvents = upcomingEvents.map(eventDate => ({
                        id: eventDate.event.id, // Use Event ID, not EventDate ID
                        title: eventDate.event.title,
                        date: eventDate.date,
                        venue: eventDate.event.venue?.name
                    }));
                    
                    console.log('Dashboard: Upcoming events found:', upcomingEvents.map(e => ({ id: e.id, title: e.title, date: e.date })));
                } catch (error) {
                    console.error('Error fetching upcoming events:', error);
                    upcomingEvents = [];
                }

                // Fetch recent orders (last 15 orders)
                let recentOrders = [];
                try {
                    recentOrders = await prisma.order.findMany({
                        include: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true
                                }
                            },
                            tickets: {
                                select: {
                                    id: true
                                }
                            },
                            eventDate: {
                                include: {
                                    event: {
                                        select: {
                                            id: true,
                                            title: true
                                        }
                                    }
                                }
                            }
                        },
                        orderBy: {
                            date: 'desc'
                        },
                        take: 15
                    });
                } catch (error) {
                    console.error('Error fetching recent orders:', error);
                    recentOrders = [];
                }

                try {
                    currency = await getOption(Options.Currency) || "GBP";
                } catch (error) {
                    console.error('Error getting currency option:', error);
                    currency = "GBP";
                }

                return {
                    props: {
                        upcomingEvents,
                        recentOrders,
                        currency
                    }
                };
            } catch (error) {
                console.error('Error in admin dashboard getServerSideProps:', error);
                return {
                    props: {
                        upcomingEvents: [],
                        recentOrders: [],
                        currency: "GBP"
                    }
                };
            }
        });
    } catch (error) {
        console.error('Error in admin dashboard getServerSideProps:', error);
        return {
            props: {
                upcomingEvents: [],
                recentOrders: [],
                currency: "GBP"
            }
        };
    }
}
