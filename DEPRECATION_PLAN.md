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
  'CONFIRMED',      // Payment confirmed via Stripe webhook
  'PAID',           // Marked paid manually by admin - see deprecation note below
  'PARTIALLY_REFUNDED', // Money refunded, but tickets remain valid (see note below)
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

// ============================================================================
// MAINTENANCE NOTE: The Prisma schema uses String for Order.status, not an enum.
// If new statuses are added to the codebase, update this file.
//
// INVARIANT: Every status MUST be categorised as either reserved or released.
// A status that is in neither list is a bug - it means capacity calculations
// will silently ignore those orders. When adding a new status, decide:
//   - Does it hold tickets? → Add to CAPACITY_RESERVED_STATUSES
//   - Are tickets released? → Add to CAPACITY_RELEASED_STATUSES
// There is no "neutral" option. Defaulting to neither is always wrong.
// 
// Consider adding a unit test that queries all distinct statuses from the DB
// and asserts they're all in ALL_ORDER_STATUSES:
//
//   const dbStatuses = await prisma.order.findMany({
//     select: { status: true },
//     distinct: ['status']
//   });
//   for (const { status } of dbStatuses) {
//     expect(ALL_ORDER_STATUSES).toContain(status);
//   }
// ============================================================================
```

**Note on PENDING:** Currently 0 stale PENDING orders exist. PENDING is not counted against capacity because:
1. Checkout is fast (Stripe hosted checkout)
2. No expiry cleanup exists - counting PENDING would cause phantom capacity locks
3. If this changes, add PENDING to reserved statuses AND implement `cleanup-expired-orders` cron

**Note on PAID vs CONFIRMED:**

Data shows PAID is actively used (201 orders, latest today) - it's set by:
- Stripe webhook (`webhook/stripe.ts`) on checkout.session.completed
- Admin "Mark as Paid" flow (`/api/admin/order/paid.ts`, `/api/admin/order/bulk-mark-paid.ts`)
- Admin order creation with `manual_paid` payment method

CONFIRMED is set by:
- Free event registration (`/api/free-event/register.ts`)
- CSV imports (`/api/admin/import/execute.ts`)
- Legacy orders from WooCommerce import

Both are legitimate statuses. No deprecation needed, but code should prefer `CONFIRMED` for new automated flows.

**Note on PARTIALLY_REFUNDED:**

Current refund behavior (verified in `/api/admin/refund/index.ts`):
- Refunds adjust the order's `finalTotal` field
- Tickets remain as database rows - they are NOT deleted
- Order status changes to `PARTIALLY_REFUNDED` or `REFUNDED`

**Decision: PARTIALLY_REFUNDED does NOT release ticket capacity.**

Rationale: Partial refunds in this codebase are "money adjustment only" (e.g., price negotiation, service recovery). The ticket holders still attend the event. If a future feature needs to release individual tickets on partial refund, it must either:
1. Delete the refunded tickets, or
2. Add per-ticket status (e.g., `Ticket.status = 'CANCELLED'`)

For now, the model is consistent: all tickets on PARTIALLY_REFUNDED orders still count against capacity.

**Note on REFUNDED:**

Full refunds (REFUNDED status) DO release capacity, but the ticket rows remain in the database for audit purposes. The availability computation filters by order status, not ticket existence.

### 0.2 Centralized Availability Computation

**Availability Rules (plain English):**
- Capacity is counted per **Ticket row**, filtered by `Order.status` in `CAPACITY_RESERVED_STATUSES`.
- Tickets are **never deleted** for refunds; refunds affect counting via Order status only.
- Do NOT use `EventTicketType.sold` - it's unreliable. Always compute from Tickets.

**Create new file:** `src/lib/services/ticketing/availability.ts`

```typescript
// File: src/lib/services/ticketing/availability.ts
// Verify these import paths match your project structure before copy-pasting
import prisma from '@/lib/prisma';
import { CAPACITY_RESERVED_STATUSES } from '@/constants/orderStatuses';

