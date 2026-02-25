# Categories & SeatMaps Deprecation Plan

**Created:** February 25, 2026  
**Status:** Ready to Execute  
**Risk Level:** Low (data migration already complete)

## Executive Summary

The ticketing system has two legacy subsystems that add complexity without providing value:
- **Categories** - Legacy ticket typing system, fully superseded by `EventTicketType`
- **SeatMaps** - Allocated seating feature, never used in production

This plan removes both in a safe, sequenced manner.

## Current Data State (Verified Feb 25, 2026)

| Metric | Value | Implication |
|--------|-------|-------------|
| Tickets without `eventTicketTypeId` | **0** | ✅ No data migration needed |
| Events needing category migration | **0** | ✅ All 56 events already migrated |
| Events using seatmaps | **0** | ✅ Safe to remove immediately |
| Orders with seatmaps | **0** | ✅ No historical data dependency |
| Tickets with seatId | **0** | ✅ No historical data dependency |
| `EventTicketType.sold` accuracy | **34%** (61/180) | ⚠️ Must compute from Tickets |

---

## Phase 0: Pre-Deprecation Fixes (Do First)

### 0.1 Fix `sold` Column Drift

The `EventTicketType.sold` column is inaccurate (119/180 wrong). Two options:

**Option A: Deprecate `sold` entirely (Recommended)**
- Stop reading `sold` for availability checks
- Compute availability as: `capacity - COUNT(Ticket WHERE eventTicketTypeId = X AND Order.status IN ('PAID', 'PENDING'))`
- Keep column for now, remove in Phase 3

**Option B: Sync and maintain `sold`**
- Run sync script (below)
- Add transactional updates on every order/refund/cancel
- Higher maintenance burden, more bug surface

```sql
-- Sync script (run if choosing Option B)
UPDATE "EventTicketType" ett
SET sold = COALESCE(actual.cnt, 0)
FROM (
  SELECT t."eventTicketTypeId", COUNT(*) as cnt
  FROM "Ticket" t 
  JOIN "Order" o ON t."orderId" = o.id 
  WHERE o.status = 'PAID'
  GROUP BY t."eventTicketTypeId"
) actual
WHERE ett.id = actual."eventTicketTypeId";

-- Set remaining to 0
UPDATE "EventTicketType" 
SET sold = 0 
WHERE id NOT IN (
  SELECT DISTINCT "eventTicketTypeId" 
  FROM "Ticket" 
  WHERE "eventTicketTypeId" IS NOT NULL
);
```

### 0.2 Freeze Category Admin UI

Since all events are migrated, prevent drift by making category editing read-only:

**File:** `src/pages/admin/categories.tsx` (if exists)
**Action:** Add banner "Categories are deprecated. Use Ticket Types instead." and disable edit/create buttons.

### 0.3 API Compatibility Window

**File:** `src/pages/api/public/events.ts`

Add `ticketTypes` to response alongside `categories`, mark categories deprecated:

```typescript
// Before
return {
  categories: event.categories.map(...)
}

// After (transition period)
return {
  ticketTypes: event.ticketTypes.map(tt => ({
    id: tt.id,
    name: tt.name,
    price: tt.price,
    currency: tt.currency,
    available: tt.capacity ? tt.capacity - computeSold(tt.id) : null,
    isAvailable: tt.isActive && !isSoldOut(tt.id)
  })),
  categories: event.categories.map(...), // Keep for now
  _deprecated: {
    categories: "Use ticketTypes instead. Will be removed in next release."
  }
}
```

---

## Phase 1: Remove SeatMap Code (Low Risk)

SeatMaps have zero production usage. Remove completely.

### 1.1 Database Changes

**Migration file:** `prisma/migrations/YYYYMMDD_remove_seatmaps/migration.sql`

