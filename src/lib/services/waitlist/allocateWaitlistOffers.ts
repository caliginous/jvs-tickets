import crypto from 'crypto';
import prisma from '../../prisma';
import { computeAvailability } from '../ticketing/availability';

const OFFER_DURATION_MINUTES = 120;

// Stable advisory lock key: Postgres exposes pg_advisory_lock(int, int) or
// pg_advisory_lock(bigint) — not (bigint, bigint). Cast in SQL so parameters
// are not inferred as bigint pairs.
const LOCK_NAMESPACE = 834719; // arbitrary constant (fits int4)

interface AllocationResult {
  offersCreated: number;
  entriesSkipped: number;
  details: Array<{
    entryId: string;
    email: string;
    offerId?: string;
    skipped?: boolean;
    reason?: string;
  }>;
}

/**
 * Allocate waitlist offers for a given event date.
 *
 * Uses a Postgres advisory lock to serialise concurrent allocation runs
 * for the same event date, preventing over-offering.
 *
 * Recomputes real availability, then walks the queue in FIFO order
 * (createdAt ASC, id ASC). Entries whose requestedQuantity fits are
 * offered; oversized entries are skipped (they don't block the queue).
 */
export async function allocateWaitlistOffers(params: {
  eventDateId: number;
  eventTicketTypeId?: number;
  actor?: string;
  sourceOrderId?: string;
}): Promise<AllocationResult> {
  const { eventDateId, eventTicketTypeId, actor, sourceOrderId } = params;

  // Acquire advisory lock scoped to this event date.
  // This serialises concurrent allocation runs so two callers can't
  // both read the same availability snapshot and over-offer.
  await prisma.$executeRawUnsafe(
    `SELECT pg_advisory_lock($1::int, $2::int)`,
    LOCK_NAMESPACE,
    eventDateId
  );

  try {
    return await runAllocation(params);
  } finally {
    await prisma.$executeRawUnsafe(
      `SELECT pg_advisory_unlock($1::int, $2::int)`,
      LOCK_NAMESPACE,
      eventDateId
    );
  }
}

