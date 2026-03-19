import React, { useState } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import prisma from '../../lib/prisma';
import TicketPicker from '../../components/TicketPicker';
import { formatInTZ } from '../../utils/datetime';
import Navbar from '../../components/booking/Navbar';
import Footer from '../../components/booking/Footer';
import { UnifiedBookingPage } from '../../components/booking/UnifiedBookingPage';
import { getOption } from '../../lib/options';
import { Options } from '../../constants/Constants';
import { computeAvailability } from '../../lib/services/ticketing/availability';

function WaitlistJoinForm({ eventDateId, ticketTypes }: { eventDateId: number; ticketTypes: any[] }) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedTicketType, setSelectedTicketType] = useState(ticketTypes[0]?.id || 0);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const resp = await fetch('/api/waitlist/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventDateId,
          eventTicketTypeId: selectedTicketType,
          email: email.trim(),
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          phone: phone.trim() || undefined,
          quantity,
        }),
      });

      const data = await resp.json();
      if (resp.ok) {
        setResult({ success: true, message: data.message || 'You have been added to the waitlist!' });
      } else {
        setResult({ error: data.error || 'Something went wrong. Please try again.' });
      }
    } catch {
      setResult({ error: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (result?.success) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-8 text-center mt-6">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-green-800 mb-1">You&apos;re on the waitlist!</h3>
        <p className="text-green-700 text-sm">{result.message}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-blue-200 rounded-xl p-6 mt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Join the Waitlist</h3>
      <p className="text-sm text-gray-600 mb-4">
        We&apos;ll email you if tickets become available. You&apos;ll have 30 minutes to complete your booking.
      </p>

      {result?.error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-sm text-red-700">{result.error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input type="text" placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" />
          <input type="text" placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <input type="email" placeholder="Email *" required value={email} onChange={e => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" />
        <input type="tel" placeholder="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" />

        {ticketTypes.length > 1 && (
          <select value={selectedTicketType} onChange={e => setSelectedTicketType(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500">
            {ticketTypes.map(tt => (
              <option key={tt.id} value={tt.id}>{tt.name}</option>
            ))}
          </select>
        )}

        <div className="flex items-center space-x-3">
          <label className="text-sm text-gray-700">Quantity:</label>
          <select value={quantity} onChange={e => setQuantity(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500">
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={submitting || !email.trim()}
          className="w-full py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm">
          {submitting ? 'Joining...' : 'Join Waitlist'}
        </button>
      </form>
    </div>
  );
}

interface Event {
  id: number;
  title: string;
  description?: string;
  slug?: string;
  coverImage?: string;
  venue?: {
    name?: string;
    address?: string;
    city?: string;
    postcode?: string;
  };
  dates: EventDate[];
  ticketTypes: any[];
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
  hasEnded: boolean;
  claimSessionToken?: string | null;
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
  isSoldOut,
  hasEnded,
  claimSessionToken
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

  // Show event ended message if no upcoming dates
  if (hasEnded) {
    return (
      <>
        <Head>
          <title>{ogTitle} | JVS Tickets</title>
          <meta name="description" content={ogDescription} />
          <meta property="og:title" content={ogTitle} />
          <meta property="og:description" content={ogDescription} />
          <meta property="og:url" content={pageUrl} />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Jewish Vegan Society" />
          <meta property="og:image" content={ogImage} />
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
                {event.venue && (
                  <p className="text-gray-600">
                    {event.venue.name}{event.venue.address && `, ${event.venue.address}`}
                  </p>
                )}
              </div>
            </div>

            {/* Event Ended Banner */}
            <div className="bg-gray-100 border-2 border-gray-300 rounded-xl p-8 text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-700 mb-2">This Event Has Ended</h2>
              <p className="text-gray-600 mb-6">
                This event has already taken place. Check out our other upcoming events!
              </p>
              <Link href="/">
                <a className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Browse Upcoming Events
                </a>
              </Link>
            </div>
          </div>

          <Footer />
        </div>
      </>
    );
  }

  // If sold out BUT user has a valid waitlist claim session, show the booking flow instead
  if (isSoldOut && claimSessionToken) {
    return (
      <>
        <Head>
          <title>{ogTitle} | JVS Tickets</title>
          <meta name="description" content={ogDescription} />
          <meta property="og:title" content={ogTitle} />
          <meta property="og:description" content={ogDescription} />
          <meta property="og:url" content={pageUrl} />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Jewish Vegan Society" />
          <meta property="og:image" content={ogImage} />
        </Head>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-center">
              <p className="text-blue-800 font-medium">
                You have a reserved waitlist offer. Complete your booking below before the offer expires.
              </p>
            </div>
            <UnifiedBookingPage
              event={event}
              ticketTypes={event.ticketTypes}
              paymentMethods={paymentMethods}
              deliveryMethods={deliveryMethods}
              shippingFees={shippingFees}
              paymentFees={paymentFees}
              theme={theme}
              impressUrl={impressUrl}
              claimSessionToken={claimSessionToken}
            />
          </div>
          <Footer />
        </div>
      </>
    );
  }

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
              Sorry, all tickets for this event have been sold. Join the waitlist below and we&apos;ll notify you if tickets become available.
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

          {/* Waitlist Join Form */}
          {eventDate && event.ticketTypes && event.ticketTypes.length > 0 && (
            <WaitlistJoinForm
              eventDateId={eventDate.id}
              ticketTypes={event.ticketTypes}
            />
          )}
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
            ticketTypes={event.ticketTypes}
            paymentMethods={paymentMethods}
            deliveryMethods={deliveryMethods}
            shippingFees={shippingFees}
            paymentFees={paymentFees}
            theme={theme}
            impressUrl={impressUrl}
            claimSessionToken={claimSessionToken}
          />
        </div>

        <Footer />
      </div>
    </>
  );
}

// Switched from getStaticProps to getServerSideProps for reliable, real-time data
// This eliminates ISR cache issues and 404 problems
export const getServerSideProps: GetServerSideProps<EventPageProps> = async ({ params, query }) => {
  try {
    const slug = params?.slug as string;
    const claimSessionToken = (typeof query?.claimSession === 'string' ? query.claimSession : null) || null;
    
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
    
    // Check if event has ended (no upcoming dates)
    const hasEnded = !eventDate;

    // Use canonical availability service for capacity calculations
    let availability = null;
    let isSoldOut = false;
    
    if (eventDate) {
      availability = await computeAvailability(eventDate.id);
      isSoldOut = availability.totalAvailable !== null && availability.totalAvailable === 0;
    }

    // Transform event ticket types to the format expected by UnifiedBookingPage
    const transformedTicketTypes = availability?.ticketTypes.map(tt => ({
      id: tt.eventTicketTypeId,
      name: tt.name,
      price: tt.price / 100, // Convert from pence to pounds
      maxAmount: 10, // Default max per order
      color: '#4F46E5', // Default color for ticket types
      description: event.ticketTypes.find(t => t.id === tt.eventTicketTypeId)?.description,
      capacity: tt.capacity,
      sold: tt.sold,
      available: tt.available ?? 999999
    })) || [];
    
    // Event is sold out if no availability or all ticket types have no availability
    if (!isSoldOut) {
      isSoldOut = transformedTicketTypes.length > 0 && transformedTicketTypes.every(tt => tt.available === 0);
    }

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
          ticketTypes: transformedTicketTypes,
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
        ticketTypes: transformedTicketTypes,
        paymentMethods: await getOption(Options.PaymentProviders),
        deliveryMethods: await getOption(Options.Delivery),
        shippingFees: await getOption(Options.PaymentFeesShipping),
        paymentFees: await getOption(Options.PaymentFeesPayment),
        theme: await getOption(Options.Theme),
        impressUrl: await getOption(Options.ImpressUrl),
        isSoldOut,
        hasEnded,
        claimSessionToken
      }
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return { notFound: true };
  }
};
