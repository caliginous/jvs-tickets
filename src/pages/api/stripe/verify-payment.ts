import { NextApiRequest, NextApiResponse } from 'next';
import { retrieveCheckoutSession } from '../../../lib/stripe';
import prisma from '../../../lib/prisma';
import { serverAuthenticate } from '../../../constants/serverUtil';
import { timingSafeEqual } from 'crypto';

function safeEqual(a: string | undefined | null, b: string | undefined | null): boolean {
    if (!a || !b) return false;
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return timingSafeEqual(ab, bb);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, orderId, secret } = req.body ?? {};

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Authorize: require either a matching orderId + cancellationSecret, or an admin
    // session. This prevents unauthenticated enumeration of Stripe sessions.
    let authorized = false;
    if (typeof orderId === 'string' && typeof secret === 'string') {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { cancellationSecret: true },
      });
      if (order && safeEqual(secret, order.cancellationSecret)) {
        authorized = true;
      }
    }
    if (!authorized) {
      const admin = await serverAuthenticate(req, res, undefined, false);
      if (!admin) {
        return res.status(401).json({ error: 'Unauthenticated' });
      }
    }

    const session = await retrieveCheckoutSession(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Payment not completed',
        status: session.payment_status,
      });
    }

    // Return minimal session data — avoid leaking full metadata / customer email
    // to any caller who managed to guess a session id.
    return res.status(200).json({
      success: true,
      sessionData: {
        id: session.id,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
      },
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ success: false, error: 'Failed to verify payment' });
  }
}
