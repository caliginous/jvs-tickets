'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { parseTicketTypes } from '../lib/utils';
import type { EventProduct } from '../lib/types';
import { formatPrice } from '../constants/util';

interface EventCardProps {
  event: EventProduct;
}

export default function EventCard({ event }: EventCardProps) {
  const ticketTypes = parseTicketTypes(event);
  
  // Get price display text
  const getPriceDisplay = () => {
    if (ticketTypes.length === 0) {
      return event.eventPrice ? formatPrice(parseFloat(event.eventPrice)) : 'Price TBC';
    }
    
    if (ticketTypes.length === 1) {
      return formatPrice(parseFloat(ticketTypes[0].price));
    }
    
    // Multiple ticket types - show range
    const prices = ticketTypes.map(t => parseFloat(t.price)).sort((a, b) => a - b);
    const minPrice = prices[0];
    const maxPrice = prices[prices.length - 1];
    
    if (minPrice === maxPrice) {
      return formatPrice(minPrice);
    }
    
    return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
  };

  const isSoldOut = event.stockQuantity === 0;
  const isAvailable = event.available !== false;

  // Format date for display (using London timezone for consistency)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    
    // Use London timezone instead of UTC for consistency with main website
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/London'
    }).format(date);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
      {/* Event Image with Price Badge */}
      <div className="relative aspect-[4/3] bg-gradient-to-br from-green-400 to-green-600">
        {event.featuredImageUrl ? (
          <Image 
            src={event.featuredImageUrl} 
            alt={event.name}
            layout="fill"
            objectFit="cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
          {event.name}
        </h3>

        {/* Event Date */}
        <p className="text-sm text-gray-600 mb-4 flex-shrink-0">
          {formatDate(event.eventDate)}
        </p>

        {/* Get Tickets Button - Push to bottom */}
        <div className="mt-auto">
          <Link
            href={`/events/${event.id}`}
            className="block w-full"
          >
            <button 
              className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-colors ${
                isSoldOut || !isAvailable
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
              disabled={isSoldOut || !isAvailable}
            >
              {isSoldOut ? 'Sold Out' : 'Get Tickets'}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
} 