#!/usr/bin/env ts-node

/**
 * Manual cleanup script for expired PENDING orders
 * Can be run locally or on the server to clean up abandoned checkouts
 * 
 * Usage: npx ts-node scripts/cleanup-expired-orders.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupExpiredOrders() {
  try {
    console.log('\n🧹 Starting expired order cleanup...\n');
    
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
        },
        eventDate: {
          include: {
            event: {
              select: {
                title: true
              }
            }
          }
        }
      }
    });

    console.log(`Found ${expiredOrders.length} expired PENDING orders\n`);

    if (expiredOrders.length === 0) {
      console.log('✅ No expired orders to clean up\n');
      return;
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
            cancellationReason: 'Payment session expired (30 minutes)',
            cancelledAt: new Date()
          }
        });

        cleanedCount++;
        
        const eventTitle = order.eventDate?.event?.title || 'Unknown Event';
        const age = Math.round((Date.now() - order.date.getTime()) / (60 * 1000));
        
        console.log(`✅ Expired order ${order.id}`);
        console.log(`   Event: ${eventTitle}`);
        console.log(`   Tickets: ${order.tickets.length}`);
        console.log(`   Age: ${age} minutes\n`);
        
      } catch (orderError) {
        console.error(`❌ Error expiring order ${order.id}:`, orderError);
      }
    }

    // Summary
    console.log('📊 Cleanup Summary:');
    console.log(`   Orders expired: ${cleanedCount}`);
    console.log(`   Total tickets released: ${Object.values(capacityReleased).reduce((sum, count) => sum + count, 0)}`);
    console.log('\n   Capacity released by ticket type:');
    
    for (const [ticketTypeId, count] of Object.entries(capacityReleased)) {
      const ticketType = await prisma.eventTicketType.findUnique({
        where: { id: parseInt(ticketTypeId) },
        select: { name: true, event: { select: { title: true } } }
      });
      
      console.log(`     ${ticketType?.event?.title || 'Unknown'} - ${ticketType?.name || `Type ${ticketTypeId}`}: ${count} tickets`);
    }
    
    console.log('\n✅ Cleanup complete\n');

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  cleanupExpiredOrders()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { cleanupExpiredOrders };