```sql
-- Drop SeatReservation table
DROP TABLE IF EXISTS "SeatReservation";

-- Drop SeatMap foreign keys
ALTER TABLE "Event" DROP CONSTRAINT IF EXISTS "Event_seatMapId_fkey";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_seatMapId_fkey";

-- Drop columns
ALTER TABLE "Event" DROP COLUMN IF EXISTS "seatMapId";
ALTER TABLE "Event" DROP COLUMN IF EXISTS "seatType";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "seatMapId";
ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "seatId";

-- Drop SeatMap table
DROP TABLE IF EXISTS "SeatMap";
```

**Prisma schema changes:** Remove from `schema.prisma`:
- `model SeatMap`
- `model SeatReservation`
- `Event.seatType`, `Event.seatMapId`, `Event.seatMap`
- `Order.seatMapId`, `Order.seatMap`
- `Ticket.seatId`
- `EventDate.seatReservations`

### 1.2 Code Removal

**Delete files:**
```
src/pages/seatselection/[eventDateId].tsx
src/pages/admin/events/seatmaps.tsx
src/pages/admin/events/seatmaps/index.tsx
src/pages/api/admin/seatmap/[id].ts
src/pages/api/admin/seatmap/index.ts
src/pages/api/admin/seatmap/preview/[id].ts
src/pages/api/seatmap_preview/[id].ts
src/components/seatselection/ (entire directory)
src/components/admin/SeatMapEditor/ (entire directory)
```

**Modify files:**

| File | Change |
|------|--------|
| `src/constants/serverUtil.ts` | Remove `getSeatMap()`, `isTicketOccupied()` seat logic, simplify `validateOrder()` |
| `src/constants/util.ts` | Remove `getSeatMap()`, `ticketsOccupied()`, `validateCategoriesWithSeatMap()` |
| `src/store/reducers/orderReducer.tsx` | Remove `seatId` from Ticket type |
| `src/pages/api/events.ts` | Remove seatMap includes |
| `src/pages/api/admin/events/[id].ts` | Remove seatMap handling |
| `src/components/admin/dialogs/ManageEventDialog.tsx` | Remove seatType/seatMap fields |

### 1.3 Simplified `validateOrder()`

Replace current implementation in `src/constants/serverUtil.ts`:

```typescript
export const validateOrder = async (
  tickets: TicketSelection[], 
  eventDateId: number,
  checkEventBookable: boolean = true
): Promise<[boolean, string | null]> => {
  
  // 1. Check event date exists
  const eventDate = await prisma.eventDate.findUnique({
    where: { id: eventDateId },
    include: { 
      event: { 
        include: { ticketTypes: true } 
      } 
    }
  });
  
  if (!eventDate) {
    return [false, "Event date not found"];
  }
  
  // 2. Check event is bookable (sale window)
  if (checkEventBookable && !eventDateIsBookable(eventDate)) {
    return [false, "Event is not currently bookable"];
  }
  
  // 3. Check requested ticket types exist and are active
  const requestedTypeIds = [...new Set(tickets.map(t => t.eventTicketTypeId))];
  const validTypeIds = eventDate.event.ticketTypes
    .filter(tt => tt.isActive)
    .map(tt => tt.id);
  
  const invalidTypes = requestedTypeIds.filter(id => !validTypeIds.includes(id));
  if (invalidTypes.length > 0) {
    return [false, `Invalid ticket types: ${invalidTypes.join(', ')}`];
  }
  
  // 4. Check capacity for each ticket type
  for (const typeId of requestedTypeIds) {
    const ticketType = eventDate.event.ticketTypes.find(tt => tt.id === typeId);
    const requestedQty = tickets.filter(t => t.eventTicketTypeId === typeId).length;
    
    if (ticketType.capacity !== null) {
      const currentSold = await prisma.ticket.count({
        where: {
          eventTicketTypeId: typeId,
          order: { status: { in: ['PAID', 'PENDING'] } }
        }
      });
      
      if (currentSold + requestedQty > ticketType.capacity) {
        return [false, `Insufficient capacity for ${ticketType.name}`];
      }
    }
  }
  
  // 5. Check EventDate.totalTicketLimit if set
  if (eventDate.totalTicketLimit !== null) {
    const totalSold = await prisma.ticket.count({
      where: {
        order: { 
          eventDateId: eventDateId,
          status: { in: ['PAID', 'PENDING'] } 
        }
      }
    });
    
    if (totalSold + tickets.length > eventDate.totalTicketLimit) {
      return [false, "Event is sold out"];
    }
  }
  
  return [true, null];
};
```

