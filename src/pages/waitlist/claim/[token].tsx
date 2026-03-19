import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

interface OfferDetails {
  offerId: string;
  eventDateId: number;
  eventName: string;
  eventDate: string;
  venueName?: string;
  ticketTypeName: string;
  ticketTypeId: number;
  ticketPrice: number;
  currency: string;
  quantity: number;
  expiresAt: string;
  entryEmail: string;
  entryFirstName?: string;
  entryLastName?: string;
}

export default function WaitlistClaimPage() {
  const router = useRouter();
  const { token } = router.query;

  const [offer, setOffer] = useState<OfferDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!token) return;

    const loadOffer = async () => {
      try {
        const resp = await fetch(`/api/waitlist/claim/${token}`);
        if (!resp.ok) {
          const data = await resp.json();
          setError(data.error || 'Failed to load offer');
          return;
        }
        const data = await resp.json();
        setOffer(data);
      } catch {
        setError('Failed to load offer details');
      } finally {
        setLoading(false);
      }
    };

    loadOffer();
  }, [token]);

  useEffect(() => {
    if (!offer) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expires = new Date(offer.expiresAt).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        setError('This offer has expired');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [offer]);

  const handleClaim = async () => {
    if (!token || claiming) return;
    setClaiming(true);

    try {
      const resp = await fetch(`/api/waitlist/claim/${token}`, { method: 'POST' });
      if (!resp.ok) {
        const data = await resp.json();
        setError(data.error || 'Failed to create claim session');
        setClaiming(false);
        return;
      }

      const { claimSessionToken } = await resp.json();

      // Redirect to the booking page with the claim session token
      // The event page / booking flow will detect this and pre-fill
      const eventSlug = offer?.eventName?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || '';
      router.push(
        `/events/${eventSlug}?claimSession=${claimSessionToken}&eventDateId=${offer?.eventDateId}&ticketTypeId=${offer?.ticketTypeId}&quantity=${offer?.quantity}`
      );
    } catch {
      setError('Failed to start claim process');
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading your offer...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Offer Unavailable</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!offer) return null;

  const formatPrice = (pence: number) => `£${(pence / 100).toFixed(2)}`;
  const totalPrice = offer.ticketPrice * offer.quantity;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Timer bar */}
          <div className="bg-blue-600 px-6 py-3 flex items-center justify-between">
            <span className="text-white text-sm font-medium">Offer expires in</span>
            <span className="text-white text-lg font-bold font-mono">{timeLeft}</span>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{offer.eventName}</h1>
              {offer.eventDate && (
                <p className="mt-1 text-gray-600">
                  {new Date(offer.eventDate).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
              {offer.venueName && (
                <p className="text-gray-500 text-sm">{offer.venueName}</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Ticket type</span>
                <span className="font-medium text-gray-900">{offer.ticketTypeName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Quantity</span>
                <span className="font-medium text-gray-900">{offer.quantity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Price per ticket</span>
                <span className="font-medium text-gray-900">{formatPrice(offer.ticketPrice)}</span>
              </div>
              <div className="flex justify-between text-base pt-2 border-t border-gray-200">
                <span className="font-medium text-gray-900">Total</span>
                <span className="font-bold text-gray-900">{formatPrice(totalPrice)}</span>
              </div>
            </div>

            <button
              onClick={handleClaim}
              disabled={claiming || timeLeft === 'Expired'}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors text-center"
            >
              {claiming ? 'Processing...' : 'Continue to Checkout'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              By clicking above you will be taken to the checkout to complete your booking.
              Your place is reserved until the timer expires.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
