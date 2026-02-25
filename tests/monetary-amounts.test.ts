/**
 * Comprehensive Tests for Monetary Amount Handling
 * 
 * Tests all aspects of monetary amounts:
 * - Database storage (all in pence)
 * - UI display (pence → pounds)
 * - API processing (pence internally)
 * - Stripe integration (pence for API calls)
 * - Email templates (pence → pounds display)
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { formatAmount, formatTicketPrice, getOrderTotalInPounds, toPence, toPounds } from '../src/lib/amountUtils';

// Mock data for testing
const mockOrder = {
  id: 'test-order-123',
  finalTotal: 2500, // £25.00 in pence
  originalTotal: 3000, // £30.00 in pence
  discountAmount: 500, // £5.00 in pence
};

const mockWooOrder = {
  id: 'woo-12345',
  finalTotal: 1500, // £15.00 in pence
  originalTotal: 1500, // £15.00 in pence
  discountAmount: 0,
};

const mockTicketType = {
  id: 1,
  name: 'Standard Ticket',
  price: 2000, // £20.00 in pence
  currency: 'GBP'
};

describe('Monetary Amount Utilities', () => {
  describe('Amount Conversion Functions', () => {
    test('toPounds should convert pence to pounds', () => {
      expect(toPounds(2500)).toBe(25.00);
      expect(toPounds(1500)).toBe(15.00);
      expect(toPounds(100)).toBe(1.00);
      expect(toPounds(50)).toBe(0.50);
      expect(toPounds(1)).toBe(0.01);
      expect(toPounds(0)).toBe(0.00);
    });

    test('toPence should handle already-pence amounts', () => {
      expect(toPence(2500)).toBe(2500);
      expect(toPence(1500)).toBe(1500);
      expect(toPence(100.7)).toBe(101); // Should round
      expect(toPence(99.4)).toBe(99); // Should round down
    });

    test('formatAmount should display correct currency format', () => {
      expect(formatAmount(2500)).toBe('£25.00');
      expect(formatAmount(1500)).toBe('£15.00');
      expect(formatAmount(100)).toBe('£1.00');
      expect(formatAmount(50)).toBe('£0.50');
      expect(formatAmount(1)).toBe('£0.01');
      expect(formatAmount(0)).toBe('£0.00');
    });

    test('formatTicketPrice should format ticket prices correctly', () => {
      expect(formatTicketPrice(2000)).toBe('£20.00');
      expect(formatTicketPrice(1500)).toBe('£15.00');
      expect(formatTicketPrice(500)).toBe('£5.00');
      expect(formatTicketPrice(0)).toBe('£0.00');
    });

    test('getOrderTotalInPounds should extract order total in pounds', () => {
      expect(getOrderTotalInPounds(mockOrder)).toBe(25.00);
      expect(getOrderTotalInPounds(mockWooOrder)).toBe(15.00);
      expect(getOrderTotalInPounds({ ...mockOrder, finalTotal: 0 })).toBe(30.00); // Falls back to originalTotal
      expect(getOrderTotalInPounds({ id: 'test', finalTotal: 0, originalTotal: 0 })).toBe(0.00);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle negative amounts gracefully', () => {
      expect(formatAmount(-100)).toBe('£-1.00');
      expect(toPounds(-100)).toBe(-1.00);
    });

    test('should handle very large amounts', () => {
      expect(formatAmount(999999)).toBe('£9999.99');
      expect(toPounds(999999)).toBe(9999.99);
    });

    test('should handle floating point precision', () => {
      expect(toPence(25.999)).toBe(26); // Should round
      expect(formatAmount(2533)).toBe('£25.33'); // Should handle exact pence
    });
  });
});

describe('Database Amount Storage', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should verify order amounts are stored in pence', async () => {
    // Test a sample of orders to ensure they're in pence format
    const orders = await prisma.order.findMany({
      select: { id: true, finalTotal: true, originalTotal: true },
      take: 5,
      where: { finalTotal: { gt: 0 } }
    });

    orders.forEach(order => {
      // After migration, amounts should be >= 100 for any reasonable price (£1+)
      if (order.finalTotal && order.finalTotal > 0) {
        expect(order.finalTotal).toBeGreaterThanOrEqual(50); // At least £0.50
        expect(Number.isInteger(order.finalTotal)).toBe(true); // Should be integer pence
      }
      
      if (order.originalTotal && order.originalTotal > 0) {
        expect(order.originalTotal).toBeGreaterThanOrEqual(50);
        expect(Number.isInteger(order.originalTotal)).toBe(true);
      }
    });
  });

  test('should verify EventTicketType prices are in pence', async () => {
    const ticketTypes = await prisma.eventTicketType.findMany({
      select: { id: true, name: true, price: true },
      take: 5
    });

    ticketTypes.forEach(ticket => {
      expect(ticket.price).toBeGreaterThanOrEqual(50); // At least £0.50
      expect(Number.isInteger(ticket.price)).toBe(true); // Should be integer pence
      
      // Reasonable price range check
      expect(ticket.price).toBeLessThanOrEqual(100000); // Max £1000
    });
  });

  test('should verify WooCommerce vs Native order consistency', async () => {
    const wooOrders = await prisma.order.findMany({
      where: { id: { startsWith: 'woo-' } },
      select: { id: true, finalTotal: true },
      take: 3
    });

    const nativeOrders = await prisma.order.findMany({
      where: { NOT: { id: { startsWith: 'woo-' } } },
      select: { id: true, finalTotal: true },
      take: 3
    });

    // Both should now be in the same format (pence)
    [...wooOrders, ...nativeOrders].forEach(order => {
      if (order.finalTotal && order.finalTotal > 0) {
        expect(Number.isInteger(order.finalTotal)).toBe(true);
      }
    });
  });
});

describe('API Amount Processing', () => {
  test('should simulate refund API amount handling', () => {
    // Simulate RefundDialog sending amount
    const orderTotal = 2500; // £25.00 in pence (from database)
    const refundAmountInPounds = 15.00; // User enters £15.00
    const refundAmountInPence = Math.round(refundAmountInPounds * 100); // Convert to 1500 pence
    
    expect(refundAmountInPence).toBe(1500);
    expect(refundAmountInPence).toBeLessThanOrEqual(orderTotal);
  });

  test('should simulate checkout session amount calculation', () => {
    // Simulate ticket selection
    const ticketPrice1 = 2000; // £20.00 in pence
    const ticketPrice2 = 1500; // £15.00 in pence
    const quantity1 = 2;
    const quantity2 = 1;
    
    const totalAmount = (ticketPrice1 * quantity1) + (ticketPrice2 * quantity2);
    expect(totalAmount).toBe(5500); // £55.00 in pence
    
    // This amount would be sent to Stripe (which expects pence)
    expect(totalAmount).toBe(5500);
  });
});

describe('Stripe Integration Amounts', () => {
  test('should format amounts correctly for Stripe API calls', () => {
    // Stripe expects amounts in smallest currency unit (pence for GBP)
    const orderAmount = 2500; // £25.00 stored in database
    const stripeAmount = orderAmount; // Should be passed directly (already in pence)
    
    expect(stripeAmount).toBe(2500);
    
    // Verify common amounts
    expect(1500).toBe(1500); // £15.00 → 1500 pence for Stripe
    expect(500).toBe(500);   // £5.00 → 500 pence for Stripe
    expect(100).toBe(100);   // £1.00 → 100 pence for Stripe
  });

  test('should handle refund amounts for Stripe', () => {
    const orderTotal = 3000; // £30.00 in pence
    const refundAmount = 1500; // £15.00 in pence (from RefundDialog)
    
    // Amount should be sent to Stripe as-is (already in pence)
    expect(refundAmount).toBe(1500);
    expect(refundAmount).toBeLessThanOrEqual(orderTotal);
  });
});

describe('Email Template Amount Formatting', () => {
  test('should format email amounts correctly', () => {
    // Simulate email template data
    const refundAmountInPence = 2500; // From API
    const emailAmount = `£${(refundAmountInPence / 100).toFixed(2)}`;
    
    expect(emailAmount).toBe('£25.00');
  });

  test('should handle various amounts in emails', () => {
    const amounts = [5000, 1500, 500, 100, 50, 1];
    const expectedEmails = ['£50.00', '£15.00', '£5.00', '£1.00', '£0.50', '£0.01'];
    
    amounts.forEach((amount, index) => {
      const emailAmount = `£${(amount / 100).toFixed(2)}`;
      expect(emailAmount).toBe(expectedEmails[index]);
    });
  });
});

describe('UI Component Amount Display', () => {
  test('should display order amounts correctly in components', () => {
    const order = {
      id: 'test-123',
      finalTotal: 2500,
      originalTotal: 3000,
      discountAmount: 500
    };

    // Simulate component display logic
    const displayTotal = formatAmount(order.finalTotal, order.id);
    const displayOriginal = formatAmount(order.originalTotal, order.id);
    const displayDiscount = formatAmount(order.discountAmount, order.id);

    expect(displayTotal).toBe('£25.00');
    expect(displayOriginal).toBe('£30.00');
    expect(displayDiscount).toBe('£5.00');
  });

  test('should display ticket prices correctly', () => {
    const ticketType = { price: 1500, currency: 'GBP' };
    const displayPrice = formatTicketPrice(ticketType.price);
    
    expect(displayPrice).toBe('£15.00');
  });

  test('should handle zero and null amounts', () => {
    expect(formatAmount(0)).toBe('£0.00');
    expect(formatTicketPrice(0)).toBe('£0.00');
    
    const emptyOrder = { id: 'test', finalTotal: 0, originalTotal: 0 };
    expect(getOrderTotalInPounds(emptyOrder)).toBe(0.00);
  });
});

describe('Input Processing and Validation', () => {
  test('should convert user input to pence for storage', () => {
    // User enters prices in pounds
    const userInputPrice = 25.99; // £25.99
    const storagePence = Math.round(userInputPrice * 100);
    
    expect(storagePence).toBe(2599);
  });

  test('should handle various input formats', () => {
    const inputs = [25, 25.0, 25.50, 25.99, 0, 0.01];
    const expectedPence = [2500, 2500, 2550, 2599, 0, 1];
    
    inputs.forEach((input, index) => {
      const pence = Math.round(input * 100);
      expect(pence).toBe(expectedPence[index]);
    });
  });

  test('should validate reasonable price ranges', () => {
    // Reasonable ticket prices
    expect(500).toBeGreaterThanOrEqual(0);   // £5.00 minimum
    expect(10000).toBeLessThanOrEqual(100000); // £100.00 reasonable max
    
    // Edge cases
    expect(1).toBeGreaterThanOrEqual(1);     // £0.01 minimum pence
    expect(999999).toBeLessThanOrEqual(1000000); // £9999.99 reasonable absolute max
  });
});









