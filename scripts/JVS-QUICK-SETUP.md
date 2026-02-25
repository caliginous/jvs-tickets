# 🚀 JVS Tickets - Quick Migration Setup

## Your Vercel Blob Storage Details

- **Store Name**: `jvs-tickets-blob`
- **Store ID**: `store_htOOSyXCaVVsUYJz`
- **Region**: London, United Kingdom (LHR1)
- **Base URL**: `https://htoosyxcavvsuyjz.public.blob.vercel-storage.com`

## ⚡ Quick Start (5 minutes)

### 1. Get Your Blob Token
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Storage** → **jvs-tickets-blob**
3. Click **Tokens** tab
4. Click **Create Token**
5. Give it a name (e.g., "JVS Image Migration")
6. Select **Read & Write** permissions
7. Copy the token

### 2. Create Your .env File
```bash
# Copy the example file
cp scripts/jvs-tickets-blob-config.env .env

# Edit .env and add your actual values
nano .env
```

Your `.env` should look like:
```env
DATABASE_URL=postgres://your_actual_db_connection_string
BLOB_READ_WRITE_TOKEN=your_actual_token_here
BLOB_PREFIX=events/cover-images
BLOB_PUBLIC_BASE=https://htoosyxcavvsuyjz.public.blob.vercel-storage.com
```

### 3. Test Your Setup
```bash
npm run migrate:images:test
```

### 4. Run a Test Migration (5 events)
```bash
npm run migrate:images:dry-run
```

### 5. Run Full Migration
```bash
npm run migrate:images
```

## 🔍 What Happens During Migration

1. **Scans** your database for events with cover images
2. **Downloads** images from current URLs (like `https://backend.jvs.org.uk/...`)
3. **Uploads** to Vercel Blob Storage at `https://htoosyxcavvsuyjz.public.blob.vercel-storage.com/events/cover-images/`
4. **Updates** your database with new blob URLs
5. **Skips** any images already migrated

## 📊 Expected Results

After migration, your images will be accessible at:
```
https://htoosyxcavvsuyjz.public.blob.vercel-storage.com/events/cover-images/
├── 25-community-gardening-club-29th-june-a1b2c3d4.jpg
├── 16-community-planning-brunch-b5c6d7e8.png
├── 13-friday-night-dinner-f9g0h1i2.png
└── ... (more images)
```

## 🛡️ Safety Features

- **Dry-run mode**: Test without making changes
- **Idempotent**: Safe to run multiple times
- **Duplicate detection**: Won't re-upload identical images
- **Error handling**: Continues even if some images fail
- **Progress tracking**: See real-time updates

## 🚨 If Something Goes Wrong

1. **Check logs** for specific error messages
2. **Verify your token** has read/write permissions
3. **Ensure database** is accessible
4. **Check internet connection** for image downloads
5. **Re-run the script** - it will skip already migrated images

## 📞 Need Help?

The migration scripts include comprehensive logging and error handling. Check:
- `scripts/README-migrate-event-images.md` - Full documentation
- `scripts/test-migration-setup.ts` - Setup validation
- Console output during migration for detailed progress

## 🎯 Next Steps After Migration

1. **Verify images** load correctly in your frontend
2. **Update any hardcoded image URLs** if needed
3. **Monitor performance** improvements
4. **Consider image optimization** using Vercel's image services

---

**Ready to migrate? Start with step 1 above!** 🚀
