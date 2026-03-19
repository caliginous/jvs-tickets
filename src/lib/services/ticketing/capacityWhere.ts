import {
  ALWAYS_CAPACITY_RESERVED_STATUSES,
  CONDITIONAL_CAPACITY_STATUSES,
} from '../../../constants/orderStatuses';

/**
 * Build a Prisma `where` clause matching orders that currently consume capacity
 * for a given eventDateId.
 *
 * Capacity-consuming orders are:
 *  - Always-reserved statuses (CONFIRMED, PAID, COMPLETED, PARTIALLY_REFUNDED, PENDING)
 *  - Conditional statuses (REFUNDED, CANCELLED) where inventoryReturnedToPool is false
 */
export function buildCapacityConsumingOrderWhere(eventDateId: number) {
  return {
    eventDateId,
    OR: capacityConsumingStatusFilter(),
  };
}

/**
 * The status OR-filter portion only (no eventDateId constraint).
 * Use when you need to embed the capacity logic inside a broader query.
 */
export function capacityConsumingStatusFilter() {
  return [
    {
      status: {
        in: [...ALWAYS_CAPACITY_RESERVED_STATUSES] as string[],
      },
    },
    {
      status: { in: [...CONDITIONAL_CAPACITY_STATUSES] as string[] },
      inventoryReturnedToPool: false,
    },
  ];
}
