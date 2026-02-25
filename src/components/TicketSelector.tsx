'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { parseTicketTypes, getEventPrice } from '../lib/utils';
import type { EventProduct, TicketType } from '../lib/types';

interface TicketSelectorProps {
  product: EventProduct;
  eventDate: string;
  eventVenue?: string;
}

interface TicketSelection {
  ticketType: TicketType;
  quantity: number;
}

export default function TicketSelector({ 
  product, 
  eventDate, 
  eventVenue
}: TicketSelectorProps) {
  const router = useRouter();
  
  // Parse ticket types from the event
  const ticketTypes = parseTicketTypes(product);
  const hasMultipleTicketTypes = ticketTypes.length > 1;

  // Initialize ticket selections properly
  const [ticketSelections, setTicketSelections] = useState<TicketSelection[]>(() => 
    ticketTypes.map(ticketType => ({
      ticketType,
      quantity: 0
    }))
  );
  const [isLoading, setIsLoading] = useState(false);

  const updateTicketQuantity = (ticketType: TicketType, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    setTicketSelections(prev => 
      prev.map(selection => 
        selection.ticketType.label === ticketType.label 
          ? { ...selection, quantity: newQuantity }
          : selection
      )
    );
  };

  const getTotalPrice = () => {
    return ticketSelections.reduce((total, selection) => {
      const price = parseFloat(selection.ticketType.price);
      return total + (price * selection.quantity);
    }, 0);
  };

  const getTotalTickets = () => {
    return ticketSelections.reduce((total, selection) => total + selection.quantity, 0);
  };

  const handlePurchase = () => {
    const totalTickets = getTotalTickets();
    if (totalTickets === 0) return;
    
    setIsLoading(true);
    
    // Redirect to checkout with the event details
    const checkoutUrl = `/checkout?eventId=${product.id}&quantity=${totalTickets}`;
    router.push(checkoutUrl);
    
    setIsLoading(false);
  };

  const isAvailable = product.available !== false;

  if (!isAvailable) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <div className="w-16 h-16 mx-auto mb-4 text-neutral-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">
            Tickets Not Available
          </h3>
          <p className="text-neutral-600 mb-4">
            Ticket sales for this event are not yet available or have ended.
          </p>
          <Button variant="secondary" onClick={() => router.back()}>
            ← Back to Event Details
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl text-neutral-900 mb-2">
          {product.name}
        </CardTitle>
        <div className="text-neutral-600 space-y-1">
          <p className="font-medium">{eventDate}</p>
          {eventVenue && <p className="text-sm">{eventVenue}</p>}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Ticket Selection */}
        <div className="space-y-4">
          <h4 className="font-semibold text-lg text-neutral-900">
            Select Tickets
          </h4>
          
          {hasMultipleTicketTypes ? (
            // Multiple ticket types with improved layout
            <div className="space-y-4">
              {ticketSelections.map((selection) => (
                <div key={selection.ticketType.label} className="border border-neutral-200 rounded-xl p-4 bg-neutral-50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h5 className="font-semibold text-neutral-900 mb-1">
                        {selection.ticketType.label}
                      </h5>
                      <p className="text-sm text-neutral-600">
                        {eventVenue ? `Event at ${eventVenue}` : 'Event ticket'}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-xl font-bold text-primary-600">
                        £{selection.ticketType.price}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => updateTicketQuantity(selection.ticketType, selection.quantity - 1)}
                        disabled={selection.quantity <= 0}
                        className="w-10 h-10 p-0 rounded-full"
                      >
                        -
                      </Button>
                      <span className="w-12 text-center font-semibold text-neutral-900 text-lg">
                        {selection.quantity}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => updateTicketQuantity(selection.ticketType, selection.quantity + 1)}
                        className="w-10 h-10 p-0 rounded-full"
                      >
                        +
                      </Button>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-neutral-600">Subtotal</div>
                      <div className="font-semibold text-neutral-900">
                        £{(parseFloat(selection.ticketType.price) * selection.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Single ticket type with simplified layout
            <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg text-neutral-900">{product.name}</h4>
                  <p className="text-sm text-neutral-600 mt-1">
                    {eventVenue ? `Event at ${eventVenue}` : 'Event ticket'}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <div className="text-2xl font-bold text-primary-600">
                    {getEventPrice(product)}
                  </div>
                  {product.stockQuantity !== undefined && (
                    <div className="text-sm text-neutral-600">
                      {product.stockQuantity} available
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => updateTicketQuantity(ticketTypes[0], Math.max(0, (ticketSelections[0]?.quantity || 0) - 1))}
                    disabled={(ticketSelections[0]?.quantity || 0) <= 0}
                    className="w-10 h-10 p-0 rounded-full"
                  >
                    -
                  </Button>
                  <span className="w-12 text-center font-semibold text-neutral-900 text-lg">
                    {ticketSelections[0]?.quantity || 0}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => updateTicketQuantity(ticketTypes[0], (ticketSelections[0]?.quantity || 0) + 1)}
                    disabled={product.stockQuantity !== undefined && (ticketSelections[0]?.quantity || 0) >= product.stockQuantity}
                    className="w-10 h-10 p-0 rounded-full"
                  >
                    +
                  </Button>
                </div>
                <div className="text-right">
                  <div className="text-sm text-neutral-600">Subtotal</div>
                  <div className="font-semibold text-neutral-900">
                    £{getTotalPrice().toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Purchase Summary */}
        <div className="border-t border-neutral-200 pt-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="text-sm text-neutral-600">Total Tickets</div>
              <div className="text-xl font-semibold text-neutral-900">{getTotalTickets()}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-neutral-600">Total Price</div>
              <div className="text-2xl font-bold text-primary-600">
                £{getTotalPrice().toFixed(2)}
              </div>
            </div>
          </div>
          
          <Button
            onClick={handlePurchase}
            disabled={isLoading || getTotalTickets() === 0}
            size="md"
            className="w-full"
          >
            {isLoading ? 'Processing...' : 'Purchase Tickets'}
          </Button>
          
          <p className="text-sm text-neutral-600 text-center mt-3">
            Secure checkout powered by our payment processor
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 