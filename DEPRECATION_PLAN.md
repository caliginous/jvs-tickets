# Categories & SeatMaps Deprecation Plan

**Created:** February 25, 2026  
**Status:** Ready to Execute  
**Risk Level:** Low (SeatMaps) / Medium (Categories - code entanglement)

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
| Discount codes using categories | **0** | ✅ All `appliesToCategories` are empty |
| Stale PENDING orders | **0** | ✅ No phantom capacity locks |

### Order Status Distribution
```
CONFIRMED          1,255
PAID                 201
EXPIRED               34
REFUNDED              27
FAILED                 9
CANCELLED              4
PARTIALLY_REFUNDED     3
```

---

## Phase 0: Pre-Deprecation Fixes (Do First)

### 0.1 Define Canonical Order Statuses

**Create new file:** `src/constants/orderStatuses.ts`

```typescript
/**
 * Canonical order status definitions
 * 
 * These statuses determine capacity reservation behavior.
 * Use these constants everywhere - never hardcode status strings.
 */

// Statuses that reserve capacity (block availability)
export const CAPACITY_RESERVED_STATUSES = [
  'CONFIRMED',      // Payment confirmed via webhook
  'PAID',           // Marked paid manually (legacy)
  'PARTIALLY_REFUNDED', // Still has valid tickets
] as const;

// Statuses that release capacity (inventory returns to pool)
export const CAPACITY_RELEASED_STATUSES = [
  'CANCELLED',
  'REFUNDED', 
  'FAILED',
  'EXPIRED',
] as const;

// All valid statuses
export const ALL_ORDER_STATUSES = [
  ...CAPACITY_RESERVED_STATUSES,
  ...CAPACITY_RELEASED_STATUSES,
  'PENDING', // Not counted - short-lived during checkout
] as const;

export type OrderStatus = typeof ALL_ORDER_STATUSES[number];
export type CapacityReservedStatus = typeof CAPACITY_RESERVED_STATUSES[number];
export type CapacityReleasedStatus = typeof CAPACITY_RELEASED_STATUSES[number];

/**
 * Check if an order status reserves capacity
 */
export function reservesCapacity(status: string): boolean {
  return (CAPACITY_RESERVED_STATUSES as readonly string[]).includes(status);
}

/**
 * Check if an order status releases capacity
 */
export function releasesCapacity(status: string): boolean {
  return (CAPACITY_RELEASED_STATUSES as readonly string[]).includes(status);
}
```

**Note on PENDING:** Currently 0 stale PENDING orders exist. PENDING is not counted against capacity because:
1. Checkout is fast (Stripe hosted checkout)
2. No expiry cleanup exists - counting PENDING would cause phantom capacity locks
3. If this changes, add PENDING to reserved statuses AND implement `cleanup-expired-orders` cron

### 0.2 Centralized Availability Computation

**Create new file:** `src/lib/services/ticketing/availability.ts`

