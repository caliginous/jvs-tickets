# Seed File Analysis & Modernization Plan

## Current Seed File Issues

### Missing from `prisma/seed.ts`:
1. **EventTicketType** - Modern ticket system (currently only legacy categories)
2. **Venue** - Events need venues (all live events have venues)
3. **AdminUser** - No admin users with proper permissions
4. **DiscountCode** - No discount codes for testing
5. **EmailSettings** - No email configuration
6. **EmailTemplate** - No email templates (separate script exists but outdated)
7. **Proper slugs** - Events need slugs for URLs
8. **OrderItems** - Modern order system uses OrderItems, not direct tickets
9. **Event descriptions and bespoke messages** - Missing modern event fields
10. **Proper Options** - Only has invoice number, missing email settings

### Schema Evolution Issues:
1. **Legacy vs Modern Tickets**: Live data shows mix of Categories (legacy) and EventTicketType (modern)
2. **Order Structure**: Current seed creates tickets directly, but live orders use OrderItems → EventTicketType
3. **Price Format**: Prices in pence (e.g., 1000 = £10.00), not pounds
4. **Missing Relations**: Many new relationships not represented

## Live Data Insights

### Key Statistics:
- **37 Events** (mostly free seating with venues)
- **10 EventTicketTypes** (modern system, prices 200-1500 pence)
- **17 Categories** (legacy system, still in use)
- **2 Venues** (JVS main location + TBC)
- **5 AdminUsers** (all with full permissions)
- **3 DiscountCodes** (percentage type, 20-90% off)
- **501 Orders** (mix of PAID/PENDING, mostly Stripe)
- **8 EmailTemplates** (complete set)

### Permission Structure:
All admin users have identical comprehensive permissions:
- EventManagement, UserManagement, OrderManagement
- CategoryManagement, SeatMapManagement, LocalizationManagement
- OptionsManagement, TaskManagement, NotificationManagement
- ApiKeyManagement, EmailManagement, Orders
- EventSeatMaps, Options, EventCategories, Translation

### Event Patterns:
- Most events use "free" seating (not seatmap)
- All events have venues (mainly JVS Finchley Road)
- All events have slugs
- Mix of free and paid events
- Event titles often include dates

### Ticket Pricing Patterns:
- Standard tickets: £2-£10 (200-1000 pence)
- Supporter tickets: £5-£15 (500-1500 pence)
- Young person discounts: £2-£5 (200-500 pence)
- Free events use £0 categories

## Modernization Plan

### 1. Create Comprehensive Base Data
- Admin users with proper permissions
- Venues (JVS main + flexible venue)
- Email settings and templates
- System options
- Discount codes

### 2. Create Realistic Events
- Mix of free and paid events
- Both legacy categories and modern ticket types
- Proper slugs and descriptions
- Venue associations
- Event dates in past/present/future

### 3. Create Realistic Orders
- Use modern OrderItems structure
- Mix of payment types (stripe, pending, paid)
- Some with discount codes
- Realistic user data (anonymized)
- Proper order statuses

### 4. Maintain Backward Compatibility
- Keep some legacy categories for testing
- Support both old and new ticket systems
- Ensure existing APIs still work











