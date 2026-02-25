import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim() // Remove leading/trailing whitespace
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

async function generateEventSlugs() {
  console.log('🔧 Generating slugs for all events...\n');

  try {
    // Get all events
    const events = await prisma.event.findMany({
      select: {
        id: true,
        title: true,
        slug: true
      }
    });

    console.log(`📊 Found ${events.length} events\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const event of events) {
      // Skip if slug already exists
      if (event.slug) {
        console.log(`⏭️  Skipped: "${event.title}" (already has slug: ${event.slug})`);
        skippedCount++;
        continue;
      }

      // Generate slug from title
      const newSlug = generateSlug(event.title);

      if (!newSlug) {
        console.log(`⚠️  Skipped: "${event.title}" (could not generate valid slug)`);
        skippedCount++;
        continue;
      }

      // Check if slug already exists (avoid duplicates)
      const existingEvent = await prisma.event.findFirst({
        where: {
          slug: newSlug,
          id: { not: event.id }
        }
      });

      let finalSlug = newSlug;
      if (existingEvent) {
        // Append event ID to make it unique
        finalSlug = `${newSlug}-${event.id}`;
        console.log(`🔄 Made unique: "${event.title}" → ${finalSlug} (duplicate slug resolved)`);
      }

      // Update the event with the slug
      await prisma.event.update({
        where: { id: event.id },
        data: { slug: finalSlug }
      });

      console.log(`✅ Updated: "${event.title}" → ${finalSlug}`);
      updatedCount++;
    }

    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Updated: ${updatedCount} events`);
    console.log(`   ⏭️  Skipped: ${skippedCount} events`);
    console.log(`   📊 Total: ${events.length} events`);

    // Show sample of updated events
    if (updatedCount > 0) {
      console.log(`\n🎯 Sample URLs (after rebuild):`);
      const sampleEvents = await prisma.event.findMany({
        where: { slug: { not: null } },
        select: { title: true, slug: true },
        take: 5
      });

      sampleEvents.forEach(event => {
        console.log(`   https://tickets.jvs.org.uk/events/${event.slug}`);
      });
    }

  } catch (error) {
    console.error('❌ Error generating slugs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateEventSlugs();