```typescript
import prisma from '../../prisma';
import { CAPACITY_RESERVED_STATUSES } from '../../../constants/orderStatuses';

export interface TicketTypeAvailability {
  eventTicketTypeId: number;
  name: string;
  price: number;
  currency: string;
  capacity: number | null;
  sold: number;
  available: number | null; // null = unlimited
  isSoldOut: boolean;
  isActive: boolean;
}

export interface EventAvailability {
  eventDateId: number;
  totalLimit: number | null;
  totalSold: number;
  totalAvailable: number | null;
  ticketTypes: TicketTypeAvailability[];
}

/**
 * Compute availability for an event date
 * 
 * This is the SINGLE SOURCE OF TRUTH for availability.
 * Use this everywhere: validateOrder, public API, admin dashboards.
 */
export async function computeAvailability(eventDateId: number): Promise<EventAvailability> {
  // Get event date with ticket types
  const eventDate = await prisma.eventDate.findUnique({
    where: { id: eventDateId },
    include: {
      event: {
        include: {
          ticketTypes: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' }
          }
        }
      }
    }
  });

  if (!eventDate) {
    throw new Error(`EventDate ${eventDateId} not found`);
  }

  // Get sold counts per ticket type in ONE query (not a loop)
  const soldCounts = await prisma.ticket.groupBy({
    by: ['eventTicketTypeId'],
    where: {
      eventTicketTypeId: { not: null },
      order: {
        eventDateId: eventDateId,
        status: { in: [...CAPACITY_RESERVED_STATUSES] }
      }
    },
    _count: { id: true }
  });

  // Build lookup map
  const soldByType = new Map<number, number>();
  for (const row of soldCounts) {
    if (row.eventTicketTypeId !== null) {
      soldByType.set(row.eventTicketTypeId, row._count.id);
    }
  }

  // Calculate total sold across all types
  const totalSold = Array.from(soldByType.values()).reduce((sum, count) => sum + count, 0);

  // Calculate per-type availability, clamped by global limit
  const globalLimit = eventDate.totalTicketLimit;
  const globalRemaining = globalLimit !== null ? globalLimit - totalSold : null;

  const ticketTypes: TicketTypeAvailability[] = eventDate.event.ticketTypes.map(tt => {
    const sold = soldByType.get(tt.id) || 0;
    
    // Per-type available (null if no per-type capacity)
    let typeAvailable: number | null = null;
    if (tt.capacity !== null) {
      typeAvailable = Math.max(0, tt.capacity - sold);
    }

    // Clamp by global availability
    let available = typeAvailable;
    if (globalRemaining !== null) {
      if (available === null) {
        available = globalRemaining;
      } else {
        available = Math.min(available, globalRemaining);
      }
    }

    return {
      eventTicketTypeId: tt.id,
      name: tt.name,
      price: tt.price,
      currency: tt.currency,
      capacity: tt.capacity,
      sold,
      available,
      isSoldOut: available !== null && available <= 0,
      isActive: tt.isActive
    };
  });

  return {
    eventDateId,
    totalLimit: globalLimit,
    totalSold,
    totalAvailable: globalRemaining !== null ? Math.max(0, globalRemaining) : null,
    ticketTypes
  };
}

/**
 * Check if specific quantities can be reserved
 * Returns { success: true } or { success: false, error: string }
 */
export async function checkCapacityForOrder(
  eventDateId: number,
  items: Array<{ eventTicketTypeId: number; quantity: number }>
): Promise<{ success: true } | { success: false; error: string; details?: Record<number, number> }> {
  
  const availability = await computeAvailability(eventDateId);
  
  // Check global capacity
  const totalRequested = items.reduce((sum, item) => sum + item.quantity, 0);
  if (availability.totalAvailable !== null && totalRequested > availability.totalAvailable) {
    return {
      success: false,
      error: `Only ${availability.totalAvailable} tickets available for this event`
    };
  }

  // Check per-type capacity
  const insufficientTypes: Record<number, number> = {};
  for (const item of items) {
    const typeAvailability = availability.ticketTypes.find(
      tt => tt.eventTicketTypeId === item.eventTicketTypeId
    );

    if (!typeAvailability) {
      return {
        success: false,
        error: `Ticket type ${item.eventTicketTypeId} not found or not active`
      };
    }

    if (typeAvailability.available !== null && item.quantity > typeAvailability.available) {
      insufficientTypes[item.eventTicketTypeId] = typeAvailability.available;
    }
  }

  if (Object.keys(insufficientTypes).length > 0) {
    const typeNames = await prisma.eventTicketType.findMany({
      where: { id: { in: Object.keys(insufficientTypes).map(Number) } },
      select: { id: true, name: true }
    });
    
    const messages = typeNames.map(tt => 
      `${tt.name}: ${insufficientTypes[tt.id]} available`
    );
    
    return {
      success: false,
      error: `Insufficient capacity: ${messages.join(', ')}`,
      details: insufficientTypes
    };
  }

  return { success: true };
}
```

### 0.3 Deprecate `EventTicketType.sold` Column

Instead of syncing the `sold` column, stop reading it entirely. The `computeAvailability()` function above computes sold from Tickets.

**Do NOT run sync script** - it creates maintenance burden.

**Update all code that reads `sold`:**
- Replace `tt.sold` with call to `computeAvailability()` 
- Or add `computeSold(eventTicketTypeId)` helper for one-off cases

### 0.4 Freeze Category Admin UI

