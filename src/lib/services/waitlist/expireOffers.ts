import prisma from '../../prisma';
import { allocateWaitlistOffers } from './allocateWaitlistOffers';

interface ExpireResult {
  expiredCount: number;
  reallocationTriggered: boolean;
  affectedTicketTypes: number[];
}

/**
 * Find and expire all ACTIVE waitlist offers that have passed their expiry time.
 * Then trigger re-allocation for the affected ticket types.
 */
export async function expireOffers(): Promise<ExpireResult> {
  const now = new Date();

  const expiredOffers = await prisma.waitlistOffer.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { lte: now },
    },
  });

  if (expiredOffers.length === 0) {
    return { expiredCount: 0, reallocationTriggered: false, affectedTicketTypes: [] };
  }

  const offerIds = expiredOffers.map(o => o.id);
  const entryIds = expiredOffers.map(o => o.waitlistEntryId);

  await prisma.waitlistOffer.updateMany({
    where: { id: { in: offerIds } },
    data: { status: 'EXPIRED', expiredAt: now },
  });

  // Only expire entries that have no other active, unexpired offers
  await prisma.waitlistEntry.updateMany({
    where: {
      id: { in: entryIds },
      offers: {
        none: {
          status: 'ACTIVE',
          expiresAt: { gt: now },
        },
      },
    },
    data: { status: 'EXPIRED' },
  });

  // Audit logs
  for (const offer of expiredOffers) {
    await prisma.waitlistAuditLog.create({
      data: {
        waitlistEntryId: offer.waitlistEntryId,
        waitlistOfferId: offer.id,
        eventDateId: offer.eventDateId,
        eventTicketTypeId: offer.eventTicketTypeId,
        action: 'OFFER_EXPIRED',
        actor: 'system:cron',
        metadataJson: JSON.stringify({
          expiredAt: now.toISOString(),
          originalExpiresAt: offer.expiresAt.toISOString(),
        }),
      },
    });
  }

  // Collect unique event date + ticket type combos for reallocation
  const reallocationKeys = new Map<number, Set<number>>();
  for (const offer of expiredOffers) {
    if (!reallocationKeys.has(offer.eventDateId)) {
      reallocationKeys.set(offer.eventDateId, new Set());
    }
    reallocationKeys.get(offer.eventDateId)!.add(offer.eventTicketTypeId);
  }

  const affectedTicketTypes = Array.from(new Set(expiredOffers.map(o => o.eventTicketTypeId)));

  // Trigger reallocation
  for (const [eventDateId, ticketTypeIds] of Array.from(reallocationKeys.entries())) {
    for (const ticketTypeId of Array.from(ticketTypeIds)) {
      try {
        await allocateWaitlistOffers({
          eventDateId,
          eventTicketTypeId: ticketTypeId,
          actor: 'system:expiry-reallocation',
        });
      } catch (err) {
        console.error(`[waitlist/expire] Reallocation failed for eventDate=${eventDateId}, ticketType=${ticketTypeId}:`, err);
      }
    }
  }

  console.log(`[waitlist/expire] Expired ${expiredOffers.length} offers, triggered reallocation for ${reallocationKeys.size} event dates`);

  return {
    expiredCount: expiredOffers.length,
    reallocationTriggered: true,
    affectedTicketTypes,
  };
}
