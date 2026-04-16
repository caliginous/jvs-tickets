import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../lib/prisma";
import { getEventUrl } from "../../utils/slug";
import { buildCapacityConsumingOrderWhere, capacityConsumingStatusFilter } from "../../lib/services/ticketing/capacityWhere";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Edge cache (Vercel/Cloudflare) — CDN re-fetches every 60s and serves stale for 5 min.
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  try {
    const now = new Date();

    const events = await prisma.event.findMany({
      where: { isActive: true },
      include: {
        venue: true,
        dates: { orderBy: { date: 'asc' } },
        ticketTypes: true,
      },
    });

    // Collect the set of eventDateIds we care about (one "next date" per event).
    const eventNextDate = new Map<number, (typeof events)[number]['dates'][number]>();
    for (const event of events) {
      const next =
        event.dates.find((d) => d.date && new Date(d.date) > now) ||
        [...event.dates].reverse().find((d) => d.date && new Date(d.date) <= now);
      if (next) eventNextDate.set(event.id, next);
    }
    const eventDateIds = Array.from(eventNextDate.values()).map((d) => d.id);

    // Batch: single groupBy for total sold tickets per eventDateId
    // and one more for per-ticket-type sold counts. Previously this did 2*N queries
    // (one .aggregate + one .groupBy per event).
    let totalsByDateId = new Map<number, number>();
    let soldByDateAndType = new Map<number, Map<number, number>>();

    if (eventDateIds.length > 0) {
      const [totalRows, perTypeRows] = await Promise.all([
        prisma.ticket.groupBy({
          by: ['orderId'],
          where: {
            order: {
              eventDateId: { in: eventDateIds },
              OR: capacityConsumingStatusFilter(),
            },
          },
          _count: { id: true },
        }).then(async () => {
          // The row-level groupBy above would be too granular; instead use a second
          // aggregate per-eventDateId via a raw aggregation.
          const rows = await prisma.$queryRawUnsafe<Array<{ eventDateId: number; count: number }>>(
            `
            SELECT o."eventDateId" as "eventDateId", COUNT(t.id)::int as count
            FROM "Ticket" t
            INNER JOIN "Order" o ON o.id = t."orderId"
            WHERE o."eventDateId" = ANY($1::int[])
              AND (
                o.status IN ('CONFIRMED','PAID','PENDING')
                OR (o.status IN ('REFUNDED','CANCELLED') AND o."inventoryReturnedToPool" = false)
              )
            GROUP BY o."eventDateId"
            `,
            eventDateIds
          );
          return rows;
        }),
        prisma.$queryRawUnsafe<Array<{ eventDateId: number; eventTicketTypeId: number; count: number }>>(
          `
          SELECT o."eventDateId" as "eventDateId", t."eventTicketTypeId" as "eventTicketTypeId", COUNT(t.id)::int as count
          FROM "Ticket" t
          INNER JOIN "Order" o ON o.id = t."orderId"
          WHERE o."eventDateId" = ANY($1::int[])
            AND t."eventTicketTypeId" IS NOT NULL
            AND (
              o.status IN ('CONFIRMED','PAID','PENDING')
              OR (o.status IN ('REFUNDED','CANCELLED') AND o."inventoryReturnedToPool" = false)
            )
          GROUP BY o."eventDateId", t."eventTicketTypeId"
          `,
          eventDateIds
        ),
      ]);

      for (const row of totalRows as Array<{ eventDateId: number; count: number }>) {
        totalsByDateId.set(row.eventDateId, row.count);
      }
      for (const row of perTypeRows) {
        const map = soldByDateAndType.get(row.eventDateId) ?? new Map<number, number>();
        map.set(row.eventTicketTypeId, row.count);
        soldByDateAndType.set(row.eventDateId, map);
      }
    }

    const eventSummaries = events.map((event) => {
      const nextDate = eventNextDate.get(event.id);
      if (!nextDate) return null;

      const soldForDate = totalsByDateId.get(nextDate.id) ?? 0;
      const ticketTypeSoldMap = soldByDateAndType.get(nextDate.id) ?? new Map<number, number>();

      const ticketTypes = event.ticketTypes || [];
      const ticketAvailability = {
        total: 0,
        available: 0,
        sold: 0,
        percentageRemaining: 100,
        hasGlobalLimit: !!nextDate.totalTicketLimit,
      };

      const globalLimit = nextDate.totalTicketLimit;
      if (globalLimit) {
        ticketAvailability.total = globalLimit;
        ticketAvailability.sold = soldForDate;
        ticketAvailability.available = Math.max(0, globalLimit - soldForDate);
        ticketAvailability.percentageRemaining =
          globalLimit > 0 ? Math.round((ticketAvailability.available / globalLimit) * 100) : 0;
      } else {
        ticketTypes.forEach((tt) => {
          const maxAmount = tt.capacity || 999999;
          const sold = ticketTypeSoldMap.get(tt.id) || 0;
          ticketAvailability.total += maxAmount;
          ticketAvailability.sold += sold;
          ticketAvailability.available += Math.max(0, maxAmount - sold);
        });
        ticketAvailability.percentageRemaining =
          ticketAvailability.total > 0
            ? Math.round((ticketAvailability.available / ticketAvailability.total) * 100)
            : 0;
      }

      const categoryBreakdown = ticketTypes.map((tt) => {
        const maxAmount = tt.capacity || 999999;
        const sold = ticketTypeSoldMap.get(tt.id) || 0;
        const available = Math.max(0, maxAmount - sold);
        return {
          id: tt.id,
          name: tt.name,
          price: tt.price / 100,
          color: tt.colorHex || '#000000',
          maxAmount,
          sold,
          available,
          isAvailable: available > 0,
        };
      });

      const dates = (event.dates || []).map((eventDate) => ({
        id: eventDate.id,
        date: eventDate.date ? eventDate.date.toISOString() : null,
        title: eventDate.title,
        totalTicketLimit: eventDate.totalTicketLimit,
        ticketSaleStartDate: eventDate.ticketSaleStartDate,
        ticketSaleEndDate: eventDate.ticketSaleEndDate,
      }));

      return {
        id: event.id,
        title: event.title,
        description: event.description,
        slug: event.slug,
        url: getEventUrl({ id: event.id, slug: event.slug }),
        nextDate: nextDate.date ? nextDate.date.toISOString() : null,
        minPrice: categoryBreakdown.length > 0 ? Math.min(...categoryBreakdown.map((c) => c.price)) : null,
        coverImage: event.coverImage,
        venue: event.venue
          ? {
              name: event.venue.name,
              address: event.venue.address,
              city: event.venue.city,
              postcode: event.venue.postcode,
            }
          : null,
        ticketAvailability,
        categories: categoryBreakdown,
        dates,
        hasAvailableTickets: ticketAvailability.available > 0,
        isSoldOut: ticketAvailability.available === 0,
        stockQuantity: ticketAvailability.available,
        available: ticketAvailability.available > 0,
        purchasable: ticketAvailability.available > 0,
      };
    });

    const validEvents = eventSummaries
      .filter(Boolean)
      .sort((a, b) => {
        if (!a!.nextDate && !b!.nextDate) return 0;
        if (!a!.nextDate) return 1;
        if (!b!.nextDate) return -1;
        return new Date(a!.nextDate).getTime() - new Date(b!.nextDate).getTime();
      });

    res.status(200).json(validEvents);
  } catch (e: any) {
    console.error('Error in events API:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}