**Locate category admin entry points:**
```bash
grep -r "category\|Category" src/pages/admin --include="*.tsx" -l
```

**For each file found:**
1. Add deprecation banner at top of page
2. Disable create/edit/delete buttons
3. Keep read-only viewing for reference

**Add server-side guard** to prevent mutations via API:

**File:** `src/pages/api/admin/category/index.ts`
```typescript
// At top of POST handler
if (req.method === 'POST') {
  return res.status(410).json({ 
    error: 'Category creation is deprecated. Use Event Ticket Types instead.',
    migrationGuide: '/admin/events/ticket-types'
  });
}
```

**File:** `src/pages/api/admin/category/[id].ts`
```typescript
// At top of PUT/DELETE handlers
if (req.method === 'PUT' || req.method === 'DELETE') {
  return res.status(410).json({ 
    error: 'Category modification is deprecated. Use Event Ticket Types instead.',
    migrationGuide: '/admin/events/ticket-types'
  });
}
```

### 0.5 API Compatibility Window

**File:** `src/pages/api/public/events.ts`

```typescript
import { computeAvailability } from '../../lib/services/ticketing/availability';

// In the response mapping:
const eventsWithAvailability = await Promise.all(
  events.map(async (event) => {
    // Get availability for first event date (or specific date if needed)
    const eventDateId = event.dates[0]?.id;
    const availability = eventDateId 
      ? await computeAvailability(eventDateId)
      : null;

    return {
      id: event.id,
      title: event.title,
      // ... other fields ...
      
      // NEW: ticketTypes with computed availability
      ticketTypes: availability?.ticketTypes
        .filter(tt => tt.isActive)
        .map(tt => ({
          id: tt.eventTicketTypeId,
          name: tt.name,
          price: tt.price,
          currency: tt.currency,
          capacity: tt.capacity,
          available: tt.available,
          isAvailable: !tt.isSoldOut
        })) ?? [],
      
      // DEPRECATED: categories (remove after 2 weeks)
      categories: event.categories.map(c => ({
        id: c.category.id,
        name: c.category.label,
        price: c.category.price,
        // Bridge field for integrators
        _migratedToTicketTypeId: findMatchingTicketType(c.category.id, availability)
      })),
      
      // Deprecation notice
      _deprecated: {
        categories: 'Use ticketTypes instead. Will be removed 2026-03-11.'
      },
      
      // Version signal
      _apiVersion: 2
    };
  })
);

function findMatchingTicketType(categoryId: number, availability: EventAvailability | null): number | null {
  // Try to find matching ticket type by name/price for bridge mapping
  // This is best-effort for integrators
  return null; // Implement if needed
}
```

---

## Phase 1: Remove SeatMap Code (Low Risk)

SeatMaps have zero production usage. Remove completely.

### 1.1 Pre-Removal Checklist

Before merging, do repo-wide search and verify each reference is handled:

```bash
# Run these searches and check every result
grep -r "SeatMap" src/ --include="*.ts" --include="*.tsx"
grep -r "SeatReservation" src/ --include="*.ts" --include="*.tsx"
grep -r "seatMapId" src/ --include="*.ts" --include="*.tsx"
grep -r "seatType" src/ --include="*.ts" --include="*.tsx"
grep -r "seatselection" src/ --include="*.ts" --include="*.tsx"
grep -r "seatId" src/ --include="*.ts" --include="*.tsx"
grep -r "include.*seatMap" src/ --include="*.ts" --include="*.tsx"
```

### 1.2 Database Changes

**Migration file:** `prisma/migrations/YYYYMMDD_remove_seatmaps/migration.sql`

