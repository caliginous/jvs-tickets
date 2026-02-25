# Expired Order Cleanup System

## Overview

This system automatically cleans up expired PENDING orders to release ticket capacity from abandoned Stripe checkout sessions.

## How It Works

### The Problem
When users start checkout:
1. A PENDING order is created with tickets to reserve capacity
2. If the user completes payment → order becomes CONFIRMED, tickets are sold
3. If the user abandons checkout → order stays PENDING, consuming capacity

Without cleanup, abandoned checkouts permanently reduce available capacity.

### The Solution
- PENDING orders older than 30 minutes are automatically marked as EXPIRED
- This releases the reserved capacity back to the ticket pool
- Cleanup runs every 10 minutes via Vercel Cron (Pro plan)
- Ensures capacity is freed quickly from abandoned checkouts

## Components

### 1. Vercel Cron Job (Automatic) ✅
- **Endpoint**: `/api/cron/cleanup-expired-orders`
- **Schedule**: Every 10 minutes (`*/10 * * * *`)
- **Configuration**: `vercel.json`
- **Authentication**: Vercel Cron header (`x-vercel-cron`)
- **Status**: Active on Vercel Pro plan

### 2. Manual Script (On-Demand)
- **Script**: `scripts/cleanup-expired-orders.ts`
- **Usage**: `npx ts-node scripts/cleanup-expired-orders.ts`
- **When to use**: 
  - Testing locally
  - Manual cleanup if cron fails
  - Checking for stuck orders

### 3. API Endpoint (Manual Trigger)
- **URL**: `POST /api/cron/cleanup-expired-orders`
- **Auth**: Requires `Authorization: Bearer <CRON_SECRET>` header
- **Usage**: `curl -X POST -H "Authorization: Bearer your-secret" https://tickets.jvs.org.uk/api/cron/cleanup-expired-orders`

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# Optional: Secret for manually triggering cleanup
CRON_SECRET=your-random-secret-here
```

### Vercel Cron Setup

The cron job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-expired-orders",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

**Note**: Vercel Hobby plan only allows daily cron jobs. For more frequent cleanup:

### External Cron Services (Recommended for Hobby Plan)

**Option 1: cron-job.org** (Free)
1. Sign up at https://cron-job.org
2. Create new cron job:
   - URL: `https://tickets.jvs.org.uk/api/cron/cleanup-expired-orders`
   - Method: POST
   - Schedule: Every 10 minutes
   - Authentication: Add header `Authorization: Bearer YOUR_CRON_SECRET`

**Option 2: EasyCron** (Free tier available)
1. Sign up at https://www.easycron.com
2. Create cron job with same settings as above

**Option 3: GitHub Actions** (Free)
Create `.github/workflows/cleanup-orders.yml`:
```yaml
name: Cleanup Expired Orders
on:
  schedule:
    - cron: '*/10 * * * *'  # Every 10 minutes
  workflow_dispatch:  # Manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger cleanup
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://tickets.jvs.org.uk/api/cron/cleanup-expired-orders
```

## Monitoring

### Check Cleanup Logs

In Vercel Dashboard:
1. Go to your deployment
2. Navigate to "Functions"
3. Find `/api/cron/cleanup-expired-orders`
4. View logs to see cleanup activity

### Expected Output

```
🧹 [CLEANUP] Starting expired order cleanup...
🧹 [CLEANUP] Found 3 expired PENDING orders
✅ Expired order stripe_1234567890_abc123 (2 tickets)
✅ Expired order stripe_1234567891_def456 (1 tickets)
✅ Expired order stripe_1234567892_ghi789 (3 tickets)
🧹 [CLEANUP] Capacity released by ticket type: { "1": 4, "2": 2 }
🧹 [CLEANUP] ✅ Cleanup complete: 3 orders expired, 6 tickets released
```

## Manual Cleanup

### Run Locally

```bash
cd tessera-main
npx ts-node scripts/cleanup-expired-orders.ts
```

### Trigger via API

```bash
# Set your secret
export CRON_SECRET="your-secret-here"

# Call the endpoint
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://tickets.jvs.org.uk/api/cron/cleanup-expired-orders
```

## Troubleshooting

### Cron not running?

1. **Check Vercel Plan**: Cron jobs require Pro plan
2. **Check Vercel Dashboard**: Functions → Cron → See if it's scheduled
3. **Manual trigger**: Use the API endpoint or script to clean up manually

### Too many expired orders?

If you see many expired orders, it might indicate:
- Payment failures
- Poor UX causing abandonment
- Users getting stuck in checkout
- Consider reducing expiration time from 30 to 15 minutes

### Capacity not released?

The cleanup marks orders as EXPIRED but doesn't delete them. Capacity checks exclude EXPIRED orders, so capacity should be released immediately.

If capacity still seems stuck:
1. Check if orders are actually marked EXPIRED
2. Verify capacity checks filter EXPIRED status
3. Run: `SELECT status, COUNT(*) FROM "Order" GROUP BY status;` in database

## Best Practices

1. **Monitor cleanup logs** regularly to spot issues
2. **Keep expiration time reasonable** (30 minutes is standard)
3. **Test locally** before deploying changes
4. **Set CRON_SECRET** in production for security