---

## Phase 2: Remove Category Code (Medium Risk)

Categories are more entangled but all data is migrated.

### 2.1 Database Changes

**Migration file:** `prisma/migrations/YYYYMMDD_remove_categories/migration.sql`

```sql
-- Drop CategoriesOnEvents junction table
DROP TABLE IF EXISTS "CategoriesOnEvents";

-- Drop Ticket.categoryId
ALTER TABLE "Ticket" DROP CONSTRAINT IF EXISTS "Ticket_categoryId_fkey";
ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "categoryId";

-- Drop Category table
DROP TABLE IF EXISTS "Category";

-- Drop DiscountCode.appliesToCategories (if still referencing)
ALTER TABLE "DiscountCode" DROP COLUMN IF EXISTS "appliesToCategories";
```

**Prisma schema changes:** Remove from `schema.prisma`:
- `model Category`
- `model CategoriesOnEvents`
- `Event.categories`
- `Ticket.categoryId`, `Ticket.category`
- `DiscountCode.appliesToCategories`

### 2.2 Code Removal

**Delete files:**
```
src/components/admin/CategorySelection.tsx
src/components/admin/CategoryMigrationPanel.tsx
src/pages/api/admin/category/[id].ts
src/pages/api/admin/category/index.ts
src/pages/api/admin/events/migrate-categories-to-ticket-types.ts
src/pages/admin/events/migrate-categories.tsx
```

**Modify files:**

| File | Change |
|------|--------|
| `src/constants/serverUtil.ts` | Remove `getCategoryTicketAmount()`, category validation in `validateOrder()` |
| `src/constants/util.ts` | Remove `calculateTotalPrice()` category fallback, `summarizeTicketAmount()` category logic |
| `src/components/booking/TicketSelection.tsx` | Use `eventTicketTypeId` only |
| `src/components/booking/UnifiedBookingPage.tsx` | Remove category mapping |
| `src/components/booking/PaymentSection.tsx` | Remove categoryId passing |
| `src/components/form/TicketNames.tsx` | Resolve names from EventTicketType |
| `src/components/PaymentOverview.tsx` | Use EventTicketType for display |
| `src/pages/api/events.ts` | Remove category includes |
| `src/pages/api/admin/events/[id].ts` | Remove category handling |
| `src/pages/api/admin/events/index.ts` | Remove category includes |
| `src/pages/api/discount/validate.ts` | Remove category-based discount logic |
| `src/lib/invoice.ts` | Use EventTicketType for line items |
| `src/lib/ticket.ts` | Remove category lookups |

### 2.3 Update Public API

**File:** `src/pages/api/public/events.ts`

Remove `categories` from response (after compatibility window):

```typescript
// Final state
return {
  id: event.id,
  title: event.title,
  // ... other fields
  ticketTypes: event.ticketTypes
    .filter(tt => tt.isPublic && tt.isActive)
    .map(tt => ({
      id: tt.id,
      name: tt.name,
      price: tt.price,
      currency: tt.currency,
      capacity: tt.capacity,
      available: computeAvailable(tt),
      isAvailable: computeAvailable(tt) > 0
    }))
  // NO categories field
};
```

---

## Phase 3: Cleanup (Low Risk)

### 3.1 Remove `EventTicketType.sold` Column (If Using Option A)

After confirming availability is computed correctly:

```sql
ALTER TABLE "EventTicketType" DROP COLUMN IF EXISTS "sold";
```

### 3.2 Make `Ticket.eventTicketTypeId` Required

