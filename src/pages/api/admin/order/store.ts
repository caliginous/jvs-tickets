import { NextApiRequest, NextApiResponse } from "next";

/**
 * DEPRECATED: This endpoint is disabled.
 * 
 * This legacy endpoint used the old Redux-based ticket format which doesn't
 * include eventTicketTypeId. It cannot be used with the modern EventTicketType
 * system and would create tickets without proper type associations.
 * 
 * Use /api/admin/orders/create-with-ticket-types instead, which:
 * - Properly validates capacity using the availability service
 * - Creates tickets with eventTicketTypeId
 * - Supports the modern order creation flow
 * 
 * The AddOrder dialog in admin UI should be updated to use CreateOrderModal instead.
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    return res.status(410).json({
        error: 'This endpoint is deprecated',
        message: 'Use /api/admin/orders/create-with-ticket-types instead. The legacy order creation flow is no longer supported.',
        migration: 'See CreateOrderModal component for the modern admin order creation UI.'
    });
}
