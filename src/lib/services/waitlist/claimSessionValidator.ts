import prisma from '../../prisma';

interface ValidationInput {
  claimSessionToken: string;
  eventDateId: number;
  tickets: Array<{ eventTicketTypeId: number; quantity: number }>;
}

type ValidationResult =
  | { valid: true; claimSession: any; offer: any }
  | { valid: false; error: string };

/**
 * Validate a waitlist claim session for use in checkout.
 * This is a read-only check. Consumption happens inside
 * createOrderWithWaitlistFulfilment.
 */
export async function validateClaimSession(
  input: ValidationInput
): Promise<ValidationResult> {
  const { claimSessionToken, eventDateId, tickets } = input;

  const claimSession = await prisma.waitlistClaimSession.findUnique({
    where: { token: claimSessionToken },
  });

  if (!claimSession) {
    return { valid: false, error: 'Claim session not found' };
  }

  if (claimSession.usedAt) {
    return { valid: false, error: 'Claim session has already been used' };
  }

  if (new Date() >= claimSession.expiresAt) {
    return { valid: false, error: 'Claim session has expired' };
  }

  const offer = await prisma.waitlistOffer.findFirst({
    where: { id: claimSession.waitlistOfferId },
  });

  if (!offer) {
    return { valid: false, error: 'Associated offer not found' };
  }

  if (offer.status !== 'ACTIVE') {
    return { valid: false, error: `Offer is no longer active (status: ${offer.status})` };
  }

  if (new Date() >= offer.expiresAt) {
    return { valid: false, error: 'Offer has expired' };
  }

  if (offer.eventDateId !== eventDateId) {
    return { valid: false, error: 'Event date does not match the offer' };
  }

  const totalQuantity = tickets.reduce((sum, t) => sum + t.quantity, 0);
  if (totalQuantity !== offer.quantity) {
    return {
      valid: false,
      error: `Requested quantity (${totalQuantity}) does not match offer quantity (${offer.quantity})`,
    };
  }

  const matchingTicket = tickets.find(
    t => t.eventTicketTypeId === offer.eventTicketTypeId
  );
  if (!matchingTicket || matchingTicket.quantity !== offer.quantity) {
    return {
      valid: false,
      error: 'Ticket type and quantity must match the waitlist offer',
    };
  }

  return { valid: true, claimSession, offer };
}

// Keep old name as alias during transition
export const validateAndConsumeClaimSession = validateClaimSession;

interface WaitlistOrderInput {
  orderId: string;
  userId: string;
  eventDateId: number;
  orderData: {
    paymentType: string;
    shipping: string;
    locale: string;
    idempotencyKey: string;
    cancellationSecret: string;
    originalTotal: number;
    finalTotal: number;
    discountAmount: number;
    customFields: string | null;
  };
  ticketRows: Array<{
    eventTicketTypeId: number;
    amount: number;
    priceCharged: number;
    secret: string;
    firstName: string;
    lastName: string;
  }>;
  orderItems: Array<{
    eventTicketTypeId: number;
    quantity: number;
    unitPrice: number;
    currency?: string;
  }>;
  claimSessionId: string;
  offerId: string;
  waitlistEntryId: string;
}

/**
 * Create a PENDING order AND fulfil the waitlist offer in a single
 * Prisma interactive transaction. This eliminates the window where
 * both the active offer and the new PENDING order consume capacity.
 */
export async function createOrderWithWaitlistFulfilment(
  input: WaitlistOrderInput
): Promise<{ order: any }> {
  const {
    orderId, userId, eventDateId, orderData, ticketRows,
    claimSessionId, offerId, waitlistEntryId,
  } = input;

  return prisma.$transaction(async (tx) => {
    // Re-validate inside the transaction to prevent races
    const claimSession = await tx.waitlistClaimSession.findUnique({
      where: { id: claimSessionId },
    });
    if (!claimSession || claimSession.usedAt || new Date() >= claimSession.expiresAt) {
      throw new Error('Claim session is no longer valid');
    }

    const offer = await tx.waitlistOffer.findUnique({
      where: { id: offerId },
    });
    if (!offer || offer.status !== 'ACTIVE' || new Date() >= offer.expiresAt) {
      throw new Error('Offer is no longer valid');
    }

    // 1. Create the PENDING order
    const order = await tx.order.create({
      data: {
        id: orderId,
        userId,
        eventDateId,
        paymentType: orderData.paymentType,
        status: 'PENDING',
        shipping: orderData.shipping,
        locale: orderData.locale,
        idempotencyKey: orderData.idempotencyKey,
        cancellationSecret: orderData.cancellationSecret,
        originalTotal: orderData.originalTotal,
        finalTotal: orderData.finalTotal,
        discountAmount: orderData.discountAmount,
        customFields: orderData.customFields,
      },
    });

    // 2. Create ticket rows
    for (const ticket of ticketRows) {
      await tx.ticket.create({
        data: {
          orderId,
          eventTicketTypeId: ticket.eventTicketTypeId,
          amount: ticket.amount,
          priceCharged: ticket.priceCharged,
          secret: ticket.secret,
          firstName: ticket.firstName,
          lastName: ticket.lastName,
        },
      });
    }

    // 2b. Create order item rows (for admin UI / invoices)
    for (const item of input.orderItems) {
      await tx.orderItem.create({
        data: {
          orderId,
          eventTicketTypeId: item.eventTicketTypeId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          currency: item.currency || 'GBP',
        },
      });
    }

    // 3. Mark claim session used
    await tx.waitlistClaimSession.update({
      where: { id: claimSessionId },
      data: { usedAt: new Date() },
    });

    // 4. Mark offer claimed
    await tx.waitlistOffer.update({
      where: { id: offerId },
      data: { status: 'CLAIMED', claimedAt: new Date() },
    });

    // 5. Mark entry fulfilled with fulfillmentOrderId
    await tx.waitlistEntry.update({
      where: { id: waitlistEntryId },
      data: {
        status: 'FULFILLED',
        fulfillmentOrderId: orderId,
      },
    });

    // 6. Audit logs
    await tx.waitlistAuditLog.create({
      data: {
        waitlistEntryId,
        waitlistOfferId: offerId,
        eventDateId,
        action: 'OFFER_CLAIMED',
        metadataJson: JSON.stringify({ orderId }),
      },
    });

    await tx.waitlistAuditLog.create({
      data: {
        waitlistEntryId,
        waitlistOfferId: offerId,
        eventDateId,
        action: 'ENTRY_FULFILLED',
        metadataJson: JSON.stringify({ orderId }),
      },
    });

    return { order };
  });
}
