import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { computeAvailability, EventAvailability } from '../../../lib/services/ticketing/availability';

/**
 * Env-driven allowlist so we can add preview / production origins without code
 * changes. Default allowlist covers production marketing domains. Browser clients
 * that are not in the allowlist simply won't get CORS headers (server-to-server
 * calls from Next.js are unaffected by CORS).
 */
const DEFAULT_ALLOWED = [
  'https://jvs.org.uk',
  'https://www.jvs.org.uk',
  'https://jvs-vercel.vercel.app',
];

function getAllowedOrigins(): string[] {
  const env = (process.env.PUBLIC_EVENTS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set([...DEFAULT_ALLOWED, ...env]));
}

function setCorsHeaders(req: NextApiRequest, res: NextApiResponse) {
  const origin = (req.headers.origin as string) || '';
  const allowed = getAllowedOrigins();
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Edge cache: refresh every 60s, serve stale for 5 min.
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  try {
    const now = new Date();
    
    // Fetch events with their dates, venue, categories, and ticket types
    const events = await prisma.event.findMany({
      where: {
        isActive: true
      },
      include: {
        venue: true,
        dates: {
          where: {
            date: {
              gte: now // Only future dates
            }
          },
          orderBy: {
            date: 'asc'
          }
        },
        ticketTypes: {
          where: {
            isActive: true,
            isPublic: true
          },
          orderBy: {
            publicSortOrder: 'asc'
          }
        }
      }
    });

    // Transform events with availability computed from tickets
    const transformedEvents = await Promise.all(
      events
        .filter(event => event.dates.length > 0)
        .map(async event => {
          const nextDate = event.dates[0];
          
          // Compute availability using the new centralized service
          let availability: EventAvailability | null = null;
          try {
            availability = await computeAvailability(nextDate.id);
          } catch (err) {
            console.error(`[public/events] Failed to compute availability for event ${event.id}:`, err);
          }

          return {
            id: event.id,
            title: event.title,
            description: event.description,
            slug: event.slug || `event-${event.id}`,
            coverImage: event.coverImage,
            date: nextDate.date,
            eventDateId: nextDate.id,
            venue: event.venue ? {
              name: event.venue.name,
              address: event.venue.address,
              city: event.venue.city,
              postcode: event.venue.postcode
            } : null,
            
            // Global availability - use this for "X remaining overall" display
            availability: availability ? {
              globalRemaining: availability.globalRemaining,
              totalSold: availability.totalSold,
              totalLimit: availability.totalLimit
            } : null,
            
            // NEW: ticketTypes with computed availability (use this)
            ticketTypes: availability?.ticketTypes.map(tt => ({
              id: tt.eventTicketTypeId,
              name: tt.name,
              price: tt.price,
              currency: tt.currency,
              capacity: tt.capacity,
              sold: tt.sold,
              available: tt.available,
              isAvailable: !tt.isSoldOut
            })) ?? [],
            
            // Legacy ticketAvailability format for backwards compatibility
            ticketAvailability: availability ? {
              total: availability.totalLimit ?? 0,
              available: availability.globalRemaining ?? 0,
              sold: availability.totalSold,
              percentageRemaining: availability.totalLimit 
                ? Math.round(((availability.globalRemaining ?? 0) / availability.totalLimit) * 100) 
                : 100
            } : {
              total: 0,
              available: 0,
              sold: 0,
              percentageRemaining: 0
            },
            
            hasSeatReservation: false, // Seat maps deprecated
            personalTicket: event.personalTicket || false,
            customFields: []
          };
        })
    );

    return res.status(200).json(transformedEvents);
  } catch (error) {
    console.error('Error fetching public events:', error);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
}
