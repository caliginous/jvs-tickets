import { NextApiRequest, NextApiResponse } from 'next';
import { retrieveCheckoutSession } from '../../../lib/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Retrieve the checkout session from Stripe
    const session = await retrieveCheckoutSession(sessionId);

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ 
        success: false, 
        error: 'Payment not completed',
        status: session.payment_status 
      });
    }

    // Return the session data for order creation
    return res.status(200).json({
      success: true,
      sessionData: {
        id: session.id,
        customer_email: session.customer_email,
        metadata: session.metadata,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
      }
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to verify payment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
