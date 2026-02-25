import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { UnifiedBookingPage } from '../../components/booking/UnifiedBookingPage';
import prisma from '../../lib/prisma';
import { getOption } from '../../lib/options';
import { Options } from '../../constants/Constants';
import loadNamespaces from 'next-translate/loadNamespaces';
import { eventDateIsBookable } from '../../constants/util';

export default function BookingPage({
  event,
  ticketTypes,
  paymentMethods,
  deliveryMethods,
  shippingFees,
  paymentFees,
  theme,
  impressUrl
}) {
  const router = useRouter();

  // Generate Open Graph meta tags for social sharing
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tickets.jvs.org.uk';
  const pageUrl = event?.id ? `${siteUrl}/booking/${event.id}` : siteUrl;
  const ogTitle = event?.title ? `Book Tickets - ${event.title}` : 'Book Tickets | JVS';
  const ogDescription = event?.description || `Book your tickets for ${event?.title || 'this event'} - a Jewish Vegan Society event`;
  const ogImage = event?.coverImage || `${siteUrl}/jvs_logo.png`;

  // Removed auto-redirect to allow full booking workflow

  return (
    <>
      <Head>
        <title>{ogTitle}</title>
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
      <UnifiedBookingPage
        event={event}
        ticketTypes={ticketTypes}
        paymentMethods={paymentMethods}
        deliveryMethods={deliveryMethods}
        shippingFees={shippingFees}
        paymentFees={paymentFees}
        theme={theme}
        impressUrl={impressUrl}
      />
    </>
  );
}

export async function getStaticPaths() {
  try {
    const eventDates = await prisma.eventDate.findMany({
      select: {
        id: true
      }
    });
    
    const paths = eventDates.map((eventDate) => ({
      params: { eventDateId: eventDate.id.toString() }
    }));
    
    return { paths, fallback: 'blocking' };
  } catch (error) {
    console.error('Error generating static paths:', error);
    return { paths: [], fallback: 'blocking' };
  }
}

export async function getStaticProps({ params, locale }) {
  try {
    if (params.eventDateId === '[eventDateId]') return { props: { fallback: true } };

    const eventDateId = params.eventDateId;
    
    console.log('🔍 getStaticProps: Processing eventDateId:', eventDateId);

    // Query the specific event date with its event
    console.log('🔍 getStaticProps: Querying database for eventDateId:', eventDateId);
    const eventDate = await prisma.eventDate.findUnique({
      where: { id: parseInt(eventDateId) },
      include: {
        event: {
          include: {
            venue: true,
            ticketTypes: {
              where: { isActive: true, isPublic: true },
              orderBy: { publicSortOrder: 'asc' }
            },
            customFields: true
          }
        }
      }
    });
    
    console.log('🔍 getStaticProps: Database query result:', eventDate ? 'Found' : 'Not found');

    if (!eventDate || !eventDate.event) {
      console.log('🔍 getStaticProps: Event date or event not found, returning notFound');
      return {
        notFound: true
      };
    }

    // Check if event has any active, public ticket types
    if (!eventDate.event.ticketTypes || eventDate.event.ticketTypes.length === 0) {
      console.log('🔍 getStaticProps: Event has no active/public ticket types, eventDateId:', eventDateId, 'eventId:', eventDate.event.id);
      return {
        notFound: true
      };
    }

    const event = eventDate.event;
    const deliveryMethods = await getOption(Options.Delivery);
    const paymentMethods = await getOption(Options.PaymentProviders);
    const shippingFees = await getOption(Options.PaymentFeesShipping);
    const paymentFees = await getOption(Options.PaymentFeesPayment);
    const theme = await getOption(Options.Theme);
    const impressUrl = await getOption(Options.ImpressUrl);

    // Transform ticket types for display
    const transformedTicketTypes = event.ticketTypes.map(tt => ({
      id: tt.id,
      name: tt.name,
      price: tt.price / 100, // Convert from pence to pounds
      maxAmount: tt.capacity,
      color: tt.colorHex || '#4F46E5'
    }));

    return {
      props: {
        event: {
          id: eventDate.id,
          name: event.title,
          date: eventDate.date ? eventDate.date.toISOString() : new Date().toISOString(), // Fallback to current date if no date
          coverImage: event.coverImage,
          venue: event.venue ? {
            name: event.venue.name,
            address: event.venue.address,
            city: event.venue.city,
            postcode: event.venue.postcode
          } : null,
          title: event.title,
          description: event.description,
          personalTicket: event.personalTicket || false,
          customFields: event.customFields || [],
          ticketTypes: transformedTicketTypes
        },
        ticketTypes: transformedTicketTypes,
        deliveryMethods,
        paymentMethods,
        shippingFees,
        paymentFees,
        theme,
        impressUrl,
        ...(await loadNamespaces({ locale, pathname: '/booking/[eventDateId]' }))
      },
      revalidate: 60 // Revalidate every minute
    };
  } catch (error) {
    console.error('booking page getStaticProps error', error);
    return {
      redirect: {
        destination: '/',
        permanent: false
      }
    };
  }
}
