#!/usr/bin/env ts-node

/**
 * Backfill Script: Migrate from Global Categories to Per-Event Ticket Types
 * 
 * This script:
 * 1. Creates EventTicketType rows by cloning current event-to-category mappings
 * 2. Attaches existing tickets to the correct per-event EventTicketType
 * 3. Maintains correctness of sold counters and capacity
 * 4. Backfills price snapshots for existing tickets
 * 
 * Run with: npx ts-node scripts/backfill-event-ticket-types.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CategoryLink {
  eventId: number;
  categoryId: number;
  sortOrder?: number | null;
  maxAmount?: number | null;
}

interface TicketWithOrder {
  id: string;
  categoryId: number;
  orderId: string;
  order: {
    eventDateId: number;
    eventDate?: {
      eventId: number;
    } | null;
  };
}

async function main() {
  console.log('🚀 Starting EventTicketType backfill migration...\n');

  try {
    // Step 1: Create mapping from (eventId, categoryId) to new EventTicketType
    console.log('📋 Step 1: Creating EventTicketType rows from existing category mappings...');
    
    const categoryLinks = await prisma.categoriesOnEvents.findMany({
      select: {
        eventId: true,
        categoryId: true,
        maxAmount: true,
      },
    });

    console.log(`Found ${categoryLinks.length} category-to-event mappings`);

    const mapping = new Map<string, number>(); // key: `${eventId}:${categoryId}` -> eventTicketTypeId

    for (const link of categoryLinks) {
      const category = await prisma.category.findUnique({
        where: { id: link.categoryId },
        select: {
          id: true,
          label: true,
          price: true,
          color: true,
        },
      });

      if (!category) {
        console.warn(`⚠️  Category ${link.categoryId} not found, skipping...`);
        continue;
      }

      // Create EventTicketType
      const eventTicketType = await prisma.eventTicketType.create({
        data: {
          eventId: link.eventId,
          name: category.label,
          description: null, // Categories don't have descriptions currently
          price: Math.round(category.price * 100), // Convert to pence
          currency: 'GBP',
          capacity: link.maxAmount || null, // Use per-event capacity if available
          sold: 0, // Will be calculated in step 3
          isActive: true,
          sortOrder: 0, // Default sort order
          colorHex: category.color || null,
        },
      });

      mapping.set(`${link.eventId}:${link.categoryId}`, eventTicketType.id);
      console.log(`✅ Created EventTicketType: ${eventTicketType.name} for Event ${link.eventId}`);
    }

    console.log(`\n📊 Created ${mapping.size} EventTicketType rows\n`);

    // Step 2: Backfill tickets with eventTicketTypeId and price snapshots
    console.log('🎫 Step 2: Backfilling tickets with EventTicketType references and price snapshots...');
    
    const tickets = await prisma.ticket.findMany({
      where: {
        eventTicketTypeId: null,
        categoryId: { not: null },
      },
      select: {
        id: true,
        categoryId: true,
        orderId: true,
        order: {
          select: {
            eventDateId: true,
            eventDate: {
              select: {
                eventId: true,
              },
            },
          },
        },
      },
    });

    console.log(`Found ${tickets.length} tickets to backfill`);

    let updatedTickets = 0;
    let skippedTickets = 0;

    for (const ticket of tickets) {
      const eventId = ticket.order.eventDate?.eventId;
      
      if (!eventId || !ticket.categoryId) {
        console.warn(`⚠️  Ticket ${ticket.id} missing eventId or categoryId, skipping...`);
        skippedTickets++;
        continue;
      }

      const eventTicketTypeId = mapping.get(`${eventId}:${ticket.categoryId}`);
      
      if (!eventTicketTypeId) {
        console.warn(`⚠️  No EventTicketType found for Event ${eventId}, Category ${ticket.categoryId}, skipping...`);
        skippedTickets++;
        continue;
      }

      // Get the category price for the price snapshot
      const category = await prisma.category.findUnique({
        where: { id: ticket.categoryId },
        select: { price: true },
      });

      if (!category) {
        console.warn(`⚠️  Category ${ticket.categoryId} not found for price snapshot, skipping...`);
        skippedTickets++;
        continue;
      }

      // Update ticket with new fields
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          eventTicketTypeId: eventTicketTypeId,
          priceCharged: Math.round(category.price * 100), // Convert to pence
          currency: 'GBP',
          taxCharged: 0, // Default to 0 for existing tickets
          feeCharged: 0, // Default to 0 for existing tickets
        },
      });

      updatedTickets++;
      
      if (updatedTickets % 100 === 0) {
        console.log(`   Processed ${updatedTickets} tickets...`);
      }
    }

    console.log(`\n✅ Updated ${updatedTickets} tickets`);
    if (skippedTickets > 0) {
      console.log(`⚠️  Skipped ${skippedTickets} tickets (missing data)`);
    }

    // Step 3: Rebuild sold counters
    console.log('\n📊 Step 3: Rebuilding sold counters for EventTicketTypes...');
    
    const soldCounts = await prisma.ticket.groupBy({
      by: ['eventTicketTypeId'],
      _count: { _all: true },
      where: { eventTicketTypeId: { not: null } },
    });

    console.log(`Found ${soldCounts.length} EventTicketTypes with tickets`);

    for (const row of soldCounts) {
      if (!row.eventTicketTypeId) continue;

      await prisma.eventTicketType.update({
        where: { id: row.eventTicketTypeId },
        data: { sold: row._count._all },
      });

      console.log(`   Updated EventTicketType ${row.eventTicketTypeId}: sold = ${row._count._all}`);
    }

    // Step 4: Verification and safety checks
    console.log('\n🔍 Step 4: Running verification checks...');
    
    const verificationResults = await verifyMigration(mapping);
    
    console.log('\n📋 Verification Results:');
    console.log(`   Total EventTicketTypes created: ${verificationResults.totalEventTicketTypes}`);
    console.log(`   Total tickets updated: ${verificationResults.totalTicketsUpdated}`);
    console.log(`   Tickets with price snapshots: ${verificationResults.ticketsWithPriceSnapshots}`);
    console.log(`   Tickets missing eventTicketTypeId: ${verificationResults.ticketsMissingEventTicketTypeId}`);
    console.log(`   Sold counters accurate: ${verificationResults.soldCountersAccurate ? '✅' : '❌'}`);

    if (verificationResults.soldCountersAccurate) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with warnings. Please review the sold counters.');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyMigration(mapping: Map<string, number>) {
  // Check total EventTicketTypes created
  const totalEventTicketTypes = await prisma.eventTicketType.count();
  
  // Check total tickets updated
  const totalTicketsUpdated = await prisma.ticket.count({
    where: { eventTicketTypeId: { not: null } },
  });
  
  // Check tickets with price snapshots
  const ticketsWithPriceSnapshots = await prisma.ticket.count({
    where: { 
      eventTicketTypeId: { not: null },
      priceCharged: { not: null },
    },
  });
  
  // Check tickets still missing eventTicketTypeId
  const ticketsMissingEventTicketTypeId = await prisma.ticket.count({
    where: { eventTicketTypeId: null },
  });
  
  // Verify sold counters are accurate
  let soldCountersAccurate = true;
  
  const eventTicketTypes = await prisma.eventTicketType.findMany({
    select: { id: true, sold: true },
  });
  
  for (const ett of eventTicketTypes) {
    const actualSold = await prisma.ticket.count({
      where: { eventTicketTypeId: ett.id },
    });
    
    if (actualSold !== ett.sold) {
      console.warn(`⚠️  EventTicketType ${ett.id}: sold counter (${ett.sold}) doesn't match actual tickets (${actualSold})`);
      soldCountersAccurate = false;
    }
  }
  
  return {
    totalEventTicketTypes,
    totalTicketsUpdated,
    ticketsWithPriceSnapshots,
    ticketsMissingEventTicketTypeId,
    soldCountersAccurate,
  };
}

// Run the migration
main()
  .then(() => {
    console.log('\n✨ Backfill script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Backfill script failed:', error);
    process.exit(1);
  });