// If your project doesn't use path aliases, use relative paths:
// import prisma from '../../prisma';
// import { CAPACITY_RESERVED_STATUSES } from '../../../constants/orderStatuses';

export interface TicketTypeAvailability {
  eventTicketTypeId: number;
  name: string;
  price: number;
  currency: string;
  capacity: number | null;
  sold: number;
  available: number | null; // null = unlimited
  isSoldOut: boolean;
  // Note: isActive is NOT included. This function only returns active ticket types.
  // Admin pages that need to display inactive types should use a separate function
  // (e.g., computeAvailabilityAdmin) that includes { isActive: false } types.
}

export interface EventAvailability {
  eventDateId: number;
  totalLimit: number | null;
  totalSold: number;
  totalAvailable: number | null;
  globalRemaining: number | null; // Same as totalAvailable, explicit for clarity
  ticketTypes: TicketTypeAvailability[];
}

/**
 * Compute availability for an event date
 * 
 * This is the SINGLE SOURCE OF TRUTH for availability numbers.
 * Use this everywhere: validateOrder, public API, admin dashboards.
 * 
 * IMPORTANT: This function assumes ticket types exist and are active (via where filter).
 * validateOrder() performs the "does this ticket type exist?" check separately,
 * BEFORE calling checkCapacityForOrder(), to provide better error messages.
 * Don't refactor that check into this function - you'd lose the distinction between
 * "ticket type doesn't exist" and "ticket type exists but is sold out".
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

  // SAFETY CHECK: Detect any tickets with null eventTicketTypeId that would be miscounted.
  // Currently 0 exist (verified), but this catches future regressions.
  const nullTypeTickets = await prisma.ticket.count({
    where: {
      eventTicketTypeId: null,
      order: {
        eventDateId: eventDateId,
        status: { in: [...CAPACITY_RESERVED_STATUSES] }
      }
    }
  });
  
  if (nullTypeTickets > 0) {
    console.error(
      `[computeAvailability] CRITICAL: ${nullTypeTickets} tickets with null eventTicketTypeId ` +
      `for eventDateId=${eventDateId}. These are NOT being counted in availability!`
    );
    // In production, you might want to throw or alert here
    // For now, log loudly so monitoring can catch it
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

  // ROBUST totalSold: Use separate count query constrained only by eventDateId + reserved statuses.
  // This stays correct even if weird rows with null eventTicketTypeId appear.
  const totalSoldResult = await prisma.ticket.count({
    where: {
      order: {
        eventDateId: eventDateId,
        status: { in: [...CAPACITY_RESERVED_STATUSES] }
      }
    }
  });
  const totalSold = totalSoldResult;

  // Calculate per-type availability, clamped by global limit
  const globalLimit = eventDate.totalTicketLimit;
  const globalRemaining = globalLimit !== null ? Math.max(0, globalLimit - totalSold) : null;

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
      isSoldOut: available !== null && available <= 0
    };
  });

  return {
    eventDateId,
    totalLimit: globalLimit,
    totalSold,
    totalAvailable: globalRemaining,
    globalRemaining, // Explicit field for UI clarity
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
// At top of handler, before any logic
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET is allowed (read-only viewing during transition)
  if (req.method === 'GET') {
    // Keep existing GET logic unchanged - just ensure it returns
    return existingGetHandler(req, res);
  }
  
  // All mutation methods are deprecated
  if (req.method === 'POST') {
    return res.status(410).json({ 
      error: 'Category creation is deprecated. Use Event Ticket Types instead.',
      migrationGuide: '/admin/events/ticket-types'
    });
  }
  
  // Reject any other methods
  res.setHeader('Allow', 'GET');
  return res.status(405).json({ error: 'Method not allowed' });
}
```

**File:** `src/pages/api/admin/category/[id].ts`
```typescript
// At top of handler, before any logic
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET is allowed (read-only viewing during transition)
  if (req.method === 'GET') {
    // Keep existing GET logic unchanged - just ensure it returns
    return existingGetHandler(req, res);
  }
  
  // All mutation methods are deprecated
  if (req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
    return res.status(410).json({ 
      error: 'Category modification is deprecated. Use Event Ticket Types instead.',
      migrationGuide: '/admin/events/ticket-types'
    });
  }
  
  // Reject any other methods
  res.setHeader('Allow', 'GET');
  return res.status(405).json({ error: 'Method not allowed' });
}
```

**HTTP status code rationale:**
- `410 Gone` - Resource (mutation capability) existed but is now permanently unavailable
- `405 Method Not Allowed` - For truly unsupported methods (HEAD, OPTIONS, etc.)

**Note on sequencing:** These API files (`category/index.ts`, `category/[id].ts`) are frozen here in Phase 0.4, then deleted in Phase 2.3. The freeze prevents drift during the compatibility window - if someone tries to edit categories via the admin UI or API, they get a clear error instead of succeeding and creating data we'd need to migrate again.

### 0.5 API Compatibility Window

**File:** `src/pages/api/public/events.ts`

```typescript
import { computeAvailability, EventAvailability } from '../../lib/services/ticketing/availability';

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
      
      // Global availability - use this for "X remaining overall" display
      availability: availability ? {
        globalRemaining: availability.globalRemaining,
        totalSold: availability.totalSold,
        totalLimit: availability.totalLimit
      } : null,
      
      // NEW: ticketTypes with computed availability
      // NOTE: Each type's `available` is clamped by globalRemaining.
      // If globalRemaining=5 and two types have unlimited capacity,
      // both will show available=5. This is mathematically correct
      // (user can pick 5 of either), but UI should show globalRemaining
      // separately to avoid confusion.
      ticketTypes: availability?.ticketTypes.map(tt => ({
        id: tt.eventTicketTypeId,
        name: tt.name,
        price: tt.price,
        currency: tt.currency,
        capacity: tt.capacity,
        sold: tt.sold,
        available: tt.available, // Clamped by both type capacity AND global limit
        availableByTypeOnly: tt.capacity !== null 
          ? Math.max(0, tt.capacity - tt.sold) 
          : null, // Raw type-level availability, before global clamp
        isAvailable: !tt.isSoldOut
      })) ?? [],
      
      // DEPRECATED: categories (remove after 2 weeks)
      categories: event.categories.map(c => ({
        id: c.category.id,
        name: c.category.label,
        price: c.category.price,
        // Bridge field for integrators - maps to the EventTicketType that replaced this category
        _migratedToTicketTypeId: findMatchingTicketType(c.category, availability)
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

/**
 * Find the EventTicketType that corresponds to a migrated category.
 * 
 * Migration logic (from migrate-categories-to-ticket-types.ts):
 * - category.label → ticketType.name
 * - category.price (pounds) → ticketType.price (pence, via Math.round(price * 100))
 * 
 * Matching strategy:
 * 1. Exact name match (case-insensitive, trimmed)
 * 2. If multiple matches, also match on price
 * 3. If still ambiguous or no match, return null and log
 */
