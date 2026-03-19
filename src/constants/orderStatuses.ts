/**
 * Canonical order status definitions
 *
 * Order.status expresses financial/lifecycle state.
 * Capacity is derived from status PLUS inventory-release state
 * (Order.inventoryReturnedToPool).
 *
 * IMPORTANT: PENDING orders reserve capacity because checkout creates
 * PENDING orders with tickets. If we didn't count them, we'd oversell
 * during high-concurrency checkout. The cleanup cron expires abandoned
 * PENDING orders after 20 minutes, releasing their capacity.
 */

export const ALWAYS_CAPACITY_RESERVED_STATUSES = [
  'CONFIRMED',
  'PAID',
  'COMPLETED',
  'PARTIALLY_REFUNDED',
  'PENDING',
] as const;

export const ALWAYS_CAPACITY_RELEASED_STATUSES = [
  'FAILED',
  'EXPIRED',
] as const;

export const CONDITIONAL_CAPACITY_STATUSES = [
  'REFUNDED',
  'CANCELLED',
] as const;

// Legacy aliases – callers that only need the always-reserved list
// (e.g. Prisma queries that don't yet account for conditional statuses)
// can still import this. New code should use buildCapacityConsumingOrderWhere
// or orderConsumesCapacity instead.
export const CAPACITY_RESERVED_STATUSES = ALWAYS_CAPACITY_RESERVED_STATUSES;
export const CAPACITY_RELEASED_STATUSES = ALWAYS_CAPACITY_RELEASED_STATUSES;

export const ALL_ORDER_STATUSES = [
  ...ALWAYS_CAPACITY_RESERVED_STATUSES,
  ...ALWAYS_CAPACITY_RELEASED_STATUSES,
  ...CONDITIONAL_CAPACITY_STATUSES,
] as const;

export type OrderStatus = (typeof ALL_ORDER_STATUSES)[number];
export type CapacityReservedStatus = (typeof ALWAYS_CAPACITY_RESERVED_STATUSES)[number];
export type CapacityReleasedStatus = (typeof ALWAYS_CAPACITY_RELEASED_STATUSES)[number];
export type ConditionalCapacityStatus = (typeof CONDITIONAL_CAPACITY_STATUSES)[number];

export const CAPACITY_RESERVED_STATUSES_ARRAY = [...ALWAYS_CAPACITY_RESERVED_STATUSES] as string[];

/**
 * Determine whether an order consumes capacity, accounting for gated
 * inventory release on REFUNDED / CANCELLED orders.
 */
export function orderConsumesCapacity(order: {
  status: string;
  inventoryReturnedToPool?: boolean | null;
}): boolean {
  if ((ALWAYS_CAPACITY_RESERVED_STATUSES as readonly string[]).includes(order.status)) {
    return true;
  }

  if ((ALWAYS_CAPACITY_RELEASED_STATUSES as readonly string[]).includes(order.status)) {
    return false;
  }

  if ((CONDITIONAL_CAPACITY_STATUSES as readonly string[]).includes(order.status)) {
    return !order.inventoryReturnedToPool;
  }

  return false;
}

/**
 * Check if an order status reserves capacity (legacy helper).
 * Does NOT account for gated inventory on conditional statuses.
 * Prefer orderConsumesCapacity() for full accuracy.
 */
export function reservesCapacity(status: string): boolean {
  return (ALWAYS_CAPACITY_RESERVED_STATUSES as readonly string[]).includes(status);
}

/**
 * Check if an order status always releases capacity.
 */
export function releasesCapacity(status: string): boolean {
  return (ALWAYS_CAPACITY_RELEASED_STATUSES as readonly string[]).includes(status);
}
