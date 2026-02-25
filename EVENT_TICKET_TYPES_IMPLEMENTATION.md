# Event Ticket Types Implementation Plan

## Overview
This document outlines the implementation of switching from global categories to per-event ticket types. This improves admin UX, pricing clarity, inventory control, and reporting by making each event own its own ticket types.

## 🚀 Implementation Status

### ✅ Completed
1. **Data Model Changes (Prisma)**
   - Added `EventTicketType` model to schema
   - Updated `Ticket` model with new fields and legacy support
   - Added proper indexes and constraints
   - Marked `Category` model as deprecated

2. **Backfill Script**
   - Created comprehensive migration script (`scripts/backfill-event-ticket-types.ts`)
   - Handles data mapping and validation
   - Includes verification and safety checks

3. **API Endpoints Structure**
   - Created admin CRUD endpoints for EventTicketTypes
   - Created public API endpoint for buyer flows
   - Note: These need Prisma migration to be functional

4. **Capacity Management Service**
   - Created service for atomic capacity reservation (`src/lib/services/ticketing/capacity.ts`)
   - Uses raw SQL queries to avoid Prisma client issues during migration
   - Support for transfers and cancellations

5. **Admin UI Components**
   - Created `EventTicketTypesPanel` for managing ticket types within events
   - Drag-and-drop reordering with react-beautiful-dnd
   - Inline editing, duplication, and soft deletion
   - Template-based creation from global categories
   - Color coding and capacity visualization

6. **Order Management System**
   - Created `orderService.ts` for EventTicketType-based order creation
   - Atomic capacity reservation and release
   - Support for price overrides and discount codes
   - Ticket transfer functionality between types

7. **New Order Creation Flow**
   - Created `CreateOrderWithTicketTypes` component
   - Real-time capacity validation
   - Dynamic pricing with overrides
   - Customer information management
   - Multiple payment method support

### 🔄 Next Steps Required
1. **Run Prisma Migration**
   ```bash
   npx prisma migrate dev --name event-ticket-types
   ```

2. **Execute Backfill Script**
   ```bash
   npx ts-node scripts/backfill-event-ticket-types.ts
   ```

3. **Test APIs and UI Components**
   - Verify endpoint functionality after migration
   - Test capacity management
   - Validate admin UI ticket type management

4. **Integrate with Existing Admin Pages**
   - Add EventTicketTypesPanel to event editor
   - Replace old order creation with new flow
   - Update event management workflows

### 📋 Pending
- Integration with existing admin event editor
- Email template updates for new ticket types
- Reporting system updates
- Buyer UI updates (if needed)
- Testing and deployment
- Legacy system cleanup

## 🗄️ Database Schema Changes

### New Model: EventTicketType
```prisma
model EventTicketType {
  id           Int       @id @default(autoincrement())
  eventId      Int
  event        Event     @relation(fields: [eventId], references: [id], onDelete: Cascade)
  name         String
  description  String?
  price        Int       // minor units (e.g., pence)
  currency     String    @default("GBP")
  capacity     Int?      // null means unlimited
  sold         Int       @default(0) // denormalised counter
  isActive     Boolean   @default(true)
  sortOrder    Int       @default(0)
  colorHex     String?   // optional UI accent
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  tickets      Ticket[]

  @@unique([eventId, name]) // prevents duplicate labels within the same event
  @@index([eventId])
}
```

### Updated Model: Ticket
```prisma
model Ticket {
  // ... existing fields ...
  
  // Legacy fields (DEPRECATED after migration)
  category           Category?           @relation(fields: [categoryId], references: [id])
  categoryId         Int?                // DEPRECATED after migration
  
  // New fields
  eventTicketType    EventTicketType?    @relation(fields: [eventTicketTypeId], references: [id], onDelete: SetNull)
  eventTicketTypeId  Int?
  
  // Price snapshots (immutable after sale)
  priceCharged       Int?                // Price charged in minor units (pence)
  currency           String              @default("GBP")
  taxCharged         Int                 @default(0)
  feeCharged         Int                 @default(0)
  
  // ... other fields ...
  
  @@index([eventTicketTypeId])
}
```

## 🔧 Migration Steps

### 1. Generate and Run Migration
```bash
npx prisma migrate dev --name event-ticket-types
```

### 2. Execute Backfill Script
```bash
npx ts-node scripts/backfill-event-ticket-types.ts
```

### 3. Verify Migration
The backfill script includes comprehensive verification:
- Total EventTicketTypes created
- Total tickets updated
- Price snapshots backfilled
- Sold counters accuracy

## 📡 API Endpoints

### Admin Management
- `GET /api/admin/events/[eventId]/ticket-types` - List ticket types
- `POST /api/admin/events/[eventId]/ticket-types` - Create ticket type
- `PUT /api/admin/events/[eventId]/ticket-types/[id]` - Update ticket type
- `DELETE /api/admin/events/[eventId]/ticket-types/[id]` - Delete ticket type

### Public Access
- `GET /api/public/events/[eventId]/ticket-types` - Get available ticket types for buyers

### Order Management
- `POST /api/admin/orders/create-with-ticket-types` - Create orders with new ticket types

**Note**: These endpoints are created but need the Prisma migration to be functional.

## 🎯 Key Features

### Capacity Management
- **Atomic Operations**: Prevents overselling with race condition protection
- **Real-time Updates**: Sold counters update immediately
- **Transfer Support**: Move tickets between types with capacity adjustment

