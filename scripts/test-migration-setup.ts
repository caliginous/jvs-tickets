/**
 * Test script to verify migration setup before running the full migration
 * 
 * Usage: npx ts-node scripts/test-migration-setup.ts
 */

import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function testSetup() {
  console.log('🔍 Testing migration setup...\n');

  // Test 1: Environment variables
  console.log('1. Checking environment variables...');
  const requiredEnvVars = ['DATABASE_URL', 'BLOB_READ_WRITE_TOKEN'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
  }
  console.log('✅ All required environment variables are set');

  // Test 2: Database connection
  console.log('\n2. Testing database connection...');
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // Test 3: Count events with cover images
  console.log('\n3. Counting events with cover images...');
  try {
    const totalEvents = await prisma.event.count();
    const eventsWithCoverImages = await prisma.event.count({
      where: {
        NOT: [
          { coverImage: null },
          { coverImage: '' }
        ]
      }
    });
    
    console.log(`✅ Total events: ${totalEvents}`);
    console.log(`✅ Events with cover images: ${eventsWithCoverImages}`);
    
    if (eventsWithCoverImages === 0) {
      console.log('⚠️  No events with cover images found. Migration not needed.');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error counting events:', error);
    process.exit(1);
  }

  // Test 4: Sample event data
  console.log('\n4. Fetching sample event data...');
  try {
    const sampleEvent = await prisma.event.findFirst({
      where: {
        NOT: [
          { coverImage: null },
          { coverImage: '' }
        ]
      },
      select: {
        id: true,
        title: true,
        coverImage: true
      }
    });
    
    if (sampleEvent) {
      console.log('✅ Sample event found:');
      console.log(`   ID: ${sampleEvent.id}`);
      console.log(`   Title: ${sampleEvent.title}`);
      console.log(`   Cover Image: ${sampleEvent.coverImage}`);
    }
  } catch (error) {
    console.error('❌ Error fetching sample event:', error);
    process.exit(1);
  }

  // Test 5: Check if any images are already on Vercel Blob
  console.log('\n5. Checking for already migrated images...');
  try {
    const alreadyMigrated = await prisma.event.count({
      where: {
        coverImage: {
          contains: 'vercel-storage.com'
        }
      }
    });
    
    console.log(`✅ Already migrated to Vercel Blob: ${alreadyMigrated} events`);
    
    if (alreadyMigrated > 0) {
      console.log('ℹ️  Some images are already migrated. The script will skip these.');
    }
  } catch (error) {
    console.error('❌ Error checking migrated images:', error);
    process.exit(1);
  }

  console.log('\n🎉 All tests passed! Your migration setup is ready.');
  console.log('\nNext steps:');
  console.log('1. Run a dry run: DRY_RUN=1 npx ts-node scripts/migrate-event-images.ts --limit 5');
  console.log('2. If successful, run the full migration: npx ts-node scripts/migrate-event-images.ts');
  
  await prisma.$disconnect();
}

testSetup().catch(async (error) => {
  console.error('❌ Test failed:', error);
  await prisma.$disconnect();
  process.exit(1);
});
