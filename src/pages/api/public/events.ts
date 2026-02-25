import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://jvs-vercel.vercel.app',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin']);
    res.setHeader('Access-Control-Allow-Methods', corsHeaders['Access-Control-Allow-Methods']);
    res.setHeader('Access-Control-Allow-Headers', corsHeaders['Access-Control-Allow-Headers']);
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const now = new Date();
    
    // Fetch events with their dates, venue, and categories
    const events = await prisma.event.findMany({
      include: {
        venue: true,
        dates: {
          where: {
            date: {
              gte: now // Only future dates
            }
          },
          include: {
            orders: {
              where: {
                status: {
                  // Include PARTIALLY_REFUNDED as those tickets are still valid
                  in: ['CONFIRMED', 'PAID', 'COMPLETED', 'PARTIALLY_REFUNDED']
                }
              },
              include: {
                tickets: true
              }
            }
          },
          orderBy: {
            date: 'asc'
          }
        },
        categories: {
          include: {
            category: true
          }
        }
      }
    });

    // Transform events to the format expected by the main website
    const transformedEvents = events
      .filter(event => event.dates.length > 0) // Only events with future dates
      .map(event => {
        const nextDate = event.dates[0]; // Get the next upcoming date
        
        // Calculate ticket availability
        const totalTickets = event.categories.reduce((sum, cat) => sum + (cat.maxAmount || 0), 0);
        const soldTickets = nextDate.orders.reduce((sum, order) => sum + order.tickets.length, 0);
        const availableTickets = Math.max(0, totalTickets - soldTickets);
        
        return {
          id: event.id,
          title: event.title,
          description: event.description,
          slug: `event-${event.id}`,
          coverImage: event.coverImage,
          date: nextDate.date,
          venue: event.venue ? {
            name: event.venue.name,
            address: event.venue.address,
            city: event.venue.city,
            postcode: event.venue.postcode
          } : null,
          categories: event.categories.map(cat => ({
            id: cat.category.id,
            name: cat.category.label,
            price: cat.category.price,
            color: cat.category.color,
            maxAmount: cat.maxAmount
          })),
          ticketAvailability: {
            total: totalTickets,
            available: availableTickets,
            sold: soldTickets,
            percentageRemaining: totalTickets > 0 ? Math.round((availableTickets / totalTickets) * 100) : 0
          },
          hasSeatReservation: event.seatType === 'seatmap',
          personalTicket: event.personalTicket || false,
          customFields: []
        };
      });

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin']);
    res.setHeader('Access-Control-Allow-Methods', corsHeaders['Access-Control-Allow-Methods']);
    res.setHeader('Access-Control-Allow-Headers', corsHeaders['Access-Control-Allow-Headers']);
    
    return res.status(200).json(transformedEvents);
    
  } catch (error) {
    console.error('Error fetching public events:', error);
    
    // Set CORS headers for error response
    res.setHeader('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin']);
    res.setHeader('Access-Control-Allow-Methods', corsHeaders['Access-Control-Allow-Methods']);
    res.setHeader('Access-Control-Allow-Headers', corsHeaders['Access-Control-Allow-Headers']);
    
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
}