function findMatchingTicketType(
  category: { id: number; label: string; price: number },
  availability: EventAvailability | null
): number | null {
  if (!availability || availability.ticketTypes.length === 0) {
    return null;
  }

  const normalizedCategoryName = category.label.trim().toLowerCase();
  const categoryPriceInPence = Math.round(category.price * 100);

  // Find all ticket types with matching name
  const nameMatches = availability.ticketTypes.filter(
    tt => tt.name.trim().toLowerCase() === normalizedCategoryName
  );

  if (nameMatches.length === 0) {
    console.warn(
      `[findMatchingTicketType] No ticket type found for category "${category.label}" (id=${category.id})`
    );
    return null;
  }

  if (nameMatches.length === 1) {
    return nameMatches[0].eventTicketTypeId;
  }

  // Multiple name matches - narrow by price
  const priceMatches = nameMatches.filter(tt => tt.price === categoryPriceInPence);

  if (priceMatches.length === 1) {
    return priceMatches[0].eventTicketTypeId;
  }

  if (priceMatches.length === 0) {
    // Multiple name matches but no price match - ambiguous, don't guess
    console.warn(
      `[findMatchingTicketType] Ambiguous: ${nameMatches.length} ticket types match name "${category.label}" ` +
      `but none match price £${category.price}. Returning null to avoid incorrect mapping.`
    );
    return null;
  }

  // Multiple price matches too - ambiguous, don't guess
  console.warn(
    `[findMatchingTicketType] Ambiguous: ${priceMatches.length} ticket types match both name "${category.label}" ` +
    `and price £${category.price}. Returning null to avoid incorrect mapping.`
  );
  return null;
}
```

**Performance Note:**

The current implementation runs `computeAvailability()` for each event, which is **4 queries per event**:
1. `findUnique` - eventDate with ticket types
2. `count` - null eventTicketTypeId safety check
3. `groupBy` - sold counts per ticket type
4. `count` - robust totalSold

With 56 events, this is ~224 queries. Acceptable short-term, but won't scale.

**Post-Phase 3 cleanup:** After `Ticket.eventTicketTypeId` becomes NOT NULL, remove the null safety check query (#2 above) - it can't happen anymore.

**Short-term mitigation (optional):**

In-memory caching may help if the serverless runtime reuses instances across requests. It won't help within a single request (each eventDateId is unique). Skip this unless you see actual performance issues.

```typescript
// May reduce queries if serverless instance is reused across requests.
// Not guaranteed - some platforms spawn fresh instances per request.
const availabilityCache = new Map<number, { data: EventAvailability; expires: number }>();
const CACHE_TTL_MS = 60_000; // 60 seconds

