import { useRouter } from 'next/router';
import Navbar from '../../components/booking/Navbar';
import Footer from '../../components/booking/Footer';

export default function CheckoutCancel() {
  const router = useRouter();

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-yellow-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Checkout Cancelled</h1>
          <p className="text-gray-600 mb-4">Your payment was not completed. No charges were made.</p>
          <p className="text-sm text-gray-500 mb-6">You can try again anytime.</p>
          <div className="space-x-4">
            <button
              onClick={() => router.back()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/')}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
            >
              Return to Home
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
