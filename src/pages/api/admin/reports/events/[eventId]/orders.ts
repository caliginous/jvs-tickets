import { NextApiRequest, NextApiResponse } from 'next';
import { serverAuthenticate } from '../../../../../../constants/serverUtil';
import { PermissionSection, PermissionType } from '../../../../../../constants/interfaces';
import prisma from '../../../../../../lib/prisma';
import { CAPACITY_RESERVED_STATUSES_ARRAY, reservesCapacity } from '../../../../../../constants/orderStatuses';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Check authentication and permissions
        const sessionUser = await serverAuthenticate(req, res, {
            permission: PermissionSection.Orders,
            permissionType: PermissionType.Read
        });
        
        if (!sessionUser) return;

        const { eventId } = req.query;
        if (!eventId || typeof eventId !== 'string') {
            return res.status(400).json({ message: 'Event ID is required' });
        }

        const eventIdNum = parseInt(eventId);
        if (isNaN(eventIdNum)) {
            return res.status(400).json({ message: 'Event ID must be a valid number' });
        }

        // Find the event and its dates
        // Only include capacity-reserved orders (CONFIRMED, PAID, COMPLETED, PARTIALLY_REFUNDED)
        const event = await prisma.event.findUnique({
            where: { id: eventIdNum },
            include: {
                customFields: true, // Include custom field definitions
                dates: {
                    include: {
                        orders: {
                            where: {
                                status: { in: CAPACITY_RESERVED_STATUSES_ARRAY }
                            },
                            include: {
                                user: true,
                                tickets: {
                                    include: {
                                        eventTicketType: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Transform orders data to match the frontend interface
        const orders = [];
        
        for (const eventDate of event.dates) {
            for (const order of eventDate.orders) {
                // Only include capacity-reserved orders (already filtered at query level, but double-check)
                if (reservesCapacity(order.status)) {
                    // Get all ticket types for this order
                    const ticketTypes = order.tickets.map(ticket => {
                        const typeName = ticket.eventTicketType?.name || 'Standard';
                        return `${ticket.amount}× ${typeName}`;
                    }).join(', ');
                    
                    const totalQuantity = order.tickets.reduce((sum, ticket) => sum + ticket.amount, 0);
                    
                    // Use order's finalTotal (what was actually paid after discounts)
                    const orderTotal = (order.finalTotal || order.originalTotal || 0) / 100; // Convert pence to pounds
                    
                    console.log(`[EventOrders] Order ${order.id}: tickets="${ticketTypes}", qty=${totalQuantity}, actualTotal=£${orderTotal.toFixed(2)} (finalTotal: ${order.finalTotal}, originalTotal: ${order.originalTotal})`);
                    
                    orders.push({
                        id: order.id,
                        customerName: `${order.user.firstName} ${order.user.lastName}`,
                        email: order.user.email,
                        phone: order.user.phone || '',
                        ticketType: ticketTypes,
                        quantity: totalQuantity,
                        total: orderTotal, // Actual amount paid (after discounts)
                        status: order.status,
                        arrived: false,
                        customFields: order.customFields
                    });
                }
            }
        }

        res.status(200).json({ 
            orders,
            customFields: event.customFields || [] // Include event's custom field definitions
        });
    } catch (error) {
        console.error('Error fetching event orders:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            eventId: req.query.eventId
        });
        res.status(500).json({ 
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