async function getCachedAvailability(eventDateId: number): Promise<EventAvailability> {
  const now = Date.now();
  const cached = availabilityCache.get(eventDateId);
  
  if (cached && cached.expires > now) {
    return cached.data;
  }
  
  const data = await computeAvailability(eventDateId);
  availabilityCache.set(eventDateId, { data, expires: now + CACHE_TTL_MS });
  return data;
}
```

This is "nice-to-have" for the compatibility window. Given it's temporary, you can also skip caching entirely and accept the query load.

**Long-term options (implement if events grow significantly):**
1. Add `?include=availability` query param - only compute when requested
2. Bulk availability query - single grouped query across all eventDateIds
3. Accept eventual consistency - availability doesn't need millisecond accuracy

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

**Recommended approach:** Let Prisma generate the migration SQL:
1. Edit `prisma/schema.prisma` (remove models/fields listed below)
2. Run `npx prisma migrate dev --name remove_seatmaps`
3. Review the generated SQL in `prisma/migrations/`

This ensures constraint names match your environment. Hand-written SQL (shown below for reference) may fail if FK constraint names differ between dev and prod.

**Hand-written migration (for reference):** `prisma/migrations/YYYYMMDD_remove_seatmaps/migration.sql`

```sql
-- Drop SeatReservation table first (has FK to EventDate)
DROP TABLE IF EXISTS "SeatReservation";

