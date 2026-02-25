/**
 * Capacity Management Service
 * 
 * Handles atomic operations for reserving and releasing ticket capacity
 * to prevent overselling and race conditions.
 * 
 * Note: This service uses raw SQL queries to avoid Prisma client issues
 * until the EventTicketType migration is complete.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CapacityReservation {
  eventTicketTypeId: number;
  quantity: number;
}

export interface CapacityResult {
  success: boolean;
  error?: string;
  remainingCapacity?: number;
}

/**
 * Reserve capacity for tickets atomically
 * Uses raw SQL to prevent race conditions
 */
export async function reserveCapacity(
  reservations: CapacityReservation[]
): Promise<CapacityResult[]> {
  try {
    return await prisma.$transaction(async (tx) => {
      const results: CapacityResult[] = [];

      for (const reservation of reservations) {
        const { eventTicketTypeId, quantity } = reservation;

        // Get current capacity info using raw SQL
        const ticketTypeResult = await tx.$queryRaw`
          SELECT id, capacity, sold, name 
          FROM "EventTicketType" 
          WHERE id = ${eventTicketTypeId}
        ` as any[];
        
        if (!ticketTypeResult || ticketTypeResult.length === 0) {
          results.push({
            success: false,
            error: `Ticket type ${eventTicketTypeId} not found`,
          });
          continue;
        }
        
        const ticketType = ticketTypeResult[0];

        // Check if capacity allows this reservation
        if (ticketType.capacity !== null) {
          const newSold = ticketType.sold + quantity;
          if (newSold > ticketType.capacity) {
            results.push({
              success: false,
              error: `Insufficient capacity for ${ticketType.name}. Requested: ${quantity}, Available: ${ticketType.capacity - ticketType.sold}`,
              remainingCapacity: ticketType.capacity - ticketType.sold,
            });
            continue;
          }
        }

        // Atomically increment sold counter
        const updated = await tx.$executeRaw`
          UPDATE "EventTicketType" 
          SET "sold" = "sold" + ${quantity}, "updatedAt" = NOW()
          WHERE "id" = ${eventTicketTypeId} 
          AND ("capacity" IS NULL OR "sold" + ${quantity} <= "capacity")
        `;

        if (updated === 0) {
          // This means the capacity check failed (another transaction got there first)
          results.push({
            success: false,
            error: `Capacity reservation failed for ${ticketType.name}. Another transaction may have reserved the remaining capacity.`,
          });
          continue;
        }

        // Get updated capacity info
        const updatedTicketTypeResult = await tx.$queryRaw`
          SELECT sold, capacity 
          FROM "EventTicketType" 
          WHERE id = ${eventTicketTypeId}
        ` as any[];

        const updatedTicketType = updatedTicketTypeResult[0];
        results.push({
          success: true,
          remainingCapacity: updatedTicketType?.capacity 
            ? updatedTicketType.capacity - updatedTicketType.sold 
            : null,
        });
      }

      return results;
    });
  } catch (error) {
    console.error('[CAPACITY] Error reserving capacity:', error);
    throw new Error('Failed to reserve capacity');
  }
}

/**
 * Release capacity when tickets are cancelled or refunded
 */
export async function releaseCapacity(
  eventTicketTypeId: number,
  quantity: number = 1
): Promise<CapacityResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      // Get current sold count using raw SQL
      const ticketTypeResult = await tx.$queryRaw`
        SELECT id, sold, name 
        FROM "EventTicketType" 
        WHERE id = ${eventTicketTypeId}
      ` as any[];

      if (!ticketTypeResult || ticketTypeResult.length === 0) {
        return {
          success: false,
          error: `Ticket type ${eventTicketTypeId} not found`,
        };
      }

      const ticketType = ticketTypeResult[0];

      // Ensure we don't go below 0
      const newSold = Math.max(0, ticketType.sold - quantity);

      // Update sold counter using raw SQL
      await tx.$executeRaw`
        UPDATE "EventTicketType" 
        SET "sold" = ${newSold}, "updatedAt" = NOW()
        WHERE "id" = ${eventTicketTypeId}
      `;

      return {
        success: true,
        remainingCapacity: null, // Would need to fetch capacity to calculate this
      };
    });
  } catch (error) {
    console.error('[CAPACITY] Error releasing capacity:', error);
    return {
      success: false,
      error: 'Failed to release capacity',
    };
  }
}

/**
 * Check current capacity for a ticket type
 */
export async function checkCapacity(eventTicketTypeId: number): Promise<{
  capacity: number | null;
  sold: number;
  remaining: number | null;
  isSoldOut: boolean;
}> {
  try {
    const ticketTypeResult = await prisma.$queryRaw`
      SELECT capacity, sold 
      FROM "EventTicketType" 
      WHERE id = ${eventTicketTypeId}
    ` as any[];

    if (!ticketTypeResult || ticketTypeResult.length === 0) {
      throw new Error(`Ticket type ${eventTicketTypeId} not found`);
    }

    const ticketType = ticketTypeResult[0];
    const remaining = ticketType.capacity !== null ? ticketType.capacity - ticketType.sold : null;
    const isSoldOut = ticketType.capacity !== null && remaining <= 0;

    return {
      capacity: ticketType.capacity,
      sold: ticketType.sold,
      remaining,
      isSoldOut,
    };
  } catch (error) {
    console.error('[CAPACITY] Error checking capacity:', error);
    throw error;
  }
}

/**
 * Batch check capacity for multiple ticket types
 */
export async function checkBatchCapacity(
  eventTicketTypeIds: number[]
): Promise<Map<number, {
  capacity: number | null;
  sold: number;
  remaining: number | null;
  isSoldOut: boolean;
}>> {
  try {
    const ticketTypesResult = await prisma.$queryRaw`
      SELECT id, capacity, sold 
      FROM "EventTicketType" 
      WHERE id = ANY(${eventTicketTypeIds})
    ` as any[];

    const result = new Map();

    for (const ticketType of ticketTypesResult) {
      const remaining = ticketType.capacity !== null ? ticketType.capacity - ticketType.sold : null;
      const isSoldOut = ticketType.capacity !== null && remaining <= 0;

      result.set(ticketType.id, {
        capacity: ticketType.capacity,
        sold: ticketType.sold,
        remaining,
        isSoldOut,
      });
    }

    return result;
  } catch (error) {
    console.error('[CAPACITY] Error checking batch capacity:', error);
    throw error;
  }
}

/**
 * Transfer capacity between ticket types (for ticket transfers)
 */
export async function transferCapacity(
  fromEventTicketTypeId: number,
  toEventTicketTypeId: number,
  quantity: number = 1
): Promise<CapacityResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      // First, reserve capacity on destination
      const reserveResult = await reserveCapacity([{
        eventTicketTypeId: toEventTicketTypeId,
        quantity,
      }]);

      if (!reserveResult[0]?.success) {
        return {
          success: false,
          error: `Failed to reserve capacity on destination: ${reserveResult[0]?.error}`,
        };
      }

      // Then, release capacity on source
      const releaseResult = await releaseCapacity(fromEventTicketTypeId, quantity);

      if (!releaseResult.success) {
        // If release fails, we need to rollback the reservation
        await releaseCapacity(toEventTicketTypeId, quantity);
        return {
          success: false,
          error: `Failed to release capacity on source: ${releaseResult.error}`,
        };
      }

      return {
        success: true,
      };
    });
  } catch (error) {
    console.error('[CAPACITY] Error transferring capacity:', error);
    return {
      success: false,
      error: 'Failed to transfer capacity',
    };
  }
}
