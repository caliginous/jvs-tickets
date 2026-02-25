# Event Cover Image Migration to Vercel Blob Storage

This script migrates all event cover images from external URLs to Vercel Blob Storage and updates the database accordingly.

## Prerequisites

1. **Vercel Blob Storage Setup**: You need a Vercel Blob Storage bucket configured
2. **Environment Variables**: Set up the required environment variables
3. **Database Access**: Ensure your database is accessible

## Setup

### 1. Install Dependencies

```bash
npm install @vercel/blob file-type dotenv
npx prisma generate
```

### 2. Environment Variables

Create or update your `.env` file with:

```env
# Required
DATABASE_URL=postgres://username:password@host:port/database
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here

# Optional
BLOB_PREFIX=events/cover-images
BLOB_PUBLIC_BASE=https://htoosyxcavvsuyjz.public.blob.vercel-storage.com
```

**Your Specific Configuration:**
- **Store Name**: `jvs-tickets-blob`
- **Store ID**: `store_htOOSyXCaVVsUYJz`
- **Region**: London, United Kingdom (LHR1)
- **Base URL**: `https://htoosyxcavvsuyjz.public.blob.vercel-storage.com`

### 3. Get Vercel Blob Token

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to Storage → **jvs-tickets-blob**
3. Go to Tokens tab
4. Create a new token with read/write permissions
5. Copy the token to your `.env` file

## Usage

### Dry Run (Recommended First)

Test the migration without making changes:

```bash
DRY_RUN=1 npx ts-node scripts/migrate-event-images.ts --limit 50
```

### Full Migration

Run the complete migration:

```bash
BLOB_READ_WRITE_TOKEN=*** \
npx ts-node scripts/migrate-event-images.ts --concurrency 6
```

### Options

- `--limit N`: Process only N events (useful for testing)
- `--concurrency N`: Set concurrent uploads (default: 6)
- `--dry-run`: Same as DRY_RUN=1 environment variable

## What the Script Does

1. **Scans Database**: Finds all events with cover images
2. **Downloads Images**: Fetches images from current URLs
3. **Uploads to Blob**: Uploads to Vercel Blob Storage with organized naming
4. **Updates Database**: Updates event records with new blob URLs
5. **Handles Duplicates**: Avoids re-uploading identical images using content hashing

## File Naming Convention

Images are stored with the pattern:
```
{BLOB_PREFIX}/{eventId}-{eventTitleSlug}-{contentHash}.{extension}
```

Example:
```
events/cover-images/25-community-gardening-club-29th-june-a1b2c3d4.jpg
```

**Your Storage Path**: `https://htoosyxcavvsuyjz.public.blob.vercel-storage.com/events/cover-images/`

## Safety Features

- **Idempotent**: Safe to re-run multiple times
- **Duplicate Detection**: Won't re-upload identical images
- **Error Handling**: Continues processing even if individual images fail
- **Dry Run Mode**: Test without making changes
- **Batch Processing**: Processes events in manageable chunks

## Monitoring

The script provides real-time progress updates:

```
Processed=25/85 uploaded=20 updated=20 skipped=0 already=0 failed=0
```

## Troubleshooting

### Common Issues

1. **Missing BLOB_READ_WRITE_TOKEN**: Ensure your Vercel blob token is correct
2. **Database Connection**: Verify DATABASE_URL is accessible
3. **Image URLs**: Some external images might be inaccessible or slow

### Recovery

If the script fails partway through:
- Simply re-run it - it will skip already migrated images
- Check logs for specific error messages
- Use `--limit` to process smaller batches

## Post-Migration

After successful migration:

1. **Verify Images**: Check that all images are accessible via blob URLs
2. **Update Frontend**: Ensure your frontend can handle the new blob URLs
3. **Cleanup**: Consider removing old image files if they're no longer needed
4. **Monitor**: Watch for any broken image links

## Performance Tips

- **Concurrency**: Adjust based on your bandwidth and Vercel limits
- **Batch Size**: Default 200 events per batch works well for most cases
- **Network**: Run on a machine with good internet connection
- **Time**: Large migrations may take several hours depending on image count and size