```sql
-- Drop SeatReservation table first (has FK to EventDate)
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

**CRITICAL:** Update `prisma/schema.prisma` in the SAME deploy:

Remove:
```prisma
model SeatMap { ... }
model SeatReservation { ... }
```

Remove from Event:
```prisma
seatType       String        // DELETE
seatMapId      Int?          // DELETE
seatMap        SeatMap?      // DELETE
```

Remove from Order:
```prisma
seatMapId      Int?          // DELETE
seatMap        SeatMap?      // DELETE
```

Remove from Ticket:
```prisma
seatId         Int?          // DELETE
```

Remove from EventDate:
```prisma
seatReservations    SeatReservation[]  // DELETE
```

### 1.3 Code Removal

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
| `src/constants/serverUtil.ts` | Remove `getSeatMap()`, remove seat checks from `validateOrder()` |
| `src/constants/util.ts` | Remove `getSeatMap()`, `ticketsOccupied()`, `validateCategoriesWithSeatMap()` |
| `src/store/reducers/orderReducer.tsx` | Remove `seatId` from Ticket type |
| `src/pages/api/events.ts` | Remove `include: { seatMap: true }` |
| `src/pages/api/admin/events/[id].ts` | Remove seatMap handling |
| `src/components/admin/dialogs/ManageEventDialog.tsx` | Remove seatType/seatMap form fields |
| `src/components/admin/dialogs/ManageEventDialog.schema.ts` | Remove seatType validation |

### 1.4 Simplified `validateOrder()`

**File:** `src/constants/serverUtil.ts`

Replace current implementation:

```typescript
import { computeAvailability, checkCapacityForOrder } from '../lib/services/ticketing/availability';
import { eventDateIsBookable } from './util';

export interface TicketSelection {
  eventTicketTypeId: number;
  quantity: number;
}

export interface ValidationResult {
  success: boolean;
  error?: string;
  userMessage?: string; // Safe for frontend display
}

export const validateOrder = async (
  items: TicketSelection[], 
  eventDateId: number,
  checkEventBookable: boolean = true
): Promise<ValidationResult> => {
  
  // 1. Check event date exists
  const eventDate = await prisma.eventDate.findUnique({
    where: { id: eventDateId },
    include: { event: true }
  });
  
  if (!eventDate) {
    console.error(`[validateOrder] EventDate ${eventDateId} not found`);
    return { 
      success: false, 
      error: 'Event date not found',
      userMessage: 'This event is no longer available'
    };
  }
  
  // 2. Check event is bookable (sale window)
  if (checkEventBookable && !eventDateIsBookable(eventDate)) {
    return { 
      success: false, 
      error: 'Event not in sale window',
      userMessage: 'Ticket sales are not currently open for this event'
    };
  }
  
  // 3. Validate ticket types exist and are active
  const requestedTypeIds = [...new Set(items.map(t => t.eventTicketTypeId))];
  const validTypes = await prisma.eventTicketType.findMany({
    where: { 
      id: { in: requestedTypeIds },
      eventId: eventDate.event.id,
      isActive: true
    }
  });
  
  const validTypeIds = new Set(validTypes.map(tt => tt.id));
  const invalidTypes = requestedTypeIds.filter(id => !validTypeIds.has(id));
  
  if (invalidTypes.length > 0) {
    console.error(`[validateOrder] Invalid ticket types: ${invalidTypes.join(', ')}`);
    return { 
      success: false, 
      error: `Invalid ticket types: ${invalidTypes.join(', ')}`,
      userMessage: 'Some selected ticket types are no longer available'
    };
  }
  
  // 4. Check capacity using centralized availability
  const capacityCheck = await checkCapacityForOrder(eventDateId, items);
  if (!capacityCheck.success) {
    console.error(`[validateOrder] Capacity check failed: ${capacityCheck.error}`);
    return {
      success: false,
      error: capacityCheck.error,
      userMessage: capacityCheck.error // This message is already user-safe
    };
  }
  
  return { success: true };
};
```

---

## Phase 2: Remove Category Code (Medium Risk)

Categories are more entangled but all data is migrated.

### 2.1 Pre-Removal Verification

Run preflight checks before migration:

```sql
-- Verify no tickets depend solely on categoryId
SELECT COUNT(*) as orphaned_tickets
FROM "Ticket" 
WHERE "categoryId" IS NOT NULL 
  AND "eventTicketTypeId" IS NULL;
-- Must return 0

-- Verify no discount codes use categories
SELECT COUNT(*) as category_discounts
FROM "DiscountCode"
WHERE array_length("appliesToCategories", 1) > 0;
-- Must return 0
```

### 2.2 Database Changes

**Migration file:** `prisma/migrations/YYYYMMDD_remove_categories/migration.sql`

```sql
-- Drop CategoriesOnEvents junction table
DROP TABLE IF EXISTS "CategoriesOnEvents";

