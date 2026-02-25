import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function populateEventSlugs() {
  try {
    console.log('🔍 Finding events without slugs...');
    
    const eventsWithoutSlugs = await prisma.event.findMany({
      where: {
        OR: [
          { slug: null },
          { slug: '' }
        ]
      },
      select: {
        id: true,
        title: true,
        slug: true
      }
    });

    console.log(`📊 Found ${eventsWithoutSlugs.length} events without slugs`);

    if (eventsWithoutSlugs.length === 0) {
      console.log('✅ All events already have slugs');
      return;
    }

    let updatedCount = 0;
    let errorCount = 0;

    for (const event of eventsWithoutSlugs) {
      try {
        // Generate slug from title
        const baseSlug = event.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Replace multiple hyphens with single
          .trim();

        // Check if slug already exists
        let finalSlug = baseSlug;
        let counter = 1;
        
        while (true) {
          const existingEvent = await prisma.event.findFirst({
            where: {
              slug: finalSlug,
              id: { not: event.id }
            }
          });
          
          if (!existingEvent) {
            break; // Slug is unique
          }
          
          finalSlug = `${baseSlug}-${counter}`;
          counter++;
        }

        // Update the event with the new slug
        await prisma.event.update({
          where: { id: event.id },
          data: { slug: finalSlug }
        });

        console.log(`✅ Updated event "${event.title}" with slug: ${finalSlug}`);
        updatedCount++;

      } catch (error) {
        console.error(`❌ Error updating event ${event.id}:`, error);
        errorCount++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Successfully updated: ${updatedCount} events`);
    console.log(`   ❌ Errors: ${errorCount} events`);
    console.log(`   📊 Total processed: ${eventsWithoutSlugs.length} events`);

  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
populateEventSlugs()
  .then(() => {
    console.log('🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
