import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { CheckCircleIcon, TicketIcon, CalendarIcon, LocationMarkerIcon } from '@heroicons/react/solid';
import Navbar from '../components/booking/Navbar';
import Footer from '../components/booking/Footer';

interface OrderData {
  id: string;
  eventTitle: string;
  eventDate: string;
  venue: string;
  ticketCount: number;
  totalAmount: number;
  customerEmail: string;
  isFree: boolean;
}

export default function ConfirmationPage() {
  const router = useRouter();
  const { orderId, free } = router.query;
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isFreeEvent = free === 'true';

  useEffect(() => {
    if (!orderId) return;

    const fetchOrderData = async () => {
      try {
        // Fetch actual order data from API
        const response = await fetch(`/api/order/confirmation/${orderId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch order details');
        }

        const data = await response.json();
        setOrderData(data);
      } catch (err) {
        console.error('Error fetching order data:', err);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading confirmation details...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Order Not Found</h1>
            <p className="text-gray-600 mb-4">{error || 'We could not find your order details.'}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Return to Homepage
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/London'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Success Header */}
        <div className="text-center mb-8">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isFreeEvent ? 'Registration Confirmed!' : 'Order Confirmed!'}
          </h1>
          <p className="text-lg text-gray-600">
            {isFreeEvent 
              ? 'Your free event registration has been confirmed'
              : 'Your ticket purchase has been processed successfully'
            }
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden mb-6">
          <div className="bg-blue-600 text-white p-6">
            <h2 className="text-xl font-semibold mb-2">{orderData.eventTitle}</h2>
            <div className="flex items-center space-x-4 text-blue-100">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-5 w-5" />
                <span>{formatDate(orderData.eventDate)}</span>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex items-start space-x-3">
              <LocationMarkerIcon className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Venue</p>
                <p className="text-gray-600">{orderData.venue}</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <TicketIcon className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Tickets</p>
                <p className="text-gray-600">
                  {orderData.ticketCount} ticket{orderData.ticketCount !== 1 ? 's' : ''}
                  {isFreeEvent ? ' (Free)' : ` - £${(orderData.totalAmount / 100).toFixed(2)}`}
                </p>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600">
                <strong>Order ID:</strong> {orderData.id}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                A confirmation email has been sent to your email address with your ticket details.
              </p>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">What&apos;s Next?</h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start space-x-2">
              <CheckCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Check your email for ticket details and event information</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Save the event date and arrive on time</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Bring your ticket (digital or printed) to the event</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="text-center mt-8 space-y-4">
          <button
            onClick={() => router.push('/events')}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-semibold"
          >
            View More Events
          </button>
          
          <div>
            <button
              onClick={() => router.push('/')}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Return to Homepage
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
