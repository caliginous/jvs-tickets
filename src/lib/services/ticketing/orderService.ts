/**
 * Order Service for EventTicketType-based ticketing
 * 
 * This service handles order creation, cancellation, and ticket transfers
 * using the new per-event ticket type system.
 */

import { PrismaClient } from '@prisma/client';
import { CAPACITY_RESERVED_STATUSES_ARRAY } from '../../../constants/orderStatuses';
// TODO: Import generateSecret after fixing import issues
// import { generateSecret } from '../../constants/serverUtil';

const prisma = new PrismaClient();

export interface OrderItem {
  eventTicketTypeId: number;
  quantity: number;
  priceOverride?: number;
  firstName?: string;
  lastName?: string;
}

export interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  zip?: string;
  city?: string;
  countryCode?: string;
  regionCode?: string;
}

export interface CreateOrderRequest {
  eventId: number;
  eventDateId: number;
  items: OrderItem[];
  customer: CustomerInfo;
  discountCode?: string;
  locale?: string;
}

export interface CreateOrderResult {
  success: boolean;
  orderId?: string;
  totalAmount?: number;
  error?: string;
}

/**
 * Create a new order with EventTicketType-based items
 */
export async function createOrderWithEventTicketTypes(
  request: CreateOrderRequest
): Promise<CreateOrderResult> {
  try {
    // Step 1: Check capacity using the canonical availability service
    // Capacity is reserved by creating the PENDING order with tickets - the cleanup cron
    // handles expiring abandoned checkouts. No need to increment sold counter.
    const { checkCapacityForOrder } = await import('./availability');
    const capacityItems = request.items.map(item => ({
      eventTicketTypeId: item.eventTicketTypeId,
      quantity: item.quantity
    }));
    
    const capacityCheck = await checkCapacityForOrder(request.eventDateId, capacityItems);
    
    if (!capacityCheck.success) {
      const errorMessage = 'error' in capacityCheck ? capacityCheck.error : 'Failed to reserve capacity';
      return {
        success: false,
        error: errorMessage
      };
    }

    // Step 2: Create or find user
    const user = await findOrCreateUser(request.customer);

    // Step 3: Calculate totals and apply discounts
    const { totalAmount, discountAmount, finalTotal } = await calculateOrderTotals(
      request.items,
      request.discountCode
    );

    // Step 4: Create order and tickets in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId: user.id,
          eventDateId: request.eventDateId,
          paymentType: 'pending',
          status: 'PENDING',
          shipping: 'standard', // Default shipping method
          locale: request.locale || 'en',
          discountAmount: discountAmount,
          originalTotal: totalAmount,
          finalTotal: finalTotal,
          idempotencyKey: `order_${Date.now()}_${Math.random()}`,
          cancellationSecret: Math.random().toString(36).substr(2, 15),
        }
      });

      // Create tickets for each item
      const tickets = [];
      for (const item of request.items) {
        // TODO: Uncomment after Prisma migration
        // const ticketType = await tx.eventTicketType.findUnique({
        //   where: { id: item.eventTicketTypeId },
        //   select: { price: true, currency: true }
        // });

        // if (!ticketType) {
        //   throw new Error(`Ticket type ${item.eventTicketTypeId} not found`);
        // }

        // Use price override if provided, otherwise use ticket type price
        const priceCharged = item.priceOverride ?? 0;

        // Create multiple tickets for the quantity
        for (let i = 0; i < item.quantity; i++) {
          const ticket = await tx.ticket.create({
            data: {
              orderId: order.id,
              eventTicketTypeId: item.eventTicketTypeId,
              priceCharged: priceCharged,
              amount: 1,
              secret: Math.random().toString(36).substr(2, 20),
            }
          });
          tickets.push(ticket);
        }
      }

      return { order, tickets };
    });

    return {
      success: true,
      orderId: result.order.id,
      totalAmount: finalTotal
    };

  } catch (error) {
    console.error('[ORDER-SERVICE] Error creating order:', error);
    
    // If we get here, something went wrong - we need to release any reserved capacity
    try {
      await releaseReservedCapacity(request.items);
    } catch (releaseError) {
      console.error('[ORDER-SERVICE] Failed to release capacity after error:', releaseError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create order'
    };
  }
}

/**
 * Find existing user or create new one
 */
async function findOrCreateUser(customer: CustomerInfo) {
  const existingUser = await prisma.user.findUnique({
    where: { email: customer.email }
  });

  if (existingUser) {
    return existingUser;
  }

  return await prisma.user.create({
    data: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone || '',
      address: customer.address || '',
      zip: customer.zip || '',
      city: customer.city || '',
      countryCode: customer.countryCode || 'GB',
      regionCode: customer.regionCode || '',
    }
  });
}

/**
 * Calculate order totals and apply discounts
 */
