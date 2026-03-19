import prisma from '../../prisma';

/**
 * Get quantities reserved by active, unexpired waitlist offers per ticket type
 * for a given event date. These reduce public availability.
 */
export async function getActiveOfferReservedQuantities(
  eventDateId: number
): Promise<Map<number, number>> {
  const offerGroups = await prisma.waitlistOffer.groupBy({
    by: ['eventTicketTypeId'],
    where: {
      eventDateId,
      status: 'ACTIVE',
      expiresAt: { gt: new Date() },
    },
    _sum: { quantity: true },
  });

  const reserved = new Map<number, number>();
  for (const group of offerGroups) {
    reserved.set(group.eventTicketTypeId, group._sum.quantity || 0);
  }
  return reserved;
}

/**
 * Get total quantity reserved by active offers across all ticket types
 * for a given event date.
 */
export async function getTotalActiveOfferReservedQuantity(
  eventDateId: number
): Promise<number> {
  const result = await prisma.waitlistOffer.aggregate({
    where: {
      eventDateId,
      status: 'ACTIVE',
      expiresAt: { gt: new Date() },
    },
    _sum: { quantity: true },
  });
  return result._sum.quantity || 0;
}
