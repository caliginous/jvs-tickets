import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectPayment, setPayment } from '../../store/reducers/paymentReducer';
import { selectOrder } from '../../store/reducers/orderReducer';
import { PaymentType } from '../../store/factories/payment/PaymentFactory';
import { ShippingType } from '../../store/factories/shipping/ShippingFactory';

import StripeCardForm from './StripeCardForm';

interface PaymentSectionProps {
  paymentMethods: any[];
  deliveryMethods: any[];
  shippingFees: any;
  paymentFees: any;
  isActive: boolean;
  onComplete: () => void;
  eventDateId: number;
  eventName?: string;
  eventDate?: string;
  onDiscountChange?: (discountInfo: any) => void;
  claimSessionToken?: string | null;
}

export const PaymentSection: React.FC<PaymentSectionProps> = ({
  paymentMethods,
  deliveryMethods,
  shippingFees,
  paymentFees,
  isActive,
  onComplete,
  eventDateId,
  eventName,
  eventDate,
  onDiscountChange,
  claimSessionToken
}) => {
  const dispatch = useAppDispatch();
  const payment = useAppSelector(selectPayment);
  const order = useAppSelector(selectOrder);

  // Always use Credit Card payment method
  const selectedPaymentMethod = PaymentType.CreditCard;
  const [selectedDeliveryMethod] = useState(ShippingType.Download);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [discountInfo, setDiscountInfo] = useState<any>(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);

  // Set payment method to Credit Card on component mount
  React.useEffect(() => {
    dispatch(setPayment({
      type: PaymentType.CreditCard,
      data: {}
    }));

    // Track payment method selection
    if (typeof window !== 'undefined') {
      import('../../lib/analytics').then(({ trackAddPaymentInfo }) => {
        const totalValue = order.tickets.reduce((sum, ticket) => sum + (ticket.price * ticket.amount), 0) / 100;
        trackAddPaymentInfo('stripe', totalValue);
      }).catch(console.warn);
    }
  }, [dispatch, order.tickets]);

  const validateDiscountCode = async () => {
    if (!discountCode.trim()) return;
    
    setDiscountLoading(true);
    setDiscountError(null);
    
    try {
      // Use original total (before discount) for validation
      const originalTotal = getOriginalTotal();
      
      const response = await fetch('/api/discount/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: discountCode.trim(),
          eventId: eventDateId,
          ticketTypeIds: order.tickets.map(t => t.ticketTypeId),
          orderTotal: originalTotal
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          setDiscountInfo(data.discountCode);
          setDiscountError(null);
          // Notify parent component of discount change
          if (onDiscountChange) {
            onDiscountChange(data.discountCode);
          }
        } else {
          setDiscountError(data.message || 'Invalid discount code');
          setDiscountInfo(null);
          // Notify parent component that discount was removed
          if (onDiscountChange) {
            onDiscountChange(null);
          }
        }
      } else {
        setDiscountError('Failed to validate discount code');
        setDiscountInfo(null);
        // Notify parent component that discount was removed
        if (onDiscountChange) {
          onDiscountChange(null);
        }
      }
    } catch (error) {
      setDiscountError('Failed to validate discount code');
      setDiscountInfo(null);
      // Notify parent component that discount was removed
      if (onDiscountChange) {
        onDiscountChange(null);
      }
    } finally {
      setDiscountLoading(false);
    }
  };

  const removeDiscountCode = () => {
    setDiscountCode('');
    setDiscountInfo(null);
    setDiscountError(null);
    // Notify parent component that discount was removed
    if (onDiscountChange) {
      onDiscountChange(null);
    }
  };

  // Can proceed if terms are accepted
  const canProceed = acceptedTerms;

  if (!isActive) return null;

  const getTotalPrice = () => {
    const ticketTotal = order.tickets.reduce((total, ticket) => {
      const price = (ticket as any).price || 0;
      const quantity = ticket.amount || 0;
      return total + (price * quantity);
    }, 0);
    const shippingFee = shippingFees[selectedDeliveryMethod] || 0;
    const paymentFee = paymentFees[selectedPaymentMethod] || 0;
    const subtotal = ticketTotal + shippingFee + paymentFee;
    
    // Apply discount if available
    if (discountInfo && discountInfo.discountAmount > 0) {
      return Math.max(0, subtotal - discountInfo.discountAmount);
    }
    
    return subtotal;
  };

  const getOriginalTotal = () => {
    const ticketTotal = order.tickets.reduce((total, ticket) => {
      const price = (ticket as any).price || 0;
      const quantity = ticket.amount || 0;
      return total + (price * quantity);
    }, 0);
    const shippingFee = shippingFees[selectedDeliveryMethod] || 0;
    const paymentFee = paymentFees[selectedPaymentMethod] || 0;
    return ticketTotal + shippingFee + paymentFee;
  };

  return (
    <div className="space-y-8">
      {/* Order Summary Box */}
      <div className="bg-neutral-50 rounded-lg p-4 sm:p-6 border border-neutral-200 min-w-0">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Order Summary</h3>
        <div className="space-y-3">
          {/* Tickets */}
          {order.tickets.map((ticket, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-neutral-600">
                {ticket.amount || 1} × {(ticket as any).ticketTypeName || (ticket as any).name || 'Ticket'}
              </span>
              <span className="text-neutral-900">£{(((ticket as any).price || 0) * (ticket.amount || 1)).toFixed(2)}</span>
            </div>
          ))}
          
          {/* Subtotal */}
          <div className="border-t border-neutral-200 pt-3">
            <div className="flex justify-between font-medium">
              <span>Subtotal</span>
              <span>£{order.tickets.reduce((total, ticket) => total + (((ticket as any).price || 0) * (ticket.amount || 1)), 0).toFixed(2)}</span>
            </div>
          </div>
          
          {/* Payment Fee */}
          {selectedPaymentMethod && paymentFees[selectedPaymentMethod] > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Payment Fee</span>
              <span className="text-neutral-900">£{paymentFees[selectedPaymentMethod].toFixed(2)}</span>
            </div>
          )}
          
          {/* Discount Applied */}
          {discountInfo && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount ({discountInfo.code})</span>
              <span>-£{discountInfo.discountAmount.toFixed(2)}</span>
            </div>
          )}
          
          {/* Total */}
          <div className="border-t border-neutral-200 pt-3">
            {discountInfo && (
              <div className="flex justify-between text-sm text-neutral-500 mb-2">
                <span>Original Total</span>
                <span>£{getOriginalTotal().toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-neutral-900">
              <span>Total</span>
              <span>£{getTotalPrice().toFixed(2)}</span>
            </div>
            {discountInfo && (
              <div className="text-sm text-green-600 text-right mt-1">
                You save £{discountInfo.savings.toFixed(2)}!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Discount Code Section */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Discount Code</h3>
        
        {!discountInfo ? (
          <div className="flex space-x-3">
            <input
              type="text"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              placeholder="Enter discount code"
              className="flex-1 px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && validateDiscountCode()}
            />
            <button
              onClick={validateDiscountCode}
              disabled={discountLoading || !discountCode.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {discountLoading ? 'Validating...' : 'Apply'}
            </button>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-800 font-medium">✓ Discount Applied: {discountInfo.code}</p>
                <p className="text-green-600 text-sm">
                  {discountInfo.discountType === 'percentage' 
                    ? `${discountInfo.discountValue}% off` 
                    : `£${discountInfo.discountAmount} off`
                  }
                </p>
              </div>
              <button
                onClick={removeDiscountCode}
                className="text-green-600 hover:text-green-800 text-sm underline"
              >
                Remove
              </button>
            </div>
          </div>
        )}
        
        {discountError && (
          <div className="mt-2 text-red-600 text-sm">{discountError}</div>
        )}
      </div>

      {/* Payment Method Section - Credit Card Only */}
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Payment Method</h3>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">💳</div>
            <div>
              <h4 className="font-medium text-blue-900">Credit Card</h4>
              <p className="text-sm text-blue-700">Pay securely with your credit card via Stripe</p>
            </div>
          </div>
        </div>
      </div>

      {/* Terms and Conditions - Always above payment elements for consistent layout */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          {/* Custom div-based checkbox that actually works */}
          <div 
            onClick={() => {
              const newValue = !acceptedTerms;
              setAcceptedTerms(newValue);
              setPaymentError(null); // Clear error when user makes changes
            }}
            className="flex items-center cursor-pointer mt-1 flex-shrink-0"
          >
            <div 
              className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors duration-200 ${
                acceptedTerms 
                  ? 'bg-primary-600 border-primary-600' 
                  : 'bg-white border-neutral-400 hover:border-neutral-500'
              }`}
            >
              {acceptedTerms && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>
          <div className="flex-1">
            <label 
              onClick={() => {
                const newValue = !acceptedTerms;
                setAcceptedTerms(newValue);
                setPaymentError(null);
              }}
              className="text-sm text-neutral-800 cursor-pointer select-none block"
            >
              <span className="font-medium">I agree to the{' '}</span>
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 underline font-medium">
                Terms and Conditions
              </a>
              <span className="font-medium">{' '}and{' '}</span>
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 underline font-medium">
                Privacy Policy
              </a>
            </label>
            {!acceptedTerms && (
              <p className="text-amber-700 text-xs mt-1">
                ⚠️ You must accept the terms and conditions to proceed with payment
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stripe Form for Credit Card */}
      <div className="bg-neutral-50 rounded-lg p-6 border border-neutral-200">
        <h4 className="text-lg font-semibold text-neutral-900 mb-4">Credit Card Details</h4>
        <StripeCardForm
          onSuccess={(orderId) => {
            console.log('Order created successfully:', orderId);
            onComplete();
          }}
          eventDateId={eventDateId}
          eventName={eventName || 'Event'}
          eventDate={eventDate || new Date().toISOString()}
          discountInfo={discountInfo}
          claimSessionToken={claimSessionToken}
          canProceed={canProceed}
          disabledReason="You must accept the terms and conditions to proceed with payment"
        />
      </div>

      {/* Trust Signals */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 sm:p-6 min-w-0 overflow-hidden">
        <h4 className="text-lg font-semibold text-neutral-900 mb-4">Secure Payment</h4>
        
        {/* Payment Icons */}
        <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-4 mb-4">
          <div className="flex items-center min-w-0 gap-2">
            <svg className="w-6 h-6 shrink-0 text-neutral-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span className="text-sm font-medium text-neutral-700">Visa</span>
          </div>
          <div className="flex items-center min-w-0 gap-2">
            <svg className="w-6 h-6 shrink-0 text-neutral-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span className="text-sm font-medium text-neutral-700">Mastercard</span>
          </div>
          <div className="flex items-center min-w-0 gap-2">
            <svg className="w-6 h-6 shrink-0 text-neutral-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span className="text-sm font-medium text-neutral-700 leading-tight break-words">American Express</span>
          </div>
          <div className="flex items-center min-w-0 gap-2">
            <svg className="w-6 h-6 shrink-0 text-neutral-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span className="text-sm font-medium text-neutral-700">PayPal</span>
          </div>
        </div>
        
        {/* Security Badges */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="flex items-center min-w-0 gap-2">
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-neutral-700">256-bit SSL Encryption</span>
          </div>
          <div className="flex items-center min-w-0 gap-2">
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-neutral-700">PCI DSS Compliant</span>
          </div>
          <div className="flex items-center min-w-0 gap-2">
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-neutral-700">Fraud Protection</span>
          </div>
        </div>
      </div>

      {/* Payment Error Display */}
      {paymentError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-red-800 font-medium">Payment Error</p>
              <p className="text-red-700 text-sm">{paymentError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Button - Not needed for Stripe as it handles submission */}
      {/* The StripeCardForm component handles the payment submission */}
    </div>
  );
};
