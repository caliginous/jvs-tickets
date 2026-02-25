import React from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import prisma from '../../lib/prisma';
import TicketPicker from '../../components/TicketPicker';
import { formatInTZ } from '../../utils/datetime';
import Navbar from '../../components/booking/Navbar';
import Footer from '../../components/booking/Footer';
import { SeatSelectionFactory } from '../../components/seatselection/SeatSelectionFactory';
import { UnifiedBookingPage } from '../../components/booking/UnifiedBookingPage';
import { getOption } from '../../lib/options';
import { Options } from '../../constants/Constants';

interface Event {
  id: number;
  title: string;
  description?: string;
  slug?: string;
  coverImage?: string;
  seatType?: string;
  seatMapId?: number;
  seatMap?: any;
  venue?: {
    name?: string;
    address?: string;
    city?: string;
    postcode?: string;
  };
  dates: EventDate[];
  categories: any[];
  ticketTypes?: any[];
}

interface EventDate {
  id: number;
  title?: string;
  date?: string;
  totalTicketLimit?: number;
}

interface EventPageProps {
  event: Event;
  eventDate?: EventDate;
  paymentMethods: any[];
  deliveryMethods: any[];
  shippingFees: any;
  paymentFees: any;
  theme: any;
  impressUrl: string;
  isSoldOut: boolean;
}

