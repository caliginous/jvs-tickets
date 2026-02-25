#!/usr/bin/env ts-node

/**
 * Fix orders that have amounts stored in pounds instead of pence
 * This script finds orders with suspiciously small amounts and multiplies by 100
 * 
 * Run with: npx ts-node scripts/fix-order-amounts.ts
 * Dry run: DRY_RUN=true npx ts-node scripts/fix-order-amounts.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === 'true';

async function fixOrderAmounts() {
  try {
    console.log('\n🔍 Finding orders with incorrect amount storage...\n');
    console.log(`Mode: ${DRY_RUN ? '🧪 DRY RUN (no changes will be made)' : '✍️  LIVE RUN (will update database)'}\n`);
    
    // Find orders created recently with the buggy code (stripe_176... pattern)
    // These orders have amounts stored in pounds instead of pence
    // We look for stripe orders from Dec 7-8, 2025 with amounts < 100 pence (< £1)
    const suspiciousOrders = await prisma.order.findMany({
      where: {
        AND: [
          {
            id: {
              startsWith: 'stripe_176'
            }
          },
          {
            OR: [
              {
                finalTotal: {
                  gt: 0,
                  lt: 100  // Less than £1 - almost certainly wrong
                }
              },
              {
                originalTotal: {
                  gt: 0,
                  lt: 100
                }
              }
            ]
          }
        ]
      },
      include: {
        tickets: {
          include: {
            eventTicketType: true
          }
        },
        user: true,
        eventDate: {
          include: {
            event: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    console.log(`Found ${suspiciousOrders.length} orders with amounts < £10 (1000 pence)\n`);
    
    if (suspiciousOrders.length === 0) {
      console.log('✅ No orders need fixing\n');
      return;
    }
    
    let fixedCount = 0;
    const fixes = [];
    
    for (const order of suspiciousOrders) {
      // Check if this order's tickets suggest it should cost more
      const ticketPriceSum = order.tickets.reduce((sum, ticket) => {
        const price = ticket.priceCharged || ticket.eventTicketType?.price || 0;
        return sum + price;
      }, 0);
      
      const orderTotal = order.finalTotal || order.originalTotal || 0;
      
      // If ticket prices sum to >= 1000 pence (£10) but order total < 1000,
      // this suggests the order total is stored in pounds
      const shouldFix = ticketPriceSum >= 1000 && orderTotal < 1000;
      
      if (shouldFix) {
        const newFinalTotal = orderTotal * 100;
        const newOriginalTotal = (order.originalTotal || orderTotal) * 100;
        const newDiscountAmount = (order.discountAmount || 0) * 100;
        
        fixes.push({
          orderId: order.id,
          customer: `${order.user.firstName} ${order.user.lastName}`,
          event: order.eventDate.event.title,
          old: {
            finalTotal: orderTotal,
            originalTotal: order.originalTotal,
            discountAmount: order.discountAmount
          },
          new: {
            finalTotal: newFinalTotal,
            originalTotal: newOriginalTotal,
            discountAmount: newDiscountAmount
          },
          display: {
            old: `£${(orderTotal / 100).toFixed(2)}`,
            new: `£${(newFinalTotal / 100).toFixed(2)}`
          }
        });
        
        if (!DRY_RUN) {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              finalTotal: newFinalTotal,
              originalTotal: newOriginalTotal,
              discountAmount: newDiscountAmount
            }
          });
          fixedCount++;
        }
      }
    }
    
    if (fixes.length === 0) {
      console.log('✅ All orders appear to be stored correctly\n');
      return;
    }
    
    console.log(`📋 Orders to fix: ${fixes.length}\n`);
    
    fixes.forEach(fix => {
      console.log(`Order: ${fix.orderId}`);
      console.log(`  Customer: ${fix.customer}`);
      console.log(`  Event: ${fix.event}`);
      console.log(`  Old values: finalTotal=${fix.old.finalTotal} → displays as ${fix.display.old}`);
      console.log(`  New values: finalTotal=${fix.new.finalTotal} → displays as ${fix.display.new}`);
      console.log('');
    });
    
    if (DRY_RUN) {
      console.log(`\n🧪 DRY RUN: ${fixes.length} orders would be fixed`);
      console.log('Run without DRY_RUN=true to apply changes\n');
    } else {
      console.log(`\n✅ Fixed ${fixedCount} orders\n`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  fixOrderAmounts()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { fixOrderAmounts };

