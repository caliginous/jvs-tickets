import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../lib/prisma";
import { getEventUrl } from "../../utils/slug";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests - reject all other methods
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Add HTTP caching headers for edge cache (Vercel/Cloudflare)
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  try {
    const now = new Date();
    
    // Step 1: Fetch events with only essential data (no orders/tickets yet)
    const events = await prisma.event.findMany({
      where: {
        isActive: true // Only active events
        // Remove the date filter to include both past and future events
      },
      include: {
        venue: true,
        dates: {
          // Include all dates (past and future)
          orderBy: {
            date: 'asc'
          }
        },
        categories: {
          include: {
            category: true
          }
        },
        ticketTypes: true
      }
    });

    // Step 2: Use aggregated queries to get ticket counts efficiently
    const eventSummaries = await Promise.all(events.map(async (event) => {
      // Find the next future date, or use the most recent past date if no future dates exist
      const nextDate = event.dates.find(date => new Date(date.date) > now) || 
                      event.dates.filter(date => new Date(date.date) <= now).pop();
      if (!nextDate) return null;

      // Get global ticket limit and sold count for this event date
      // Include PARTIALLY_REFUNDED as those tickets are still valid
      const globalTicketStats = await prisma.ticket.aggregate({
        where: {
          order: {
            eventDateId: nextDate.id,
            status: {
              in: ['CONFIRMED', 'PAID', 'COMPLETED', 'PARTIALLY_REFUNDED']
            }
          }
        },
        _count: {
          id: true
        }
      });

      // Get per-category ticket counts using aggregation
      // Include PARTIALLY_REFUNDED as those tickets are still valid
      const categoryTicketStats = await prisma.ticket.groupBy({
        by: ['categoryId'],
        where: {
          order: {
            eventDateId: nextDate.id,
            status: {
              in: ['CONFIRMED', 'PAID', 'COMPLETED', 'PARTIALLY_REFUNDED']
            }
          }
        },
        _count: {
          id: true
        }
      });

      // Create a map for quick lookup
      const categorySoldMap = new Map(
        categoryTicketStats.map(stat => [stat.categoryId, stat._count.id])
      );

      const categories = event.categories || [];
      const ticketTypes = event.ticketTypes || [];
      
      // Calculate ticket availability using aggregated data
      const ticketAvailability = {
        total: 0,
        available: 0,
        sold: 0,
        percentageRemaining: 100,
        hasGlobalLimit: false
      };

      if (nextDate) {
        const globalLimit = nextDate.totalTicketLimit;
        ticketAvailability.hasGlobalLimit = !!globalLimit;

        // Use aggregated sold count
        const soldTickets = globalTicketStats._count.id;

        if (globalLimit) {
          // Global limit applies
          ticketAvailability.total = globalLimit;
          ticketAvailability.sold = soldTickets;
          ticketAvailability.available = Math.max(0, globalLimit - soldTickets);
          ticketAvailability.percentageRemaining = globalLimit > 0 ? Math.round((ticketAvailability.available / globalLimit) * 100) : 0;
        } else {
          // No global limit, calculate from categories
          categories.forEach(cat => {
            const maxAmount = cat.maxAmount || 0;
            // Use aggregated count for this category
            const sold = categorySoldMap.get(cat.category.id) || 0;
            ticketAvailability.total += maxAmount;
            ticketAvailability.sold += sold;
            ticketAvailability.available += Math.max(0, maxAmount - sold);
          });
          ticketAvailability.percentageRemaining = ticketAvailability.total > 0 ? Math.round((ticketAvailability.available / ticketAvailability.total) * 100) : 0;
        }
      }

      // Use ticket types if available, otherwise fall back to categories
      let categoryBreakdown = [];
      
      if (ticketTypes.length > 0) {
        // Use modern ticket types system
        categoryBreakdown = ticketTypes.map(tt => {
          const maxAmount = tt.capacity || 999999; // Use capacity or default to unlimited if not set
          // For ticket types, we'll assume no sold tickets for now (would need separate tracking)
          const sold = tt.sold || 0; // Use sold from ticket type if available
          const available = Math.max(0, maxAmount - sold);
          const isAvailable = available > 0;

          return {
            id: tt.id,
            name: tt.name,
            price: tt.price / 100, // Convert from pence to pounds
            color: tt.colorHex || '#000000',
            maxAmount,
            sold,
            available,
            isAvailable
          };
        });
      } else {
        // Fall back to legacy categories system
        categoryBreakdown = categories.map(cat => {
          const maxAmount = cat.maxAmount || 0;
          // Use aggregated count for this category
          const sold = categorySoldMap.get(cat.category.id) || 0;
          const available = Math.max(0, maxAmount - sold);
          const isAvailable = available > 0;

          return {
            id: cat.category.id,
            name: cat.category.label,
            price: cat.category.price,
            color: cat.category.color,
            maxAmount,
            sold,
            available,
            isAvailable
          };
        });
      }

      // Create dates array for frontend compatibility (preserve exact structure)
      const dates = (event.dates || []).map(eventDate => ({
        id: eventDate.id,
        date: eventDate.date ? eventDate.date.toISOString() : null,
        title: eventDate.title,
        totalTicketLimit: eventDate.totalTicketLimit,
        ticketSaleStartDate: eventDate.ticketSaleStartDate,
        ticketSaleEndDate: eventDate.ticketSaleEndDate
      }));

      // Return exact same structure as before to avoid regressions
      return {
        id: event.id,
        title: event.title,
        description: event.description,
        slug: event.slug,
        url: getEventUrl({ id: event.id, slug: event.slug }),
        nextDate: nextDate?.date ? nextDate.date.toISOString() : null,
        minPrice: categoryBreakdown.length > 0 ? Math.min(...categoryBreakdown.map(c => c.price)) : null,
        seatType: event.seatType,
        coverImage: event.coverImage,
        venue: event.venue ? {
          name: event.venue.name,
          address: event.venue.address,
          city: event.venue.city,
          postcode: event.venue.postcode
        } : null,
        ticketAvailability,
        categories: categoryBreakdown,
        dates: dates,
        hasAvailableTickets: ticketAvailability.available > 0,
        isSoldOut: ticketAvailability.available === 0,
        
        // Compatibility properties for main application (preserve exactly)
        stockQuantity: ticketAvailability.available,
        available: ticketAvailability.available > 0,
        purchasable: ticketAvailability.available > 0
      };
    }));

    // Filter out null events and sort by next date (preserve exact logic)
    const validEvents = eventSummaries
      .filter(Boolean)
      .sort((a, b) => {
        // Handle events without dates by putting them at the end
        if (!a.nextDate && !b.nextDate) return 0;
        if (!a.nextDate) return 1;
        if (!b.nextDate) return -1;
        return new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime();
      });

    res.status(200).json(validEvents);
  } catch (e: any) {
    console.error('Error in events API:', e);
    res.status(500).json({ error: e?.message || "Internal server error" });
  }
}




