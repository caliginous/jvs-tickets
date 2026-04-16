import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

/**
 * Cleanup Expired Orders Cron Job
 * 
 * This endpoint should be called periodically (e.g., every 5 minutes) by a cron service.
 * It expires PENDING orders that have been abandoned (no payment within expiry window).
 * 
 * IMPORTANT: This is critical for capacity management. PENDING orders reserve capacity,
 * so abandoned checkouts must be cleaned up to release their tickets back to the pool.
 * 
 * Expiry window: 20 minutes (slightly longer than Stripe checkout session expiry of 15 min)
 * 
 * To set up on Vercel:
 * 1. Add to vercel.json crons array with path "/api/cron/cleanup-expired-orders" and schedule every 5 minutes
 * 2. Protect the endpoint with CRON_SECRET environment variable
 */

const EXPIRY_MINUTES = 20;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET (for cron) or POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret. In production CRON_SECRET MUST be set — refuse otherwise so a
  // missing env var cannot accidentally open this endpoint to the public.
  const cronSecret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (!cronSecret) {
      console.error('[cleanup-expired-orders] CRON_SECRET is not configured');
      return res.status(500).json({ error: 'Server misconfigured' });
    }
    const authHeader = req.headers.authorization ?? '';
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[cleanup-expired-orders] Unauthorized cron request');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } else if (cronSecret) {
    // In dev, require the header if a secret is set.
    const authHeader = req.headers.authorization ?? '';
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const expiryThreshold = new Date(Date.now() - EXPIRY_MINUTES * 60 * 1000);
    
    console.log(`[cleanup-expired-orders] Starting cleanup. Expiring PENDING orders created before ${expiryThreshold.toISOString()}`);

    // Find PENDING orders older than expiry threshold
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        date: { lt: expiryThreshold }
      },
      select: {
        id: true,
        date: true,
        _count: { select: { tickets: true } }
      }
    });

    if (expiredOrders.length === 0) {
      console.log('[cleanup-expired-orders] No expired orders found');
      return res.status(200).json({ 
        success: true, 
        message: 'No expired orders found',
        expiredCount: 0
      });
    }

    console.log(`[cleanup-expired-orders] Found ${expiredOrders.length} expired PENDING orders`);

    // Update orders to EXPIRED status
    const orderIds = expiredOrders.map(o => o.id);
    
    const updateResult = await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: { status: 'EXPIRED' }
    });

    // Log details for monitoring
    const totalTicketsReleased = expiredOrders.reduce((sum, o) => sum + o._count.tickets, 0);
    
    console.log(`[cleanup-expired-orders] Expired ${updateResult.count} orders, releasing ${totalTicketsReleased} ticket holds`);
    
    // Log individual orders for debugging if needed
    for (const order of expiredOrders) {
      console.log(`[cleanup-expired-orders] Expired order ${order.id} (created: ${order.date?.toISOString()}, tickets: ${order._count.tickets})`);
    }

    return res.status(200).json({
      success: true,
      message: `Expired ${updateResult.count} abandoned orders`,
      expiredCount: updateResult.count,
      ticketsReleased: totalTicketsReleased,
      orderIds: orderIds
    });

  } catch (error) {
    console.error('[cleanup-expired-orders] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to cleanup expired orders',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
