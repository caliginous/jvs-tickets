const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteAllEvents() {
  try {
    console.log('🗑️  Starting to delete all events...\n');
    
    // First, let's see what we're about to delete
    const events = await prisma.event.findMany({
      include: {
        dates: true,
        categories: true
      }
    });
    
    if (events.length === 0) {
      console.log('❌ No events found in the database.');
      return;
    }
    
    console.log(`📋 Found ${events.length} event(s) to delete:`);
    events.forEach(event => {
      console.log(`   - Event ID ${event.id}: "${event.title}"`);
      console.log(`     Dates: ${event.dates.length}, Categories: ${event.categories.length}`);
    });
    
    console.log('\n🗑️  Deleting all events and related data...');
    
    // Delete all event dates first (due to foreign key constraints)
    const deletedDates = await prisma.eventDate.deleteMany({});
    console.log(`✅ Deleted ${deletedDates.count} event dates`);
    
    // Delete all categories on events
    const deletedCategories = await prisma.categoriesOnEvents.deleteMany({});
    console.log(`✅ Deleted ${deletedCategories.count} categories on events`);
    
    // Delete all custom fields
    const deletedCustomFields = await prisma.customField.deleteMany({});
    console.log(`✅ Deleted ${deletedCustomFields.count} custom fields`);
    
    // Delete all events
    const deletedEvents = await prisma.event.deleteMany({});
    console.log(`✅ Deleted ${deletedEvents.count} events`);
    
    console.log('\n🎉 All events and related data deleted successfully!');
    console.log('💡 You can now create new events with the enhanced validation.');
    
  } catch (error) {
    console.error('❌ Error deleting events:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllEvents();