async function calculateOrderTotals(
  items: OrderItem[],
  discountCode?: string
): Promise<{ totalAmount: number; discountAmount: number; finalTotal: number }> {
  let totalAmount = 0;

  // Calculate base total from items
  for (const item of items) {
    const ticketType = await prisma.eventTicketType.findUnique({
      where: { id: item.eventTicketTypeId },
      select: { price: true }
    });

    if (!ticketType) {
      throw new Error(`Ticket type ${item.eventTicketTypeId} not found`);
    }

    const itemPrice = item.priceOverride ?? ticketType.price;
    totalAmount += itemPrice * item.quantity;
    

  }

  // Apply discount if provided
  let discountAmount = 0;
  if (discountCode) {
    const discount = await prisma.discountCode.findUnique({
      where: { code: discountCode, isActive: true }
    });

    if (discount && discount.validUntil && new Date() <= discount.validUntil) {
      if (discount.discountType === 'percentage') {
        discountAmount = Math.round(totalAmount * (discount.discountValue / 100));
        if (discount.maximumDiscount) {
          discountAmount = Math.min(discountAmount, Math.round(discount.maximumDiscount * 100));
        }
      } else {
        discountAmount = Math.round(discount.discountValue * 100);
      }
    }
  }

  const finalTotal = totalAmount - discountAmount;

  return {
    totalAmount: totalAmount, // Keep in pence for consistent storage
    discountAmount: discountAmount,
    finalTotal: finalTotal
  };
}

/**
 * Release reserved capacity if order creation fails
 */
async function releaseReservedCapacity(items: OrderItem[]) {
  for (const item of items) {
    // TODO: Uncomment after Prisma migration
    // await releaseCapacity(item.eventTicketTypeId, item.quantity);
  }
}

/**
 * Cancel an order and release capacity
 */
export async function cancelOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Get order with tickets
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          tickets: {
            select: { id: true, eventTicketTypeId: true }
          }
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // Group tickets by eventTicketTypeId to calculate quantities to release
      const capacityToRelease = new Map<number, number>();
      for (const ticket of order.tickets) {
        if (ticket.eventTicketTypeId) {
          const current = capacityToRelease.get(ticket.eventTicketTypeId) || 0;
          capacityToRelease.set(ticket.eventTicketTypeId, current + 1);
        }
      }

      // Release capacity for each ticket type
      capacityToRelease.forEach(async (quantity, eventTicketTypeId) => {
        await releaseCapacity(eventTicketTypeId, quantity);
      });

      // Mark order as cancelled
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: 'system'
        }
      });

      return { success: true };
    });

    return result;
  } catch (error) {
    console.error('[ORDER-SERVICE] Error cancelling order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel order'
    };
  }
}

/**
 * Transfer tickets from one event ticket type to another
 */
export async function transferTickets(
  orderId: string,
  newEventTicketTypeId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Get order with tickets
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          tickets: {
            // TODO: Uncomment after Prisma migration
            // select: { id: true, eventTicketTypeId: true }
            select: { id: true }
          }
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // TODO: Uncomment after Prisma migration
      // // Group by current eventTicketTypeId
      // const capacityToRelease = new Map<number, number>();
      // for (const ticket of order.tickets) {
      //   if (ticket.eventTicketTypeId) {
      //     const current = capacityToRelease.get(ticket.eventTicketTypeId) || 0;
      //     capacityToRelease.set(ticket.eventTicketTypeId, current + 1);
      //   }
      // }

      // // Release capacity from old ticket types
      // for (const [eventTicketTypeId, quantity] of capacityToRelease) {
      //   await releaseCapacity(eventTicketTypeId, quantity);
      // }

      // // Reserve capacity for new ticket type
      // await reserveCapacity([{ eventTicketTypeId: newEventTicketTypeId, quantity: order.tickets.length }]);

      // Update all tickets to new ticket type
      await tx.ticket.updateMany({
        where: { orderId },
        data: { 
          // TODO: Uncomment after Prisma migration
          // eventTicketTypeId: newEventTicketTypeId 
        }
      });

      return { success: true };
    });

    return result;
  } catch (error) {
    console.error('[ORDER-SERVICE] Error transferring tickets:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to transfer tickets'
    };
  }
}

/**
 * Release capacity for a specific ticket type
 * 
 * NOTE: This is now a no-op. Capacity is computed dynamically from Ticket rows.
 * When orders are cancelled/refunded, capacity is automatically released because
 * the status changes to a non-reserved status (CANCELLED, REFUNDED, etc.) and
 * those tickets stop being counted by the availability service.
 */
async function releaseCapacity(eventTicketTypeId: number, quantity: number) {
  // No-op: EventTicketType.sold is deprecated
  // Capacity is released automatically when Order.status changes to a non-reserved status
  console.log(`[ORDER-SERVICE] Capacity release is automatic via order status (ticket type ${eventTicketTypeId}, qty ${quantity})`);
}

/**
 * Reserve capacity for a specific ticket type
 */
export async function reserveCapacity(prisma: PrismaClient, items: OrderItem[]) {
  for (const item of items) {
    const ticketType = await prisma.eventTicketType.findUnique({
      where: { id: item.eventTicketTypeId }
    });

    if (!ticketType) {
      throw new Error(`Ticket type ${item.eventTicketTypeId} not found`);
    }

    const sold = await prisma.ticket.count({
      where: {
        eventTicketTypeId: item.eventTicketTypeId,
        order: {
          status: { in: CAPACITY_RESERVED_STATUSES_ARRAY }
        }
      }
    });

    const available = ticketType.capacity != null ? (ticketType.capacity - sold) : Infinity;

    if (item.quantity > available) {
      throw new Error(`Not enough availability for ${ticketType.name}. Requested: ${item.quantity}, Available: ${available}`);
    }
  }
}
