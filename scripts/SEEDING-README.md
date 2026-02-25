# 🌱 JVS Tessera - Modern Database Seeding

## Overview

The seed files have been completely modernized to match the current database schema and provide realistic development data based on live system analysis.

## ⚠️ Important Notes

- **NEVER run these seeds on production** - they will overwrite existing data
- **Only use on development/test environments**
- All user data is anonymized using generic names
- Admin passwords are simple for development (change in production)

## 🚀 Quick Start

### Full Database Reset & Seed
```bash
npm run seed:comprehensive
```
This will:
1. Reset the entire database 
2. Run comprehensive seeding
3. Add email templates
4. Show login credentials

### Modern Seed Only (Keep Existing Data)
```bash
npm run seed:modern
```

### Email Templates Only
```bash
npm run seed:emails-only
```

## 📋 What Gets Created

### 👥 Admin Users (3)
- `admin@jvs.org.uk` / `admin123` - Full admin access
- `dev@jvs.org.uk` / `dev123` - Development user  
- `test@jvs.org.uk` / `test123` - Testing user

All users have complete permissions including the new `Translation` permission.

### 🏢 Venues (3)
- **JVS Community Hall - Main Location** - Primary venue with full address
- **JVS Garden Space** - Outdoor venue for gardening events
- **To Be Confirmed** - Flexible venue option

### 🏷️ Ticket Categories (8 - Legacy System)
- Free Entry (£0)
- Standard Entry (£5, £10, £15, £20) 
- Supporter Ticket (£25)
- Child Entry (£8)
- Young Person (£12)

### 🎭 Events (6)
1. **Community Gardening Workshop** - Paid event with modern ticket types
2. **Rosh Hashanah Community Dinner** - Premium event with bespoke message
3. **Sustainable Fashion Workshop** - Standard paid event
4. **Free Community Lunch** - Free event using legacy categories
5. **Young JVS Meet-up** - Youth-focused event
6. **Theater Evening with Assigned Seating** - Seatmap event

### 🎫 EventTicketTypes (Modern System)
- Realistic pricing in pence (500 = £5.00)
- Multiple ticket types per event (Standard, Supporter, Young Person, etc.)
- Proper capacity limits
- Active/inactive states

### 💰 Discount Codes (3)
- `WELCOME20` - 20% off for new members
- `STUDENT50` - 50% off for students  
- `EARLYBIRD` - £5 off early bookings

### 📋 Orders (50)
- Anonymized user data with realistic UK addresses
- Mix of payment types: Stripe, Pending, Invoice
- Various statuses: PAID, PENDING, CANCELLED
- Some orders include discount codes
- Mix of legacy categories and modern ticket types

### 📧 Email Templates (8)
Updated with modern features:
- **Welcome** - User onboarding
- **Booking Confirmation** - Includes `{{event.bespoke.message}}` token
- **Payment Link - Stripe** - Secure payment processing
- **Payment Failed** - Error handling
- **Refund Processed** - Refund notifications
- **Event Reminder** - Pre-event reminders with bespoke messages
- **Password Reset** - Account recovery
- **Booking Cancellation** - Cancellation notices

### ⚙️ System Options (6)
- Invoice numbering
- Payment currency (GBP)
- Email app settings
- Support contact information

### 📧 Email Settings
- SMTP configuration template
- Sender information
- App base URL settings

## 🔄 Migration from Old Seed

The old seed file has been:
- ✅ Backed up to `prisma/seed-legacy-backup.ts`
- ✅ Replaced with deprecation warning
- ✅ Updated to prevent accidental execution

### Key Improvements
- **Modern Schema Compliance** - Supports all new tables and fields
- **Realistic Data** - Based on live system analysis
- **Anonymized Users** - Generic names instead of faker random data
- **Complete Permissions** - All admin users have full access
- **Event Slugs** - Proper URL generation
- **Mixed Ticket Systems** - Both legacy and modern approaches
- **Email Token Support** - Includes `{{event.bespoke.message}}` and other new tokens

## 🧪 Testing the Seeded Data

### Admin Access
1. Visit `/admin`
2. Login with any admin credentials above
3. Navigate through all admin sections to verify permissions

### Event System
1. Check `/` homepage for event listings
2. Verify event slugs work: `/events/[slug]`
3. Test booking flow with different ticket types
4. Try discount codes during checkout

### Email Templates
1. Go to `/admin/email`
2. Test templates with sample data
3. Verify new `{{event.bespoke.message}}` token works
4. Send test emails

### Order Management  
1. Check `/admin/orders` for realistic order data
2. Verify different payment types display correctly
3. Test order filtering and search

## 📁 File Structure

```
scripts/
├── seed-email-templates-modern.js     # Updated email templates
├── run-comprehensive-seed.js           # Complete seeding orchestrator
├── analyze-live-data.js               # Live data analysis tool
├── live-data-analysis.json           # Analysis results
└── SEEDING-README.md                  # This file

prisma/
├── seed-modern.ts                     # New comprehensive seed
├── seed.ts                           # Deprecated (shows warning)
└── seed-legacy-backup.ts             # Original seed backup
```

## 🐛 Troubleshooting

### Common Issues

**"bcrypt" not found**
```bash
npm install bcrypt @types/bcrypt
```

**Database connection errors**
- Check `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Verify database exists

**Permission errors**
- Ensure you're in the `tessera-main` directory
- Check file permissions on scripts
- Try `chmod +x scripts/run-comprehensive-seed.js`

**Prisma generate errors**
```bash
npx prisma generate
```

### Getting Help

1. Check the console output for specific error messages
2. Verify all dependencies are installed: `npm install`
3. Ensure database migrations are up to date: `npx prisma migrate dev`
4. Try running components individually:
   - Main seed: `npx ts-node --compiler-options {"module":"CommonJS"} prisma/seed-modern.ts`
   - Email templates: `node scripts/seed-email-templates-modern.js`

## 🔄 Updating Seeds

To modify the seeded data:

1. **Events**: Edit the `eventData` array in `prisma/seed-modern.ts`
2. **Email Templates**: Modify templates in `scripts/seed-email-templates-modern.js`
3. **Users/Venues**: Update the respective sections in `seed-modern.ts`
4. **Quantities**: Adjust loop counters (e.g., change 50 orders to different number)

After making changes, run `npm run seed:comprehensive` to test.

---

**Created**: Based on live system analysis of 37 events, 501 orders, and current schema  
**Last Updated**: March 2025  
**Compatibility**: Tessera v2+ with modern EventTicketType system