async function runAllocation(params: {
  eventDateId: number;
  eventTicketTypeId?: number;
  actor?: string;
  sourceOrderId?: string;
}): Promise<AllocationResult> {
  const { eventDateId, eventTicketTypeId, actor, sourceOrderId } = params;

  const availability = await computeAvailability(eventDateId);

  // Load event details once for email context
  const eventDate = await prisma.eventDate.findUnique({
    where: { id: eventDateId },
    include: {
      event: { include: { venue: true, ticketTypes: true } },
    },
  });

  // Build mutable per-type availability map
  const availableByType = new Map<number, number>();
  for (const tt of availability.ticketTypes) {
    if (eventTicketTypeId && tt.eventTicketTypeId !== eventTicketTypeId) continue;
    if (tt.available !== null) {
      availableByType.set(tt.eventTicketTypeId, tt.available);
    }
  }

  // Track global remaining (may be null = unlimited)
  let globalRemaining = availability.globalRemaining;

  const entries = await prisma.waitlistEntry.findMany({
    where: {
      eventDateId,
      status: 'ACTIVE',
      ...(eventTicketTypeId ? { eventTicketTypeId } : {}),
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  const result: AllocationResult = {
    offersCreated: 0,
    entriesSkipped: 0,
    details: [],
  };

  for (const entry of entries) {
    // Check global remaining first
    if (globalRemaining !== null && entry.requestedQuantity > globalRemaining) {
      result.entriesSkipped++;
      result.details.push({
        entryId: entry.id,
        email: entry.email,
        skipped: true,
        reason: `insufficient global capacity (requested ${entry.requestedQuantity}, global remaining ${globalRemaining})`,
      });
      continue;
    }

    const typeAvailable = availableByType.get(entry.eventTicketTypeId);

    if (typeAvailable === undefined) {
      const unlimitedType = availability.ticketTypes.find(
        t => t.eventTicketTypeId === entry.eventTicketTypeId
      );
      if (!unlimitedType || unlimitedType.available !== null) {
        result.entriesSkipped++;
        result.details.push({
          entryId: entry.id,
          email: entry.email,
          skipped: true,
          reason: 'ticket type not available for allocation',
        });
        continue;
      }
    }

    if (typeAvailable !== undefined && entry.requestedQuantity > typeAvailable) {
      result.entriesSkipped++;
      result.details.push({
        entryId: entry.id,
        email: entry.email,
        skipped: true,
        reason: `insufficient capacity (requested ${entry.requestedQuantity}, available ${typeAvailable})`,
      });

      await prisma.waitlistAuditLog.create({
        data: {
          waitlistEntryId: entry.id,
          eventDateId,
          eventTicketTypeId: entry.eventTicketTypeId,
          action: 'ASSIGNMENT_SKIPPED_INSUFFICIENT_CAPACITY',
          actor: actor || 'system',
          metadataJson: JSON.stringify({
            requestedQuantity: entry.requestedQuantity,
            availableQuantity: typeAvailable,
          }),
        },
      });
      continue;
    }

    const offerToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + OFFER_DURATION_MINUTES * 60 * 1000);

    try {
      const offer = await prisma.$transaction(async (tx) => {
        const newOffer = await tx.waitlistOffer.create({
          data: {
            waitlistEntryId: entry.id,
            eventDateId,
            eventTicketTypeId: entry.eventTicketTypeId,
            quantity: entry.requestedQuantity,
            status: 'ACTIVE',
            offerToken,
            expiresAt,
            createdBy: actor || 'system',
            sourceOrderId: sourceOrderId || null,
          },
        });

        await tx.waitlistEntry.update({
          where: { id: entry.id },
          data: { status: 'OFFERED' },
        });

        await tx.waitlistAuditLog.create({
          data: {
            waitlistEntryId: entry.id,
            waitlistOfferId: newOffer.id,
            eventDateId,
            eventTicketTypeId: entry.eventTicketTypeId,
            action: 'OFFER_CREATED',
            actor: actor || 'system',
            metadataJson: JSON.stringify({
              quantity: entry.requestedQuantity,
              expiresAt: expiresAt.toISOString(),
              sourceOrderId,
            }),
          },
        });

        return newOffer;
      });

      // Decrement both per-type and global remaining
      if (typeAvailable !== undefined) {
        availableByType.set(entry.eventTicketTypeId, typeAvailable - entry.requestedQuantity);
      }
      if (globalRemaining !== null) {
        globalRemaining = globalRemaining - entry.requestedQuantity;
      }

      result.offersCreated++;
      result.details.push({
        entryId: entry.id,
        email: entry.email,
        offerId: offer.id,
      });

      console.log(`[waitlist/allocate] Offer ${offer.id} created for entry ${entry.id} (${entry.email}), qty ${entry.requestedQuantity}, expires ${expiresAt.toISOString()}`);

      sendOfferEmail(entry, offer, offerToken, expiresAt, eventDate).catch(emailErr => {
        console.error(`[waitlist/allocate] Failed to send offer email to ${entry.email}:`, emailErr);
      });

    } catch (err: any) {
      if (err.code === 'P2002') {
        console.warn(`[waitlist/allocate] Skipped entry ${entry.id} - concurrent offer exists`);
        result.entriesSkipped++;
        result.details.push({
          entryId: entry.id,
          email: entry.email,
          skipped: true,
          reason: 'concurrent offer already exists',
        });
        continue;
      }
      throw err;
    }
  }

  console.log(`[waitlist/allocate] Allocation complete for event date ${eventDateId}: ${result.offersCreated} offers created, ${result.entriesSkipped} skipped`);
  return result;
}

async function sendOfferEmail(
  entry: { id: string; email: string; firstName: string | null; lastName: string | null },
  offer: { id: string; eventTicketTypeId: number; quantity: number },
  offerToken: string,
  expiresAt: Date,
  eventDate: any,
) {
  try {
    const { emailTriggerService } = await import('../emailTriggerService');
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tickets.jvs.org.uk';
    const claimLink = `${baseUrl}/waitlist/claim/${offerToken}`;
    const ticketType = eventDate?.event?.ticketTypes?.find(
      (tt: any) => tt.id === offer.eventTicketTypeId
    );

    const emailResult = await emailTriggerService.sendWaitlistOffer({
      userEmail: entry.email,
      userFirstName: entry.firstName || '',
      userLastName: entry.lastName || '',
      eventTitle: eventDate?.event?.title || 'Event',
      eventDate: eventDate?.date
        ? new Date(eventDate.date).toLocaleDateString('en-GB', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })
        : 'TBD',
      eventTime: eventDate?.date
        ? new Date(eventDate.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        : 'TBD',
      eventLocation: eventDate?.event?.venue?.name || 'Venue TBC',
      ticketTypeName: ticketType?.name || 'Ticket',
      quantity: offer.quantity,
      expiresAt: expiresAt.toISOString(),
      claimLink,
      locale: 'en',
    });

    if (emailResult.success) {
      await prisma.waitlistAuditLog.create({
        data: {
          waitlistEntryId: entry.id,
          waitlistOfferId: offer.id,
          action: 'OFFER_EMAIL_SENT',
          metadataJson: JSON.stringify({ messageId: emailResult.messageId }),
        },
      });
    }
  } catch (err) {
    console.error(`[waitlist/allocate] Email send error for ${entry.email}:`, err);
  }
}