-- Drop SeatMap foreign keys
-- NOTE: Constraint names may differ. Use Prisma-generated migration to be safe.
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
  // Note: eventDate.eventId is available directly - no need to include event relation
  const eventDate = await prisma.eventDate.findUnique({
    where: { id: eventDateId }
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
  // eventDateIsBookable only needs the eventDate fields (ticketSaleStartDate, ticketSaleEndDate, date)
  if (checkEventBookable && !eventDateIsBookable(eventDate)) {
    return { 
      success: false, 
      error: 'Event not in sale window',
      userMessage: 'Ticket sales are not currently open for this event'
    };
  }
  
  // 3. Validate ticket types exist and are active
  // Use eventDate.eventId directly - no extra query needed
  const requestedTypeIds = [...new Set(items.map(t => t.eventTicketTypeId))];
  const validTypes = await prisma.eventTicketType.findMany({
    where: { 
      id: { in: requestedTypeIds },
      eventId: eventDate.eventId, // Direct field access, no join
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

**API Usage Check (if telemetry available):**

If you have request logging (Vercel Analytics, custom logs, etc.), check for any requests to category endpoints in the past 2 weeks:

```sql
-- Example query if you have a request_logs table
SELECT path, COUNT(*) as hits
FROM request_logs
WHERE path LIKE '%/api/%category%'
  AND timestamp > NOW() - INTERVAL '14 days'
GROUP BY path;
```

If you don't have telemetry, the 2-week compatibility window with `_deprecated` notices should surface any external dependencies. Monitor for support requests during that window.

**Code Write Path Check:**

Before dropping `categoryId` column, verify no code still writes to it:

```bash
# Starting point - search for categoryId in API and service layers
grep -rn "categoryId" src/pages/api src/lib/services --include="*.ts" --include="*.tsx"
```

This is heuristic. Manually inspect each match for:
- `categoryId:` in Prisma `create`/`update` data blocks
- `.categoryId =` assignments
- `data: { ... categoryId` patterns

Any write paths must be removed before the migration.

**Runtime sanity check (optional):** For one release before Phase 2, add a warning log in ticket creation:

```typescript
// In order creation API
if (ticketData.categoryId) {
  console.warn(`[DEPRECATION] categoryId provided in ticket creation - this field will be removed. Order: ${orderId}`);
}
```

This catches any hidden code paths or external integrations still sending categoryId.

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
  // Note: No .filter(tt => tt.isActive) needed - computeAvailability only returns active types
  ticketTypes: availability?.ticketTypes.map(tt => ({
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

### 3.3 Remove Null Ticket Type Safety Check

After Phase 3.2 is deployed and verified, the `nullTypeTickets` check in `computeAvailability()` can never trigger (the column is NOT NULL). Remove it to save one query per call:

**File:** `src/lib/services/ticketing/availability.ts`

Delete this block:
```typescript
// SAFETY CHECK: Detect any tickets with null eventTicketTypeId...
const nullTypeTickets = await prisma.ticket.count({
  where: {
    eventTicketTypeId: null,
    // ...
  }
});

if (nullTypeTickets > 0) {
  console.error(...);
}
```

This reduces `computeAvailability()` from 4 queries to 3.

### 3.4 Documentation Cleanup

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
- [ ] Full refund: verify capacity is released (order becomes REFUNDED, tickets no longer counted)
- [ ] Partial refund: verify capacity is NOT released (tickets still count, only money adjusted)
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
- [ ] **Null ticket type detection:** Create a ticket with null eventTicketTypeId (manually in DB), verify error is logged by `computeAvailability()`
- [ ] **API compatibility snapshot:** During window, both `categories` and `ticketTypes` exist; after, only `ticketTypes`
- [ ] **Global vs per-type display:** Verify UI shows `globalRemaining` separately when multiple unlimited ticket types share a global limit

### Refund Behavior (Documented, Not Changing)

**Current behavior is intentional and will NOT change in this deprecation:**

| Refund Type | Order Status | Capacity Released? | Reason |
|-------------|--------------|-------------------|--------|
| Full refund | `REFUNDED` | Yes | Tickets no longer valid |
| Partial refund | `PARTIALLY_REFUNDED` | No | Money adjustment only, tickets remain valid |

The "return-to-pool gating" feature (admin must explicitly release refunded tickets) is **not implemented** and is **out of scope** for this deprecation. It should be handled separately as part of waitlist/inventory management features.

If future business requirements need partial refunds to release some tickets:
1. Add `Ticket.status` field (e.g., 'ACTIVE', 'CANCELLED')
2. Update refund flow to mark specific tickets as CANCELLED
3. Update `computeAvailability()` to filter by ticket status

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

**Phase 1 (SeatMaps):**
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
```

**Phase 2 (Categories):**
```
src/components/admin/CategorySelection.tsx
src/components/admin/CategoryMigrationPanel.tsx
src/pages/api/admin/category/[id].ts      # Frozen in Phase 0.4, deleted here
src/pages/api/admin/category/index.ts     # Frozen in Phase 0.4, deleted here
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
src/pages/api/admin/category/index.ts     # Phase 0.4: freeze mutations; Phase 2.3: delete
src/pages/api/admin/category/[id].ts      # Phase 0.4: freeze mutations; Phase 2.3: delete
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