-- Drop Ticket.categoryId
ALTER TABLE "Ticket" DROP CONSTRAINT IF EXISTS "Ticket_categoryId_fkey";
ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "categoryId";

-- Drop Category table
DROP TABLE IF EXISTS "Category";

-- Drop DiscountCode.appliesToCategories
ALTER TABLE "DiscountCode" DROP COLUMN IF EXISTS "appliesToCategories";
```

**Prisma schema changes:** Remove from `schema.prisma`:
- `model Category`
- `model CategoriesOnEvents`
- `Event.categories`
- `Ticket.categoryId`, `Ticket.category`
- `DiscountCode.appliesToCategories`

### 2.3 Code Removal

**Delete files:**
```
src/components/admin/CategorySelection.tsx
src/components/admin/CategoryMigrationPanel.tsx
src/pages/api/admin/category/[id].ts
src/pages/api/admin/category/index.ts
src/pages/api/admin/events/migrate-categories-to-ticket-types.ts
src/pages/admin/events/migrate-categories.tsx
src/lib/validators/orderValidator.ts  # Uses categories
```

**Modify files:**

| File | Change |
|------|--------|
| `src/constants/serverUtil.ts` | Remove `getCategoryTicketAmount()` |
| `src/constants/util.ts` | Remove category fallback in `calculateTotalPrice()`, remove `summarizeTicketAmount()` category logic |
| `src/components/booking/TicketSelection.tsx` | Use `eventTicketTypeId` only |
| `src/components/booking/UnifiedBookingPage.tsx` | Remove category mapping |
| `src/components/booking/PaymentSection.tsx` | Remove categoryId passing |
| `src/components/form/TicketNames.tsx` | Resolve names from EventTicketType |
| `src/components/PaymentOverview.tsx` | Use EventTicketType for display |
| `src/pages/api/events.ts` | Remove category includes |
| `src/pages/api/public/events.ts` | Remove categories from response |
| `src/pages/api/admin/events/[id].ts` | Remove category handling |
| `src/pages/api/admin/events/index.ts` | Remove category includes |
| `src/pages/api/discount/validate.ts` | Remove category-based discount logic (already unused) |
| `src/lib/invoice.ts` | Use EventTicketType for line items |
| `src/lib/ticket.ts` | Remove category lookups |
| `src/lib/services/ticketing/orderService.ts` | Remove category references |

### 2.4 Update Public API (Final)

**File:** `src/pages/api/public/events.ts`

Remove `categories` and `_deprecated` fields:

```typescript
return {
  id: event.id,
  title: event.title,
  // ... other fields ...
  ticketTypes: availability?.ticketTypes
    .filter(tt => tt.isActive)
    .map(tt => ({
      id: tt.eventTicketTypeId,
      name: tt.name,
      price: tt.price,
      currency: tt.currency,
      capacity: tt.capacity,
      available: tt.available,
      isAvailable: !tt.isSoldOut
    })) ?? [],
  _apiVersion: 2
  // NO categories field
  // NO _deprecated field
};
```

---

## Phase 3: Cleanup (Low Risk)

### 3.1 Remove `EventTicketType.sold` Column

After confirming availability is computed correctly in production:

```sql
ALTER TABLE "EventTicketType" DROP COLUMN IF EXISTS "sold";
```

Update Prisma schema - remove `sold Int @default(0)` from EventTicketType.

### 3.2 Make `Ticket.eventTicketTypeId` Required

**Preflight check (must pass before migration):**
```sql
SELECT COUNT(*) FROM "Ticket" WHERE "eventTicketTypeId" IS NULL;
-- Must return 0
```

**Migration:**
```sql
ALTER TABLE "Ticket" ALTER COLUMN "eventTicketTypeId" SET NOT NULL;
```

**Update Prisma schema:**
```prisma
model Ticket {
  eventTicketTypeId Int  // Remove the ?
  // ...
}
```

**Verify all write paths:**
- `src/pages/api/order/store.ts`
- `src/pages/api/admin/order/create-simple.ts`
- `src/pages/api/admin/orders/create-with-ticket-types.ts`
- `src/pages/api/free-event/register.ts`
- `src/lib/services/ticketing/orderService.ts`

### 3.3 Documentation Cleanup

Remove/update:
- `MUI_MIGRATION_TRACKER.md` category references
- `DOCUMENTATION_SUMMARY.md`
- API documentation

---

## Testing Checklist

### Pre-Phase 1
- [ ] All events load in admin
- [ ] All events load on public site
- [ ] Ticket purchase flow works end-to-end
- [ ] `computeAvailability()` returns correct numbers

### Post-Phase 1 (SeatMaps Removed)
- [ ] Event creation works without seatType field
- [ ] Existing events still display correctly
- [ ] No 500 errors on any event page
- [ ] Ticket purchase still works
- [ ] No `seatMap` references in any Prisma query

### Post-Phase 2 (Categories Removed)
- [ ] Buy tickets for EventTicketType A and B
- [ ] Verify availability decrements correctly
- [ ] Refund an order, verify capacity returns to pool only if intended
- [ ] All discount modes work:
  - [ ] Per-event discount
  - [ ] Global percentage discount
  - [ ] Fixed amount discount
  - [ ] Usage limits enforced
- [ ] Invoice generation shows correct ticket type names
- [ ] Admin order view shows correct ticket types
- [ ] Public API returns only `ticketTypes` (no `categories`)

### Post-Phase 3 (Cleanup)
- [ ] `Ticket.eventTicketTypeId` NOT NULL constraint enforced
- [ ] No null eventTicketTypeId in any code path
- [ ] All ticket creation paths set eventTicketTypeId

### Additional Critical Tests
- [ ] **Stale pending test:** Create order, leave PENDING, confirm it doesn't block capacity forever
- [ ] **Refund + return-to-pool:** Refund should not accidentally reopen sales without admin action (if business process requires)
- [ ] **API compatibility snapshot:** During window, both `categories` and `ticketTypes` exist; after, only `ticketTypes`

---

## Rollback Plan

### Before Each Phase
1. Take Neon database snapshot: `neon branch create --name pre-phase-X-backup`
2. Tag git commit: `git tag pre-seatmap-removal` / `pre-category-removal`

### If Issues Arise
1. Revert git to tagged commit: `git revert HEAD~N` or `git reset --hard <tag>`
2. Restore Neon snapshot
3. Redeploy previous version

---

## Execution Timeline

| Phase | Scope | Risk | Dependencies |
|-------|-------|------|--------------|
| **Phase 0** | Pre-fixes (statuses, availability, freeze UI) | Low | None |
| **Phase 1** | Remove SeatMaps | Low | Phase 0 complete |
| **Phase 2** | Remove Categories | Medium | Phase 1 complete + 2-week API window |
| **Phase 3** | Cleanup (sold column, NOT NULL) | Low | Phase 2 verified in production |

**Recommended approach:** 
1. Execute Phase 0 immediately
2. Execute Phase 1 in same deploy as Phase 0
3. Wait 2 weeks for API compatibility
4. Execute Phase 2
5. Wait 1 week, verify production
6. Execute Phase 3

---

## Files Summary

### New Files to Create (Phase 0)
```
src/constants/orderStatuses.ts
src/lib/services/ticketing/availability.ts
```

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
src/lib/validators/orderValidator.ts
```

### Files to Modify (25+ files)
```
prisma/schema.prisma
src/constants/serverUtil.ts
src/constants/util.ts
src/store/reducers/orderReducer.tsx
src/pages/api/events.ts
src/pages/api/public/events.ts
src/pages/api/admin/events/[id].ts
src/pages/api/admin/events/index.ts
src/pages/api/admin/category/index.ts (freeze mutations)
src/pages/api/admin/category/[id].ts (freeze mutations)
src/pages/api/discount/validate.ts
src/components/admin/dialogs/ManageEventDialog.tsx
src/components/admin/dialogs/ManageEventDialog.schema.ts
src/components/booking/TicketSelection.tsx
src/components/booking/UnifiedBookingPage.tsx
src/components/booking/PaymentSection.tsx
src/components/form/TicketNames.tsx
src/components/PaymentOverview.tsx
src/lib/invoice.ts
src/lib/ticket.ts
src/lib/services/ticketing/capacity.ts
src/lib/services/ticketing/orderService.ts
```
