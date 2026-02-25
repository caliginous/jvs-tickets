/**
 * Migration script: Convert base64 data URI cover images to Vercel Blob storage
 * 
 * Run with: npx ts-node scripts/migrate-coverimages-to-blob.ts
 * 
 * Requires BLOB_READ_WRITE_TOKEN environment variable to be set.
 */

import { put } from '@vercel/blob';
import prisma from '../src/lib/prisma';

async function migrateDataUriToBlob() {
  console.log('🔍 Finding events with base64 data URI cover images...\n');

  const events = await prisma.event.findMany({
    where: {
      coverImage: {
        startsWith: 'data:'
      }
    },
    select: {
      id: true,
      title: true,
      slug: true,
      coverImage: true
    }
  });

  console.log(`Found ${events.length} events with data URI images to migrate.\n`);

  if (events.length === 0) {
    console.log('✅ No migration needed!');
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const event of events) {
    try {
      const dataUri = event.coverImage!;
      
      // Parse the data URI
      const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        console.error(`❌ Event ${event.id} (${event.title}): Invalid data URI format`);
        errorCount++;
        continue;
      }

      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      // Determine file extension from mime type
      const extMap: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp'
      };
      const ext = extMap[mimeType] || 'jpg';

      // Generate filename
      const filename = `events/cover-images/${event.id}-${event.slug || 'event'}-${Date.now().toString(16)}.${ext}`;

      console.log(`📤 Uploading event ${event.id} (${event.title})...`);
      console.log(`   Size: ${(buffer.length / 1024).toFixed(1)}KB, Type: ${mimeType}`);

      // Upload to Vercel Blob
      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: mimeType
      });

      console.log(`   ✅ Uploaded to: ${blob.url}`);

      // Update the database
      await prisma.event.update({
        where: { id: event.id },
        data: { coverImage: blob.url }
      });

      console.log(`   ✅ Database updated\n`);
      successCount++;

    } catch (error) {
      console.error(`❌ Event ${event.id} (${event.title}): ${error.message}\n`);
      errorCount++;
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Migration complete!`);
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

migrateDataUriToBlob()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
