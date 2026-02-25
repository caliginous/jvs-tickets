/**
 * Availability Computation Service
 *
 * This is the SINGLE SOURCE OF TRUTH for ticket availability.
 * Use this everywhere: validateOrder, public API, admin dashboards.
 *
 * Availability Rules:
 * - Capacity is counted per Ticket row, filtered by Order.status in CAPACITY_RESERVED_STATUSES
 * - Tickets are never deleted for refunds; refunds affect counting via Order status only
 * - Do NOT use EventTicketType.sold - it's unreliable. Always compute from Tickets.
 *
 * IMPORTANT: This function assumes ticket types exist and are active (via where filter).
 * validateOrder() performs the "does this ticket type exist?" check separately,
 * BEFORE calling checkCapacityForOrder(), to provide better error messages.
 * Don't refactor that check into this function - you'd lose the distinction between
 * "ticket type doesn't exist" and "ticket type exists but is sold out".
 */

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
 */
export async function computeAvailability(
  eventDateId: number
): Promise<EventAvailability> {
  // Get event date with ticket types
  const eventDate = await prisma.eventDate.findUnique({
    where: { id: eventDateId },
    include: {
      event: {
        include: {
          ticketTypes: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  });

  if (!eventDate) {
    throw new Error(`EventDate ${eventDateId} not found`);
  }

  // Get sold counts per ticket type in ONE query (not a loop)
  // Note: eventTicketTypeId is now NOT NULL (Phase 3.2), so no null filtering needed
  const soldCounts = await prisma.ticket.groupBy({
    by: ['eventTicketTypeId'],
    where: {
      order: {
        eventDateId: eventDateId,
        status: { in: [...CAPACITY_RESERVED_STATUSES] },
      },
    },
    _count: { id: true },
  });

  // Build lookup map (eventTicketTypeId is now NOT NULL, no null check needed)
  const soldByType = new Map<number, number>();
  for (const row of soldCounts) {
    soldByType.set(row.eventTicketTypeId, row._count.id);
  }

  // ROBUST totalSold: Use separate count query constrained only by eventDateId + reserved statuses.
  // This stays correct even if weird rows with null eventTicketTypeId appear.
  const totalSold = await prisma.ticket.count({
    where: {
      order: {
        eventDateId: eventDateId,
        status: { in: [...CAPACITY_RESERVED_STATUSES] },
      },
    },
  });

  // Calculate per-type availability, clamped by global limit
  const globalLimit = eventDate.totalTicketLimit;
  const globalRemaining =
    globalLimit !== null ? Math.max(0, globalLimit - totalSold) : null;

  const ticketTypes: TicketTypeAvailability[] = eventDate.event.ticketTypes.map(
    (tt) => {
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
      };
    }
  );

  return {
    eventDateId,
    totalLimit: globalLimit,
    totalSold,
    totalAvailable: globalRemaining,
    globalRemaining,
    ticketTypes,
  };
}

/**
 * Check if specific quantities can be reserved
 * Returns { success: true } or { success: false, error: string }
 */
export async function checkCapacityForOrder(
  eventDateId: number,
  items: Array<{ eventTicketTypeId: number; quantity: number }>
): Promise<
  { success: true } | { success: false; error: string; details?: Record<number, number> }
> {
  const availability = await computeAvailability(eventDateId);

  // Check global capacity
  const totalRequested = items.reduce((sum, item) => sum + item.quantity, 0);
  if (
    availability.totalAvailable !== null &&
    totalRequested > availability.totalAvailable
  ) {
    return {
      success: false,
      error: `Only ${availability.totalAvailable} tickets available for this event`,
    };
  }

  // Check per-type capacity
  const insufficientTypes: Record<number, number> = {};
  for (const item of items) {
    const typeAvailability = availability.ticketTypes.find(
      (tt) => tt.eventTicketTypeId === item.eventTicketTypeId
    );

    if (!typeAvailability) {
      return {
        success: false,
        error: `Ticket type ${item.eventTicketTypeId} not found or not active`,
      };
    }

    if (
      typeAvailability.available !== null &&
      item.quantity > typeAvailability.available
    ) {
      insufficientTypes[item.eventTicketTypeId] = typeAvailability.available;
    }
  }

  if (Object.keys(insufficientTypes).length > 0) {
    const typeNames = await prisma.eventTicketType.findMany({
      where: { id: { in: Object.keys(insufficientTypes).map(Number) } },
      select: { id: true, name: true },
    });

    const messages = typeNames.map(
      (tt) => `${tt.name}: ${insufficientTypes[tt.id]} available`
    );

    return {
      success: false,
      error: `Insufficient capacity: ${messages.join(', ')}`,
      details: insufficientTypes,
    };
  }

  return { success: true };
}