### Admin UI Features
- **Drag & Drop Reordering**: Intuitive ticket type management
- **Inline Editing**: Quick updates without page navigation
- **Template System**: Create from global category templates
- **Visual Indicators**: Color coding and capacity status
- **Soft Deletion**: Preserve historical data

### Order Creation Features
- **Real-time Validation**: Capacity checks during order creation
- **Price Overrides**: Admin flexibility for special pricing
- **Dynamic Totals**: Live calculation with discounts
- **Multiple Payment Methods**: Stripe, invoice, POS, payment links

### Validation
- **Unique Names**: No duplicate ticket type names within an event
- **Capacity Limits**: Cannot set capacity below sold amount
- **Price Validation**: Non-negative prices in minor units
- **Color Validation**: Valid hex color codes

### Business Logic
- **Soft Delete**: Inactive ticket types instead of hard deletion
- **Price Snapshots**: Immutable pricing after sale
- **Sort Order**: Configurable display order
- **Status Management**: Active/inactive ticket types

## 🚧 Implementation Notes

### Raw SQL Usage
The capacity service uses raw SQL queries to avoid Prisma client issues during the migration period. Once the migration is complete and Prisma client is regenerated, these can be converted to proper Prisma queries.

### Legacy Support
- `categoryId` remains nullable during migration
- Existing tickets maintain their category references
- Gradual migration path without breaking existing functionality

### Performance Considerations
- Denormalized `sold` counter for quick availability checks
- Proper indexing on `eventId` and `eventTicketTypeId`
- Batch capacity checks for multiple ticket types

## 🧪 Testing Strategy

### Unit Tests
- Capacity reservation and release
- Price snapshot immutability
- Validation rules

### Integration Tests
- API endpoint CRUD operations
- Capacity management under concurrent load
- Migration script verification

### Manual Testing
- Admin UI ticket type management
- Order creation with new ticket types
- Capacity limits enforcement

## 🚀 Deployment Plan

### Phase 1: Schema Migration
1. Deploy schema changes
2. Run backfill script
3. Verify data integrity

### Phase 2: API Deployment
1. Deploy new API endpoints
2. Test with existing admin flows
3. Monitor for errors

### Phase 3: UI Integration
1. Deploy admin ticket type management
2. Update order creation flows
3. Test end-to-end functionality

### Phase 4: Legacy Cleanup
1. Remove category-based code paths
2. Drop deprecated columns
3. Update documentation

## 🔍 Monitoring and Rollback

### Success Metrics
- No overselling incidents
- Consistent sold counters
- Successful ticket type operations
- Performance within acceptable limits

### Rollback Plan
- Feature flags for new functionality
- Database rollback scripts
- Gradual migration with fallback paths

## 📚 Documentation Updates Needed

- Admin user guide for ticket type management
- API documentation for new endpoints
- Migration guide for existing events
- Troubleshooting for capacity issues

## 🎯 Immediate Next Steps

1. **Run Migration**: Execute Prisma migration to create tables
2. **Execute Backfill**: Run the migration script to populate data
3. **Test APIs**: Verify endpoint functionality
4. **Integrate Admin UI**: Add ticket type management to event editor
5. **Update Order Flow**: Replace old order creation with new system
6. **Deploy Incrementally**: Phase-based rollout
7. **Monitor and Optimize**: Performance and error monitoring

## ⚠️ Current Limitations

- **Prisma Client**: The new models won't be available until migration is run
- **API Endpoints**: Created but need database tables to function
- **Capacity Service**: Uses raw SQL to work around Prisma client limitations

## 🔧 Files Created/Modified

### New Files
- `scripts/backfill-event-ticket-types.ts` - Migration script
- `src/pages/api/admin/events/[eventId]/ticket-types/index.ts` - Admin CRUD
- `src/pages/api/admin/events/[eventId]/ticket-types/[ticketTypeId].ts` - Individual management
- `src/pages/api/public/events/[eventId]/ticket-types.ts` - Public API
- `src/pages/api/admin/orders/create-with-ticket-types.ts` - New order creation
- `src/lib/services/ticketing/capacity.ts` - Capacity management service
- `src/lib/services/ticketing/orderService.ts` - Order management service
- `src/components/admin/events/EventTicketTypesPanel.tsx` - Ticket type management UI
- `src/components/admin/orders/CreateOrderWithTicketTypes.tsx` - New order creation UI

### Modified Files
- `prisma/schema.prisma` - Added EventTicketType model and updated Ticket model

## 🎨 UI Components Overview

### EventTicketTypesPanel
- **Drag & Drop Interface**: Reorder ticket types with visual feedback
- **Inline Management**: Add, edit, duplicate, and deactivate ticket types
- **Template Integration**: Create from global category templates
- **Capacity Visualization**: Real-time availability display
- **Color Coding**: Visual distinction between ticket types

### CreateOrderWithTicketTypes
- **Dynamic Ticket Selection**: Choose from event-specific ticket types
- **Real-time Validation**: Capacity checks during order creation
- **Price Override Support**: Admin flexibility for special pricing
- **Customer Management**: Comprehensive customer information
- **Order Summary**: Live calculation with discounts

---

*This implementation provides a complete foundation for per-event ticket management. The next step is to run the Prisma migration to make the new models available and then integrate the UI components into the existing admin system.*