export default function EventPage({
  event,
  eventDate,
  paymentMethods,
  deliveryMethods,
  shippingFees,
  paymentFees,
  theme,
  impressUrl,
  isSoldOut
}: EventPageProps) {
  // Generate Open Graph meta tags for social sharing
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tickets.jvs.org.uk';
  const pageUrl = event?.slug ? `${siteUrl}/events/${event.slug}` : siteUrl;
  const ogTitle = event?.title || 'JVS Event';
  const ogDescription = event?.description || `Join us for ${event?.title || 'this event'} - a Jewish Vegan Society event`;
  const ogImage = event?.coverImage || `${siteUrl}/jvs_logo.png`;

  if (!event) {
    return (
      <>
        <Head>
          <title>Event Not Found | JVS Tickets</title>
          <meta name="description" content="The requested event could not be found." />
        </Head>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h1>
              <p className="text-gray-600">The event you&apos;re looking for doesn&apos;t exist or has been removed.</p>
            </div>
          </div>
          <Footer />
        </div>
      </>
    );
  }

  const formatEventDate = (date: Date | string | undefined) => {
    if (!date) return 'Date TBD';
    return formatInTZ(new Date(date), {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }, 'Europe/London', 'en-GB');
  };

  const formatEventTime = (date: Date | string | undefined) => {
    if (!date) return 'Time TBD';
    return formatInTZ(new Date(date), {
      hour: '2-digit',
      minute: '2-digit'
    }, 'Europe/London', 'en-GB');
  };

  // Show sold out message if all tickets are unavailable
  if (isSoldOut) {
    return (
      <>
        <Head>
          <title>{ogTitle} | JVS Tickets</title>
          <meta name="description" content={ogDescription} />
          {/* Open Graph */}
          <meta property="og:title" content={ogTitle} />
          <meta property="og:description" content={ogDescription} />
          <meta property="og:url" content={pageUrl} />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Jewish Vegan Society" />
          <meta property="og:image" content={ogImage} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          {/* Twitter Card */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={ogTitle} />
          <meta name="twitter:description" content={ogDescription} />
          <meta name="twitter:image" content={ogImage} />
        </Head>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Event Header */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
            {event.coverImage && (
              <div className="aspect-video relative">
                <Image 
                  src={event.coverImage} 
                  alt={event.title}
                  layout="fill"
                  objectFit="cover"
                  priority
                />
              </div>
            )}
            <div className="p-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{event.title}</h1>
              {event.dates && event.dates[0]?.date && (
                <p className="text-lg text-gray-600 mb-2">
                  {formatInTZ(new Date(event.dates[0].date), {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }, 'Europe/London', 'en-GB')}
                </p>
              )}
              {event.venue && (
                <p className="text-gray-600">
                  {event.venue.name}{event.venue.address && `, ${event.venue.address}`}
                </p>
              )}
            </div>
          </div>

          {/* Sold Out Banner */}
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-800 mb-2">Sold Out</h2>
            <p className="text-red-700 mb-6">
              Sorry, all tickets for this event have been sold. Please check back later as more tickets may become available.
            </p>
            <a 
              href="/events"
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Browse Other Events
            </a>
          </div>
        </div>

        <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{ogTitle} | JVS Tickets</title>
        <meta name="description" content={ogDescription} />
        {/* Open Graph */}
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Jewish Vegan Society" />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={ogImage} />
      </Head>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        {/* Complete Booking Flow */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <UnifiedBookingPage
            event={event}
            categories={event.categories}
            paymentMethods={paymentMethods}
            deliveryMethods={deliveryMethods}
            shippingFees={shippingFees}
            paymentFees={paymentFees}
            theme={theme}
            impressUrl={impressUrl}
          />
        </div>

        <Footer />
      </div>
    </>
  );
}

// Switched from getStaticProps to getServerSideProps for reliable, real-time data
// This eliminates ISR cache issues and 404 problems
export const getServerSideProps: GetServerSideProps<EventPageProps> = async ({ params }) => {
  try {
    const slug = params?.slug as string;
    
    if (!slug) {
      return { notFound: true };
    }

    // Find event by slug or ID (for backward compatibility)
    let event;

    // First try to find by slug
    event = await prisma.event.findFirst({
      where: {
        slug: slug,
        isActive: true
      },
      include: {
        venue: true,
        seatMap: true,
        customFields: true,
        ticketTypes: {
          where: {
            isActive: true,
            isPublic: true
          },
          orderBy: {
            publicSortOrder: 'asc'
          }
        },
        dates: {
          where: {
            date: {
              gte: new Date()
            }
          },
          orderBy: {
            date: 'asc'
          }
        }
      }
    });

    // If not found by slug, try by ID (backward compatibility)
    if (!event && !isNaN(Number(slug))) {
      event = await prisma.event.findFirst({
        where: {
          id: parseInt(slug),
          isActive: true
        },
        include: {
          venue: true,
          seatMap: true,
          customFields: true,
          ticketTypes: {
            where: {
              isActive: true,
              isPublic: true
            },
            orderBy: {
              publicSortOrder: 'asc'
            }
          },
          dates: {
            where: {
              date: {
                gte: new Date()
              }
            },
            orderBy: {
              date: 'asc'
            }
          }
        }
      });
    }

    if (!event) {
      return { notFound: true };
    }

    // Get the next upcoming event date
    const eventDate = event.dates && event.dates.length > 0 ? event.dates[0] : null;

    // Check global ticket limit for this event date
    let globalLimitReached = false;
    let globalAvailable = Infinity;
    
    if (eventDate?.totalTicketLimit !== null && eventDate?.totalTicketLimit !== undefined) {
      // Count ALL tickets sold for this event date (across all ticket types)
      // Include PARTIALLY_REFUNDED as those tickets are still valid
      const totalSold = await prisma.ticket.count({
        where: {
          order: {
            eventDateId: eventDate.id,
            status: { in: ['CONFIRMED', 'PAID', 'COMPLETED', 'PARTIALLY_REFUNDED'] }
          }
        }
      });
      
      globalAvailable = Math.max(0, eventDate.totalTicketLimit - totalSold);
      globalLimitReached = globalAvailable === 0;
    }

    // Transform event ticket types to the format expected by UnifiedBookingPage
    const transformedCategories = event.ticketTypes.map(ticketType => {
      const capacity = ticketType.capacity;
      const sold = ticketType.sold || 0;
      
      // Individual ticket type availability
      let available = capacity === null ? 999999 : Math.max(0, capacity - sold);
      
      // Cap by global limit if set
      if (globalAvailable !== Infinity) {
        available = Math.min(available, globalAvailable);
      }
      
      return {
        id: ticketType.id,
        name: ticketType.name,
        price: ticketType.price / 100, // Convert from pence to pounds
        maxAmount: ticketType.maxTicketsPerOrder || 10, // Use ticket type limit or default
        color: '#4F46E5', // Default color for ticket types
        description: ticketType.description,
        capacity,
        sold,
        available
      };
    });
    
    // Check if event is sold out:
    // 1. Global limit reached, OR
    // 2. All individual ticket types have no availability
    const isSoldOut = globalLimitReached || 
      (transformedCategories.length > 0 && transformedCategories.every(cat => cat.available === 0));

    return {
      props: {
        event: {
          id: eventDate?.id || event.id, // Use eventDate.id if available, like booking page
          slug: event.slug || slug, // Include slug for Open Graph URL
          name: event.title,
          date: eventDate?.date ? eventDate.date.toISOString() : new Date().toISOString(),
          coverImage: event.coverImage,
          venue: event.venue ? {
            name: event.venue.name || null,
            address: event.venue.address || null,
            city: event.venue.city || null,
            postcode: event.venue.postcode || null
          } : null,
          title: event.title,
          description: event.description,
          personalTicket: event.personalTicket || false,
          customFields: event.customFields || [],
          categories: transformedCategories,
          dates: event.dates ? event.dates.map(date => ({
            id: date.id,
            title: date.title,
            date: date.date?.toISOString() || null,
            totalTicketLimit: date.totalTicketLimit,
            ticketSaleStartDate: date.ticketSaleStartDate?.toISOString() || null,
            ticketSaleEndDate: date.ticketSaleEndDate?.toISOString() || null
          })) : []
        },
        eventDate: eventDate ? {
          id: eventDate.id,
          title: eventDate.title,
          date: eventDate.date?.toISOString() || null,
          totalTicketLimit: eventDate.totalTicketLimit,
          ticketSaleStartDate: eventDate.ticketSaleStartDate?.toISOString() || null,
          ticketSaleEndDate: eventDate.ticketSaleEndDate?.toISOString() || null
        } : null,
        categories: transformedCategories,
        paymentMethods: await getOption(Options.PaymentProviders),
        deliveryMethods: await getOption(Options.Delivery),
        shippingFees: await getOption(Options.PaymentFeesShipping),
        paymentFees: await getOption(Options.PaymentFeesPayment),
        theme: await getOption(Options.Theme),
        impressUrl: await getOption(Options.ImpressUrl),
        isSoldOut
      }
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return { notFound: true };
  }
};
