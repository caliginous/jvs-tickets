import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { retrieveCheckoutSession } from '../../lib/stripe';
import Navbar from '../../components/booking/Navbar';
import Footer from '../../components/booking/Footer';

export default function CheckoutSuccess() {
  const router = useRouter();
  const { session_id } = router.query;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    // With the new webhook-based flow, we don't need to verify payment here
    // The webhook handles order creation when Stripe confirms payment
    // Just show success immediately
    setIsLoading(false);
  }, []);



  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-6"></div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Processing your payment...</h1>
            <p className="text-gray-600">Please wait while we confirm your order.</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="text-red-500 text-7xl mb-6">❌</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment Error</h1>
            <p className="text-gray-700 mb-6 text-lg">{error}</p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/')}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
              >
                Return to Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-700 transition-colors duration-200"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (!error && !isLoading) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="text-green-500 text-7xl mb-6">✅</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
            <p className="text-gray-700 mb-4 text-lg">Thank you for your purchase. Your tickets have been confirmed.</p>
            <p className="text-sm text-gray-500 mb-6">Session ID: {session_id}</p>
            <p className="text-sm text-gray-500 mb-8">You will receive a confirmation email shortly. Your order is being processed.</p>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center py-16">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-blue-500 text-7xl mb-6">⏳</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Processing...</h1>
          <p className="text-gray-600">Please wait while we complete your order.</p>
        </div>
      </div>
    );
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {renderContent()}
      </main>
      <Footer />
    </>
  );
}
