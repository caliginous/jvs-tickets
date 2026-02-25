import React, { useEffect, useState } from "react";
import { useAppDispatch } from "../store/hooks";
import { resetOrder } from "../store/reducers/orderReducer";
import { resetPayment } from "../store/reducers/paymentReducer";
import { getOption } from "../lib/options";
import { Options } from "../constants/Constants";
import loadNamespaces from "next-translate/loadNamespaces";
import useTranslation from "next-translate/useTranslation";
import Link from "next/link";
import Image from "next/image";
import { formatInTZ } from "../utils/datetime";
import Navbar from "../components/booking/Navbar";
import Footer from "../components/booking/Footer";

export default function Home({ events: initialEvents, direction, title, subtitle }) {
    const {t} = useTranslation("common");
    const dispatch = useAppDispatch();
    const [events, setEvents] = useState(initialEvents);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        dispatch(resetPayment());
        dispatch(resetOrder());
        
        // Fetch events from API if no initial events
        if (!initialEvents || initialEvents.length === 0) {
            fetchEventsFromAPI();
        }
    }, [dispatch, initialEvents]);

    const fetchEventsFromAPI = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/events');
            if (response.ok) {
                const apiEvents = await response.json();
                
                // Transform API events to match expected format
                const transformedEvents = apiEvents.map(event => {
                    if (event.nextDate) {
                        const eventDate = new Date(event.nextDate);
                        const now = new Date();
                        // Set sale start to 1 day ago (to allow immediate booking)
                        const saleStartDate = new Date(now.getTime() - (24 * 60 * 60 * 1000));
                        // Set sale end to 1 day after the event (to allow last-minute booking)
                        const saleEndDate = new Date(eventDate.getTime() + (24 * 60 * 60 * 1000));
                        
                        const transformedEvent = {
                            ...event,
                            dates: [{
                                id: event.id,
                                title: event.title,
                                date: event.nextDate,
                                ticketSaleStartDate: saleStartDate.toISOString(),
                                ticketSaleEndDate: saleEndDate.toISOString()
                            }]
                        };
                        
                        return transformedEvent;
                    }
                    
                    return {
                        ...event,
                        dates: []
                    };
                });
                
                setEvents(transformedEvents);
            } else {
                console.error('Failed to fetch events');
            }
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
        }
    };

    // Process events to separate upcoming and past
    const currentDate = new Date();
    
    const processedEvents = events.map(event => {
        // Get the earliest date for each event
        const earliestDate = event.dates && event.dates.length > 0 ? new Date(event.dates[0].date) : null;
        
        return {
            ...event,
            earliestDate,
            isUpcoming: earliestDate ? earliestDate > currentDate : false
        };
    });

    // Split into upcoming and past events
    const upcomingEvents = processedEvents
        .filter(event => event.isUpcoming)
        .sort((a, b) => a.earliestDate - b.earliestDate);

    const pastEvents = processedEvents
        .filter(event => !event.isUpcoming)
        .sort((a, b) => b.earliestDate - a.earliestDate);

    const getTicketAvailability = (event) => {
        if (!event.dates || event.dates.length === 0) return "Check availability";
        
        // For now, show a generic message - you can enhance this with actual ticket counting
        return "Tickets available";
    };

    const getTicketPrice = (event) => {
        if (!event.dates || event.dates.length === 0) return "Check pricing";
        
        // For now, show a generic message - you can enhance this with actual pricing
        return "Multiple ticket types available";
    };

    const formatEventDate = (dateString) => {
        if (!dateString) return "Date TBD";
        
        try {
            const date = new Date(dateString);
            return formatInTZ(date, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }, 'Europe/London', 'en-GB');
        } catch (error) {
            return "Date TBD";
        }
    };

    const EventCard = ({ event, isPast = false }) => {
        const earliestDate = event.dates?.[0];
        // Use URL from API if available, otherwise construct from slug
        const eventUrl = event.url ? new URL(event.url).pathname : `/events/${event.slug || event.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
        
        // Get price display
        const getPriceDisplay = () => {
            if (!event.categories || event.categories.length === 0) {
                return event.minPrice ? `£${event.minPrice}` : 'Price TBC';
            }
            
            if (event.categories.length === 1) {
                return `£${event.categories[0].price}`;
            }
            
            // Multiple ticket types - show range
            const prices = event.categories.map(c => c.price).sort((a, b) => a - b);
            const minPrice = prices[0];
            const maxPrice = prices[prices.length - 1];
            
            if (minPrice === maxPrice) {
                return `£${minPrice}`;
            }
            
            return `£${minPrice} - £${maxPrice}`;
        };
        
        return (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
                {/* Event Image with Price Badge */}
                <div className="relative aspect-[4/3] bg-gradient-to-br from-green-400 to-green-600">
                    {event.coverImage ? (
                        <Image 
                            src={event.coverImage} 
                            alt={event.title}
                            width={400}
                            height={300}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                            <svg className="w-16 h-16 text-white opacity-50" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                            </svg>
                        </div>
                    )}
                    
                    {/* Price Badge */}
                    <div className="absolute top-4 right-4">
                        <div className="bg-white rounded-full px-3 py-1 shadow-lg">
                            <span className="text-sm font-bold text-gray-900">{getPriceDisplay()}</span>
                        </div>
                    </div>
                </div>

                {/* Event Content */}
                <div className="p-4 flex-1 flex flex-col">
                    {/* Event Title */}
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 flex-shrink-0">
                        {event.title}
                    </h3>

                    {/* Event Date */}
                    <p className="text-sm text-gray-600 mb-4 flex-shrink-0">
                        {formatEventDate(earliestDate?.date)}
                    </p>

                    {/* Get Tickets Button - Push to bottom */}
                    <div className="mt-auto">
                        <Link
                            href={eventUrl}
                            className="block w-full"
                        >
                            <button 
                                className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-colors ${
                                    isPast
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}
                                disabled={isPast}
                            >
                                {isPast ? 'Event Passed' : 'Get Tickets'}
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading events...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            {/* Banner */}
            <div className="bg-green-100 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Events</h1>
                    <p className="text-xl text-gray-700">
                        Join us for exciting events, workshops, and gatherings celebrating Jewish veganism and sustainability.
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Upcoming Events */}
                <div className="mb-16">
                    <h2 className="text-2xl font-bold text-gray-900 mb-8">Upcoming Events</h2>
                    {upcomingEvents.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No upcoming events at the moment.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {upcomingEvents.map((event, index) => (
                                <EventCard key={event.id || index} event={event} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Past Events */}
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-8">Past Events</h2>
                    {pastEvents.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No past events to display.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {pastEvents.map((event, index) => (
                                <EventCard key={event.id || index} event={event} isPast={true} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Footer />
        </div>
    );
}

export async function getStaticProps({ locale }) {
    // Try to fetch events from database first
    let events = [];
    try {
        const prisma = (await import("../lib/prisma")).default;
        const rawEvents = await prisma.event.findMany({
            where: {
                isActive: true // Only active events - include all dates
            },
            select: {
                id: true,
                title: true,
                description: true,
                coverImage: true,
                seatType: true,
                slug: true,
                dates: {
                    select: {
                        id: true,
                        date: true,
                        title: true,
                        ticketSaleStartDate: true,
                        ticketSaleEndDate: true
                    },
                    orderBy: {
                        date: 'asc'
                    }
                },
                venue: {
                    select: {
                        name: true,
                        address: true,
                        city: true,
                        postcode: true
                    }
                },
                // Include pricing information
                ticketTypes: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        capacity: true,
                        sold: true
                    }
                },
                categories: {
                    select: {
                        category: {
                            select: {
                                id: true,
                                label: true,
                                price: true,
                                color: true
                            }
                        },
                        maxAmount: true
                    }
                }
            }
        });
        
        events = rawEvents.map(event => {
            // Ensure dates array exists and has valid structure
            const validDates = event.dates
                .filter(date => date && date.date) // Filter out invalid dates
                .map(date => ({
                    ...date,
                    date: date.date?.toISOString() ?? null,
                    ticketSaleStartDate: date.ticketSaleStartDate?.toISOString() ?? null,
                    ticketSaleEndDate: date.ticketSaleEndDate?.toISOString() ?? null
                }));
            
            // Process pricing information - prioritize ticketTypes over categories
            let categories = [];
            
            if (event.ticketTypes && event.ticketTypes.length > 0) {
                // Use modern ticket types system
                categories = event.ticketTypes.map(tt => ({
                    id: tt.id,
                    name: tt.name,
                    price: tt.price / 100, // Convert from pence to pounds
                    color: '#4F46E5' // Default color for ticket types
                }));
            } else if (event.categories && event.categories.length > 0) {
                // Fall back to legacy categories system
                categories = event.categories.map(cat => ({
                    id: cat.category.id,
                    name: cat.category.label,
                    price: cat.category.price,
                    color: cat.category.color || '#4F46E5'
                }));
            }
            
            return {
                ...event,
                dates: validDates.length > 0 ? validDates : [], // Ensure dates is always an array
                categories: categories // Add processed categories for pricing display
            };
        });
    } catch (error) {
        console.error('Failed to fetch events from database:', error);
        // If database fails, events will be empty and we'll fetch from API
    }

    return {
        props: {
            events,
            title: await getOption(Options.ShopTitle),
            subtitle: await getOption(Options.ShopSubtitle),
            theme: await getOption(Options.Theme),
            ...(await loadNamespaces({ locale, pathname: '/' })),
            impressUrl: await getOption(Options.ImpressUrl)
        },
        // Revalidate every 2 minutes (120 seconds) for fresh event data
        revalidate: 120
    };
}
