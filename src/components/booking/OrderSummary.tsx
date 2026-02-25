import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../store/hooks';
import { selectOrder } from '../../store/reducers/orderReducer';
import { selectPersonalInformation } from '../../store/reducers/personalInformationReducer';
import { selectPayment } from '../../store/reducers/paymentReducer';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui';
import { formatInTZ } from '../../utils/datetime';

interface OrderSummaryProps {
  isActive: boolean;
  onComplete: () => void;
  event: any; // Pass event data from parent component
  discountInfo?: any; // Pass discount information from parent component
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  isActive,
  onComplete,
  event,
  discountInfo
}) => {
  const order = useAppSelector(selectOrder);
  const personalInfo = useAppSelector(selectPersonalInformation);
  const payment = useAppSelector(selectPayment);

  const [showSuccess, setShowSuccess] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    // Check if all prerequisites are met
    const hasTickets = order.tickets.length > 0;
    const hasPersonalInfo = personalInfo.email && personalInfo.address?.firstName && personalInfo.address?.lastName;
    const hasPaymentMethod = !!payment.payment?.type;
    
    // If all prerequisites are met, trigger animation sequence
    if (hasTickets && hasPersonalInfo && hasPaymentMethod) {
      setShowAnimation(true);
      setTimeout(() => setShowSuccess(true), 500);
    }
  }, [order.tickets, personalInfo, payment]);

  if (!isActive) return null;

  const getTotalPrice = () => {
    const baseTotal = order.tickets.reduce((total, ticket) => {
      const price = (ticket as any).price || 0;
      const quantity = ticket.amount || 0;
      return total + (price * quantity);
    }, 0);
    
    // Apply discount if available
    if (discountInfo && discountInfo.discountAmount && discountInfo.discountAmount > 0) {
      return Math.max(0, baseTotal - discountInfo.discountAmount);
    }
    
    return baseTotal;
  };

  const getOriginalTotal = () => {
    return order.tickets.reduce((total, ticket) => {
      const price = (ticket as any).price || 0;
      const quantity = ticket.amount || 0;
      return total + (price * quantity);
    }, 0);
  };


  const handleAddToCalendar = () => {
    // Debug logging
    // Debug logging removed for production
    
    // Check if we have the required event data
    if (!event) {
      console.error('No event data available');
      alert('Event information not available. Please try refreshing the page.');
      return;
    }
    
    // Try to get the event date from different possible properties
    let eventDate: Date | null = null;
    if (event.date) {
      eventDate = new Date(event.date);
    } else if (event.eventDate?.date) {
      eventDate = new Date(event.eventDate.date);
    } else if (event.startDate) {
      eventDate = new Date(event.startDate);
    }
    
    if (!eventDate || isNaN(eventDate.getTime())) {
      console.error('Invalid event date:', event.date, event.eventDate?.date, event.startDate);
      alert('Event date not available. Please try refreshing the page.');
      return;
    }
    
    // Get event name from different possible properties
    const eventName = event.name || event.title || event.eventName || 'JVS Event';
    
    // Get venue from different possible properties
    const venue = event.venue || event.location || event.address || 'TBA';
    
    const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration
    
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventName)}&dates=${eventDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}/${endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}&details=${encodeURIComponent(`Event: ${eventName}\nVenue: ${venue}\nTickets: ${order.tickets.length}`)}&location=${encodeURIComponent(venue)}`;
    
    // Debug logging removed for production
    window.open(calendarUrl, '_blank');
  };

  const handleShareEvent = () => {
    if (typeof window === 'undefined') return <span />;
    
    if (navigator.share) {
      navigator.share({
        title: event?.name || 'JVS Event',
        text: `Join me at ${event?.name || 'this JVS event'} on ${event?.date ? formatInTZ(new Date(event.date), {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }, 'Europe/London', 'en-GB') : 'TBA'}!`,
        url: window.location.href
      });
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Event link copied to clipboard!');
    }
  };

  const handleDownloadTicket = async () => {
    try {
      // Debug logging
          // Debug logging removed for production
      
      // Get the order ID from the order state
      if (!order.orderId) {
        console.error('Order ID not found in Redux state');
        
        // Try to get order ID from URL or localStorage as fallback
        if (typeof window === 'undefined') return <span />;
        const urlParams = new URLSearchParams(window.location.search);
        const urlOrderId = urlParams.get('orderId');
        
        if (urlOrderId) {
          // Debug logging removed for production
          // Use the URL order ID
          await downloadTicketWithId(urlOrderId);
          return;
        }
        
        // Check if we can get it from the Stripe success flow
        const stripeOrderId = sessionStorage.getItem('stripe_order_id');
        if (stripeOrderId) {
          // Debug logging removed for production
          await downloadTicketWithId(stripeOrderId);
          return;
        }
        
        alert('Order ID not found. Please try refreshing the page or contact support.');
        return;
      }

      await downloadTicketWithId(order.orderId);
      
    } catch (error) {
      console.error('Error downloading ticket:', error);
      alert(`Failed to download ticket: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const downloadTicketWithId = async (orderId: string) => {
            // Debug logging removed for production
    
    const response = await fetch('/api/ticket/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: orderId
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to download ticket');
    }

    const data = await response.json();
    
    // Create a download link for the PDF
    if (typeof document === 'undefined') return;
    const link = document.createElement('a');
    link.href = data.ticketUrl;
    link.download = `ticket-${orderId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('Ticket download completed successfully');
  };

  return (
    <div className="space-y-8">
      {/* Debug Information - Remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <h4 className="font-semibold text-yellow-900 mb-2">Debug Info</h4>
            <div className="text-xs text-yellow-800 space-y-1">
              <p>Event object: {JSON.stringify(event, null, 2)}</p>
              <p>Order state: {JSON.stringify(order, null, 2)}</p>
              <p>Personal info: {JSON.stringify(personalInfo, null, 2)}</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Success Animation */}
      {showAnimation && (
        <Card className="border-success-200 bg-success-50">
          <CardContent className="p-8 text-center">
            <div className={`transition-all duration-1000 ease-out ${
              showSuccess ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
            }`}>
              <div className="w-24 h-24 bg-success-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <h2 className="text-3xl font-bold text-success-700 mb-3">
              Success! Your tickets are confirmed.
            </h2>
            <p className="text-xl text-success-600">
              🎉 You&apos;re all set for an amazing event!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Order Summary */}
      <Card className="bg-neutral-50 border-neutral-200">
        <CardHeader>
          <CardTitle className="text-xl">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Event Details */}
          <Card className="border-neutral-200">
            <CardContent className="p-4">
              <h4 className="font-semibold text-neutral-900 mb-3">Event Details</h4>
              <div className="text-sm text-neutral-600 space-y-2">
                <p className="font-medium text-neutral-800">Event: {event?.name || event?.title || 'Event not selected'}</p>
                <p>Date: {event?.date ? formatInTZ(new Date(event.date), {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }, 'Europe/London', 'en-GB') : 'Date not available'}</p>
                {event?.venue && <p>Venue: {event.venue}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Ticket Summary */}
          <Card className="border-neutral-200">
            <CardContent className="p-4">
              <h4 className="font-semibold text-neutral-900 mb-3">Tickets</h4>
              <div className="space-y-2">
                {order.tickets.map((ticket, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-neutral-600">
                      Ticket {index + 1} - {(ticket as any).categoryName || 'General'}
                    </span>
                    <span className="text-neutral-900 font-medium">£{((ticket as any).price || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t-2 border-neutral-200 pt-3 mt-3">
                <div className="flex justify-between font-semibold text-base">
                  <span>Subtotal</span>
                  <span>£{getTotalPrice().toFixed(2)}</span>
                </div>
                {discountInfo && discountInfo.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-neutral-600 mt-1">
                    <span>Discount</span>
                    <span>-£{discountInfo.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>£{getTotalPrice().toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information Summary */}
          <Card className="border-neutral-200">
            <CardContent className="p-4">
              <h4 className="font-semibold text-neutral-900 mb-3">Personal Information</h4>
              <div className="text-sm text-neutral-600 space-y-2">
                <p>Name: {personalInfo.address?.firstName} {personalInfo.address?.lastName}</p>
                <p>Email: {personalInfo.email}</p>
                <p>Address: {personalInfo.address?.address}, {personalInfo.address?.city}, {personalInfo.address?.zip}</p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Summary */}
          <Card className="border-neutral-200">
            <CardContent className="p-4">
              <h4 className="font-semibold text-neutral-900 mb-3">Payment Method</h4>
              <div className="text-sm text-neutral-600">
                <p>Method: {payment.payment?.type || 'Not selected'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Total */}
          <Card className="border-primary-200 bg-primary-50">
            <CardContent className="p-4">
              {discountInfo && discountInfo.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-neutral-600 mb-2">
                  <span>Original Total</span>
                  <span>£{getOriginalTotal().toFixed(2)}</span>
                </div>
              )}
              {discountInfo && discountInfo.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600 mb-2">
                  <span>Discount ({discountInfo.code})</span>
                  <span>-£{discountInfo.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold text-primary-900">
                <span>Total Amount</span>
                <span>£{getTotalPrice().toFixed(2)}</span>
              </div>
              {discountInfo && discountInfo.discountAmount > 0 && (
                <div className="text-sm text-green-600 text-right mt-1">
                  You save £{discountInfo.discountAmount.toFixed(2)}!
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card className="border-primary-200 bg-gradient-to-r from-primary-50 to-accent-sky bg-opacity-10">
        <CardHeader>
          <CardTitle className="text-xl text-primary-900">What&apos;s Next?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="secondary"
              onClick={handleAddToCalendar}
              className="flex items-center justify-center space-x-3 h-auto p-4"
            >
              <svg className="w-6 h-6 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Add to Calendar</span>
            </Button>
            
            <Button
              variant="secondary"
              onClick={handleDownloadTicket}
              className="flex items-center justify-center space-x-3 h-auto p-4"
            >
              <svg className="w-6 h-6 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Download Ticket</span>
            </Button>
            
            <Button
              variant="secondary"
              onClick={handleShareEvent}
              className="flex items-center justify-center space-x-3 h-auto p-4"
            >
              <svg className="w-6 h-6 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
              </svg>
              <span className="font-medium">Share with Friends</span>
            </Button>
            
            <Link href="/">
              <Button
                variant="secondary"
                className="flex items-center justify-center space-x-3 h-auto p-4 w-full"
              >
                <svg className="w-6 h-6 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Return to JVS Homepage</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>


    </div>
  );
};
