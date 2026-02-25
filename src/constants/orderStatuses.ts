/**
 * Canonical order status definitions
 *
 * These statuses determine capacity reservation behavior.
 * Use these constants everywhere - never hardcode status strings.
 * 
 * IMPORTANT: PENDING orders reserve capacity because checkout creates
 * PENDING orders with tickets. If we didn't count them, we'd oversell
 * during high-concurrency checkout. The cleanup cron expires abandoned
 * PENDING orders after 20 minutes, releasing their capacity.
 */

// Statuses that reserve capacity (block availability)
export const CAPACITY_RESERVED_STATUSES = [
  'CONFIRMED', // Payment confirmed via Stripe webhook
  'PAID', // Marked paid manually by admin
  'COMPLETED', // Legacy status from WooCommerce imports - tickets are valid
  'PARTIALLY_REFUNDED', // Money refunded, but tickets remain valid
  'PENDING', // Checkout in progress - holds capacity until payment or expiry
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
] as const;

export type OrderStatus = (typeof ALL_ORDER_STATUSES)[number];
export type CapacityReservedStatus = (typeof CAPACITY_RESERVED_STATUSES)[number];
export type CapacityReleasedStatus = (typeof CAPACITY_RELEASED_STATUSES)[number];

// Array version for Prisma queries: status: { in: CAPACITY_RESERVED_STATUSES_ARRAY }
export const CAPACITY_RESERVED_STATUSES_ARRAY = [...CAPACITY_RESERVED_STATUSES] as string[];

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
