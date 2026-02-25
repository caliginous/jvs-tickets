/**
 * Ticket validation for order store.
 * Uses eventTicketTypeId exclusively.
 */
import prisma from '../../lib/prisma';

export interface ValidatedTicket {
  eventTicketTypeId: number;
  amount: number;
  firstName?: string;
  lastName?: string;
  price?: number;
  reasons?: string[];
}

export interface ValidationResult {
  validTickets: ValidatedTicket[];
  invalidTickets: Array<ValidatedTicket & { reasons: string[] }>;
}

export async function validateTickets(
  tickets: Array<{ ticketTypeId?: number; eventTicketTypeId?: number; amount?: number; firstName?: string; lastName?: string }>,
  eventDateId: number
): Promise<ValidationResult> {
  const validTickets: ValidatedTicket[] = [];
  const invalidTickets: Array<ValidatedTicket & { reasons: string[] }> = [];

  const eventDate = await prisma.eventDate.findUnique({
    where: { id: eventDateId },
    select: { eventId: true }
  });

  if (!eventDate) {
    return {
      validTickets: [],
      invalidTickets: tickets.map(t => ({
        ...t,
        eventTicketTypeId: t.ticketTypeId ?? t.eventTicketTypeId ?? 0,
        amount: t.amount ?? 1,
        reasons: ['Event date not found']
      })) as any
    };
  }

  const typeIds = tickets.map(t => t.ticketTypeId ?? t.eventTicketTypeId).filter((id): id is number => id != null);
  const validTypes = await prisma.eventTicketType.findMany({
    where: {
      id: { in: typeIds },
      eventId: eventDate.eventId,
      isActive: true
    }
  });
  const validTypeIds = new Set(validTypes.map(tt => tt.id));

  for (const ticket of tickets) {
    const typeId = ticket.ticketTypeId ?? ticket.eventTicketTypeId;
    const amount = ticket.amount ?? 1;
    const reasons: string[] = [];

    if (!typeId) {
      reasons.push('Missing ticketTypeId or eventTicketTypeId');
    } else if (!validTypeIds.has(typeId)) {
      reasons.push('Invalid or inactive ticket type');
    }
    if (amount < 1) {
      reasons.push('Invalid quantity');
    }

    const normalized: ValidatedTicket = {
      eventTicketTypeId: typeId!,
      amount,
      firstName: ticket.firstName,
      lastName: ticket.lastName
    };

    if (reasons.length > 0) {
      invalidTickets.push({ ...normalized, reasons });
    } else {
      validTickets.push(normalized);
    }
  }

  return { validTickets, invalidTickets };
}
