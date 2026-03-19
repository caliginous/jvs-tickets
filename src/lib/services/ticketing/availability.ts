/**
 * Availability Computation Service
 *
 * This is the SINGLE SOURCE OF TRUTH for ticket availability.
 * Use this everywhere: validateOrder, public API, admin dashboards.
 *
 * Availability Rules:
 * - Capacity is counted per Ticket row, filtered by capacity-consuming orders
 * - Capacity-consuming = always-reserved statuses + conditional statuses
 *   (REFUNDED/CANCELLED) where inventoryReturnedToPool is false
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
import { buildCapacityConsumingOrderWhere } from './capacityWhere';
import {
  getActiveOfferReservedQuantities,
  getTotalActiveOfferReservedQuantity,
} from './waitlistAvailability';

export interface TicketTypeAvailability {
  eventTicketTypeId: number;
  name: string;
  price: number;
  currency: string;
  capacity: number | null;
  sold: number;
  available: number | null; // null = unlimited
  isSoldOut: boolean;
}

export interface EventAvailability {
  eventDateId: number;
  totalLimit: number | null;
  totalSold: number;
  totalAvailable: number | null;
  globalRemaining: number | null;
  ticketTypes: TicketTypeAvailability[];
}

/**
 * Compute availability for an event date
 */
export async function computeAvailability(
  eventDateId: number
): Promise<EventAvailability> {
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

  const capacityOrderWhere = buildCapacityConsumingOrderWhere(eventDateId);

  const soldCounts = await prisma.ticket.groupBy({
    by: ['eventTicketTypeId'],
    where: {
      order: capacityOrderWhere,
    },
    _count: { id: true },
  });

  const soldByType = new Map<number, number>();
  for (const row of soldCounts) {
    soldByType.set(row.eventTicketTypeId, row._count.id);
  }

  const totalSold = await prisma.ticket.count({
    where: {
      order: capacityOrderWhere,
    },
  });

  // Active waitlist offers also reserve capacity and reduce public availability
  const offerReservedByType = await getActiveOfferReservedQuantities(eventDateId);
  const totalOfferReserved = await getTotalActiveOfferReservedQuantity(eventDateId);

  const globalLimit = eventDate.totalTicketLimit;
  const globalRemaining =
    globalLimit !== null
      ? Math.max(0, globalLimit - totalSold - totalOfferReserved)
      : null;

  const ticketTypes: TicketTypeAvailability[] = eventDate.event.ticketTypes.map(
    (tt) => {
      const sold = soldByType.get(tt.id) || 0;
      const offerReserved = offerReservedByType.get(tt.id) || 0;

      let typeAvailable: number | null = null;
      if (tt.capacity !== null) {
        typeAvailable = Math.max(0, tt.capacity - sold - offerReserved);
      }

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