```sql
ALTER TABLE "Ticket" ALTER COLUMN "eventTicketTypeId" SET NOT NULL;
```

Update Prisma schema:
```prisma
model Ticket {
  eventTicketTypeId Int  // Remove the ?
  // ...
}
```

### 3.3 Documentation Cleanup

Remove/update:
- `MUI_MIGRATION_TRACKER.md` category references
- `DOCUMENTATION_SUMMARY.md` 
- Any API docs referencing categories

---

## Testing Checklist

Run these tests before each phase deployment:

### Pre-Phase 1
- [ ] All events load in admin
- [ ] All events load on public site
- [ ] Ticket purchase flow works end-to-end

### Post-Phase 1 (SeatMaps Removed)
- [ ] Event creation works without seatType field
- [ ] Existing events still display correctly
- [ ] No 500 errors on any event page
- [ ] Ticket purchase still works

### Post-Phase 2 (Categories Removed)
- [ ] Buy tickets for EventTicketType A and B
- [ ] Verify availability decrements correctly
- [ ] Refund an order, verify capacity handling
- [ ] Discount codes still work (event-based, not category-based)
- [ ] Invoice generation shows correct ticket type names
- [ ] Admin order view shows correct ticket types
- [ ] Public API returns `ticketTypes` correctly

### Post-Phase 3 (Cleanup)
- [ ] `Ticket.eventTicketTypeId` constraint enforced
- [ ] No null eventTicketTypeId in any code path

---

## Rollback Plan

### Before Each Phase
1. Take Neon database snapshot
2. Tag git commit: `git tag pre-seatmap-removal` / `pre-category-removal`

### If Issues Arise
1. Revert git to tagged commit
2. Restore Neon snapshot
3. Redeploy previous version

---

## Execution Timeline

| Phase | Scope | Risk | Dependencies |
|-------|-------|------|--------------|
| **Phase 0** | Pre-fixes | Low | None |
| **Phase 1** | SeatMaps | Low | Phase 0 complete |
| **Phase 2** | Categories | Medium | Phase 1 complete, API compatibility window (1-2 weeks) |
| **Phase 3** | Cleanup | Low | Phase 2 verified in production |

**Recommended approach:** Execute Phase 0 and 1 together, wait 1-2 weeks with API compatibility, then execute Phase 2 and 3.

---

## Files Summary

### Files to Delete (17 files)
```
src/pages/seatselection/[eventDateId].tsx
src/pages/admin/events/seatmaps.tsx
src/pages/admin/events/seatmaps/index.tsx
src/pages/api/admin/seatmap/[id].ts
src/pages/api/admin/seatmap/index.ts
src/pages/api/admin/seatmap/preview/[id].ts
src/pages/api/seatmap_preview/[id].ts
src/components/seatselection/* (entire directory)
src/components/admin/SeatMapEditor/* (entire directory)
src/components/admin/CategorySelection.tsx
src/components/admin/CategoryMigrationPanel.tsx
src/pages/api/admin/category/[id].ts
src/pages/api/admin/category/index.ts
src/pages/api/admin/events/migrate-categories-to-ticket-types.ts
src/pages/admin/events/migrate-categories.tsx
```

### Files to Modify (20+ files)
```
prisma/schema.prisma
src/constants/serverUtil.ts
src/constants/util.ts
src/store/reducers/orderReducer.tsx
src/pages/api/events.ts
src/pages/api/public/events.ts
src/pages/api/admin/events/[id].ts
src/pages/api/admin/events/index.ts
src/pages/api/discount/validate.ts
src/components/admin/dialogs/ManageEventDialog.tsx
src/components/booking/TicketSelection.tsx
src/components/booking/UnifiedBookingPage.tsx
src/components/booking/PaymentSection.tsx
src/components/form/TicketNames.tsx
src/components/PaymentOverview.tsx
src/lib/invoice.ts
src/lib/ticket.ts
src/lib/services/ticketing/capacity.ts
```
