import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

/**
 * Cleanup expired PENDING orders
 * This releases capacity from abandoned Stripe checkout sessions
 * 
 * Should be called by Vercel Cron every 5-10 minutes
 * Or can be called manually: POST /api/cron/cleanup-expired-orders
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify this is either a POST request or a Vercel Cron request
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Optional: Add authorization check for manual calls
  // For Vercel Cron, the request will have a specific header
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  // Allow if it's from Vercel Cron (check header) or has valid auth
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  const isAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`;
  
  if (!isVercelCron && !isAuthorized) {
    console.log('❌ Unauthorized cleanup request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🧹 [CLEANUP] Starting expired order cleanup...');
    
    // Find PENDING orders older than 30 minutes
    const expirationTime = new Date(Date.now() - 30 * 60 * 1000);
    
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        date: {
          lt: expirationTime
        }
      },
      include: {
        tickets: {
          select: {
            id: true,
            eventTicketTypeId: true
          }
        }
      }
    });

    console.log(`🧹 [CLEANUP] Found ${expiredOrders.length} expired PENDING orders`);

    if (expiredOrders.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No expired orders to clean up',
        expiredCount: 0
      });
    }

    // Process each expired order
    let cleanedCount = 0;
    const capacityReleased: Record<number, number> = {};

    for (const order of expiredOrders) {
      try {
        // Count tickets by ticket type for this order
        order.tickets.forEach(ticket => {
          if (ticket.eventTicketTypeId) {
            capacityReleased[ticket.eventTicketTypeId] = (capacityReleased[ticket.eventTicketTypeId] || 0) + 1;
          }
        });

        // Update order status to EXPIRED
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'EXPIRED',
            cancellationReason: 'Payment session expired (30 minutes)'
          }
        });

        cleanedCount++;
        console.log(`🧹 [CLEANUP] Expired order ${order.id} (${order.tickets.length} tickets)`);
      } catch (orderError) {
        console.error(`🧹 [CLEANUP] Error expiring order ${order.id}:`, orderError);
      }
    }

    // Log capacity released per ticket type
    console.log(`🧹 [CLEANUP] Capacity released by ticket type:`, capacityReleased);
    for (const [ticketTypeId, count] of Object.entries(capacityReleased)) {
      console.log(`   Ticket type ${ticketTypeId}: ${count} tickets released`);
    }

    console.log(`🧹 [CLEANUP] ✅ Cleanup complete: ${cleanedCount} orders expired, ${Object.values(capacityReleased).reduce((sum, count) => sum + count, 0)} tickets released`);

    return res.status(200).json({
      success: true,
      message: `Expired ${cleanedCount} orders`,
      expiredCount: cleanedCount,
      ticketsReleased: Object.values(capacityReleased).reduce((sum, count) => sum + count, 0),
      capacityReleased
    });

  } catch (error) {
    console.error('🧹 [CLEANUP] ❌ Error during cleanup:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Cleanup failed'
    });
  }
}

