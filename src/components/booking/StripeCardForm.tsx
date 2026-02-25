import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setOrderId } from '../../store/reducers/orderReducer';

interface StripeCardFormProps {
  onSuccess?: (orderId: string) => void;
  eventDateId: number;
  eventName: string;
  eventDate: string;
  discountInfo?: any; // Add discount info prop
}

export default function StripeCardForm({ onSuccess, eventDateId, eventName, eventDate, discountInfo }: StripeCardFormProps) {
  const dispatch = useAppDispatch();
  const order = useAppSelector((state) => state.order);
  const personalInfo = useAppSelector((state) => state.personalInformation);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStripeCheckout = async () => {
    if (!order.tickets || order.tickets.length === 0) {
      setError('No tickets selected');
      return;
    }

    if (!personalInfo.email) {
      setError('Email is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Calculate totals with discount applied
      // Note: ticket.price is in pounds (converted for display), need to convert back to pence
      const originalTotalInPence = order.tickets.reduce((sum, ticket) => sum + (Math.round(ticket.price * 100) * ticket.amount), 0);
      const finalTotalInPence = discountInfo && discountInfo.discountAmount > 0 
        ? Math.max(0, originalTotalInPence - Math.round(discountInfo.discountAmount * 100))
        : originalTotalInPence;
      
      console.log('💰 [StripeCardForm] Calculated totals:', {
        tickets: order.tickets.map(t => ({ price: t.price, amount: t.amount })),
        discountInfo: discountInfo ? { code: discountInfo.code, amount: discountInfo.discountAmount } : null,
        originalTotalInPence,
        finalTotalInPence
      });

      // Create Stripe checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tickets: order.tickets.map(ticket => ({
            ticketTypeId: ticket.ticketTypeId,
            amount: ticket.amount,
            price: Math.round(ticket.price * 100), // Convert pounds back to pence for Stripe
            name: (ticket as any).ticketTypeName || (ticket as any).name || `Ticket ${ticket.ticketTypeId}`,
          })),
          eventDateId: eventDateId,
          eventName: eventName,
          eventDate: eventDate,
          customerEmail: personalInfo.email,
          // Pass customer information to store in Stripe metadata
          customerData: {
            firstName: personalInfo.address.firstName,
            lastName: personalInfo.address.lastName,
            phone: personalInfo.phone || '',
            address: personalInfo.address.address,
            zip: personalInfo.address.zip,
            city: personalInfo.address.city,
            countryCode: personalInfo.address.country?.countryShortCode || 'GB',
            regionCode: personalInfo.address.region?.shortCode || '',
            customFields: personalInfo.customFields || {}
          },
          // Pass discount information
          discountInfo: discountInfo ? {
            code: discountInfo.code,
            discountAmount: discountInfo.discountAmount,
            discountType: discountInfo.discountType,
            discountValue: discountInfo.discountValue
          } : null,
          // Pass totals for proper calculation (in pence)
          finalTotal: finalTotalInPence,
          originalTotal: originalTotalInPence
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const responseData = await response.json();
      
      // Check if this is a free event (discount made it free)
      if (responseData.redirectToFreeRegistration) {
        console.log('📋 Discount made event free, processing as free registration...');
        
        // Call the free event registration API
        const freeResponse = await fetch('/api/free-event/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tickets: order.tickets.map(ticket => ({
              ticketTypeId: ticket.ticketTypeId,
              amount: ticket.amount,
              price: 0, // Free due to discount
              name: (ticket as any).ticketTypeName || (ticket as any).name || `Ticket ${ticket.ticketTypeId}`
            })),
            eventDateId: eventDateId,
            eventName: eventName,
            eventDate: eventDate,
            customerEmail: personalInfo.email,
            customerData: {
              firstName: personalInfo.address.firstName,
              lastName: personalInfo.address.lastName,
              phone: personalInfo.phone || '',
              address: personalInfo.address.address,
              zip: personalInfo.address.zip,
              city: personalInfo.address.city,
              countryCode: personalInfo.address.country?.countryShortCode || 'GB',
              regionCode: personalInfo.address.region?.shortCode || '',
              customFields: personalInfo.customFields || {}
            }
          }),
        });
        
        if (!freeResponse.ok) {
          const errorData = await freeResponse.json();
          throw new Error(errorData.error || 'Failed to register for free event');
        }
        
        const freeData = await freeResponse.json();
        
        // Redirect to success page
        window.location.href = `/checkout/success?orderId=${freeData.orderId}`;
        return;
      }

      const { url } = responseData;

      // Redirect to Stripe checkout
      window.location.href = url;

    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError(err instanceof Error ? err.message : 'Failed to create checkout session');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md">
        <div className="flex items-center">
          <div className="text-blue-600 mr-2">🔒</div>
          <div>
            <p className="font-medium">Secure Payment</p>
            <p className="text-sm">You&apos;ll be redirected to Stripe&apos;s secure checkout page</p>
          </div>
        </div>
      </div>

      <button
        onClick={handleStripeCheckout}
        disabled={isLoading || !order.tickets || order.tickets.length === 0}
        className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Processing...
          </div>
        ) : (
          'Proceed to Secure Checkout'
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Your payment will be processed securely by Stripe. We never store your card details.
      </p>
    </div>
  );
}
