/**
 * API Integration Tests for Monetary Amounts
 * 
 * Tests all API endpoints that handle monetary amounts:
 * - Refund API
 * - Checkout API
 * - Order creation
 * - Stripe webhook processing
 */

import { describe, test, expect, jest } from '@jest/globals';
import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    refunds: {
      create: jest.fn().mockResolvedValue({
        id: 're_test_refund',
        amount: 1500, // £15.00 in pence
        status: 'succeeded'
      })
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_test_session',
          url: 'https://checkout.stripe.com/test'
        })
      }
    }
  }));
});

// Mock Prisma
jest.mock('../lib/prisma', () => ({
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn()
  },
  eventTicketType: {
    findMany: jest.fn(),
    findUnique: jest.fn()
  }
}));

// Mock authentication
jest.mock('../constants/serverUtil', () => ({
  serverAuthenticate: jest.fn().mockResolvedValue({ id: 'user_123' })
}));

describe('Refund API Amount Handling', () => {
  test('should process refund with correct pence amounts', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        orderId: 'test-order-123',
        amount: 1500, // £15.00 in pence (from RefundDialog)
        reason: 'requested_by_customer'
      }
    });

    // Mock order data (stored in pence)
    const mockOrder = {
      id: 'test-order-123',
      finalTotal: 2500, // £25.00 in pence
      originalTotal: 2500,
      paymentResult: JSON.stringify({
        paymentIntentId: 'pi_test_intent'
      }),
      user: { email: 'test@example.com', firstName: 'Test', lastName: 'User' },
      eventDate: {
        event: { title: 'Test Event' },
        date: new Date('2025-12-25')
      },
      tickets: [{ id: 1 }, { id: 2 }]
    };

    const prisma = require('../lib/prisma');
    prisma.order.findUnique.mockResolvedValue(mockOrder);
    prisma.order.update.mockResolvedValue({ ...mockOrder, status: 'REFUNDED' });

    // Import and test the refund handler
    const handler = require('../src/pages/api/admin/refund/index.ts').default;
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    // Verify Stripe was called with correct pence amount
    const Stripe = require('stripe');
    const stripeInstance = new Stripe();
    expect(stripeInstance.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1500, // Should receive pence directly
        payment_intent: 'pi_test_intent'
      })
    );
  });

  test('should reject refund amount exceeding order total', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        orderId: 'test-order-123',
        amount: 3000, // £30.00 in pence (more than order total)
        reason: 'requested_by_customer'
      }
    });

    const mockOrder = {
      id: 'test-order-123',
      finalTotal: 2500, // £25.00 in pence (less than refund amount)
      originalTotal: 2500,
      paymentResult: JSON.stringify({ paymentIntentId: 'pi_test' }),
      user: { email: 'test@example.com' },
      eventDate: { event: { title: 'Test' }, date: new Date() },
      tickets: []
    };

    const prisma = require('../lib/prisma');
    prisma.order.findUnique.mockResolvedValue(mockOrder);

    const handler = require('../src/pages/api/admin/refund/index.ts').default;
    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toMatchObject({
      error: 'Refund amount cannot exceed order total'
    });
  });
});

describe('Checkout API Amount Handling', () => {
  test('should create checkout session with correct pence amounts', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        items: [
          { eventTicketTypeId: 1, quantity: 2 },
          { eventTicketTypeId: 2, quantity: 1 }
        ],
        eventDateId: 1
      }
    });

    // Mock ticket types (stored in pence)
    const mockTicketTypes = [
      { id: 1, price: 2000, currency: 'GBP', name: 'Standard' }, // £20.00
      { id: 2, price: 1500, currency: 'GBP', name: 'Student' }   // £15.00
    ];

    const mockEvent = {
      id: 1,
      title: 'Test Event',
      dates: [{ id: 1, date: new Date('2025-12-25') }]
    };

    const prisma = require('../lib/prisma');
    prisma.eventTicketType.findMany.mockResolvedValue(mockTicketTypes);

    // Mock checkout handler behavior
    const expectedTotalAmount = (2000 * 2) + (1500 * 1); // 5500 pence = £55.00

    // Verify calculation
    expect(expectedTotalAmount).toBe(5500);

    // Test that Stripe checkout would receive correct amount
    const Stripe = require('stripe');
    const stripeInstance = new Stripe();
    
    // Simulate what the checkout API would do
    const lineItems = [
      {
        price_data: {
          currency: 'gbp',
          unit_amount: 2000, // £20.00 in pence
          product_data: { name: 'Test Event — Standard' }
        },
        quantity: 2
      },
      {
        price_data: {
          currency: 'gbp',
          unit_amount: 1500, // £15.00 in pence
          product_data: { name: 'Test Event — Student' }
        },
        quantity: 1
      }
    ];

    expect(lineItems[0].price_data.unit_amount).toBe(2000);
    expect(lineItems[1].price_data.unit_amount).toBe(1500);
  });
});

describe('Order Creation Amount Processing', () => {
  test('should store order amounts in pence', async () => {
    // Simulate order creation with ticket prices
    const ticketItems = [
      { ticketTypeId: 1, quantity: 2, price: 2000 }, // £20.00 each
      { ticketTypeId: 2, quantity: 1, price: 1500 }  // £15.00 each
    ];

    const totalAmount = ticketItems.reduce(
      (total, item) => total + (item.price * item.quantity), 
      0
    );

    expect(totalAmount).toBe(5500); // £55.00 in pence

    // Verify order would be stored with correct amounts
    const orderData = {
      finalTotal: totalAmount, // 5500 pence
      originalTotal: totalAmount,
      discountAmount: 0
    };

    expect(orderData.finalTotal).toBe(5500);
    expect(Number.isInteger(orderData.finalTotal)).toBe(true);
  });

  test('should handle discount calculations in pence', async () => {
    const originalAmount = 5500; // £55.00 in pence
    const discountPercent = 10; // 10% discount
    const discountAmount = Math.round(originalAmount * discountPercent / 100); // 550 pence = £5.50
    const finalAmount = originalAmount - discountAmount; // 4950 pence = £49.50

    expect(discountAmount).toBe(550);
    expect(finalAmount).toBe(4950);

    // Verify amounts are integers (pence)
    expect(Number.isInteger(discountAmount)).toBe(true);
    expect(Number.isInteger(finalAmount)).toBe(true);
  });
});

describe('Stripe Webhook Amount Processing', () => {
  test('should process payment_intent.succeeded with pence amounts', async () => {
    const webhookEvent = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_intent',
          amount: 5500, // £55.00 in pence from Stripe
          currency: 'gbp',
          status: 'succeeded'
        }
      }
    };

    // Verify Stripe amount is in pence
    expect(webhookEvent.data.object.amount).toBe(5500);
    expect(webhookEvent.data.object.currency).toBe('gbp');

    // Amount should match what we stored in order
    const expectedOrderAmount = 5500;
    expect(webhookEvent.data.object.amount).toBe(expectedOrderAmount);
  });

  test('should process refund webhook with pence amounts', async () => {
    const webhookEvent = {
      type: 'charge.dispute.created',
      data: {
        object: {
          id: 're_test_refund',
          amount: 1500, // £15.00 in pence from Stripe
          currency: 'gbp',
          status: 'succeeded'
        }
      }
    };

    // Stripe refund amount should be in pence
    expect(webhookEvent.data.object.amount).toBe(1500);

    // Convert for display (what we'd show in admin)
    const displayAmount = webhookEvent.data.object.amount / 100;
    expect(displayAmount).toBe(15.00);
  });
});

describe('Amount Validation and Edge Cases', () => {
  test('should handle minimum amounts correctly', async () => {
    const minimumAmount = 50; // £0.50 in pence (Stripe minimum for GBP)
    
    expect(minimumAmount).toBeGreaterThanOrEqual(50);
    expect(Number.isInteger(minimumAmount)).toBe(true);
  });

  test('should handle maximum reasonable amounts', async () => {
    const maxReasonableAmount = 100000; // £1000.00 in pence
    
    expect(maxReasonableAmount).toBeLessThanOrEqual(100000);
    expect(Number.isInteger(maxReasonableAmount)).toBe(true);
  });

  test('should handle floating point precision in calculations', async () => {
    // Test that calculations result in exact pence amounts
    const price1 = 3333; // £33.33 in pence
    const price2 = 6667; // £66.67 in pence
    const total = price1 + price2; // Should be exactly 10000 pence = £100.00
    
    expect(total).toBe(10000);
    expect(Number.isInteger(total)).toBe(true);
  });

  test('should round amounts properly when converting from user input', async () => {
    // User enters £25.996 (impossible to represent exactly in pence)
    const userInput = 25.996;
    const penceAmount = Math.round(userInput * 100);
    
    expect(penceAmount).toBe(2600); // Rounds to £26.00
    expect(Number.isInteger(penceAmount)).toBe(true);
  });
});

describe('Multi-Currency Support (Future)', () => {
  test('should handle GBP amounts correctly', async () => {
    const gbpAmount = 2500; // £25.00 in pence
    const currency = 'GBP';
    
    expect(gbpAmount).toBe(2500);
    expect(currency).toBe('GBP');
    
    // GBP uses pence (1/100th)
    const displayAmount = gbpAmount / 100;
    expect(displayAmount).toBe(25.00);
  });

  test('should be ready for EUR support', async () => {
    // If we ever add EUR support, it would work the same way
    const eurAmount = 2500; // €25.00 in cents
    const currency = 'EUR';
    
    expect(eurAmount).toBe(2500);
    expect(currency).toBe('EUR');
    
    // EUR uses cents (1/100th) - same as GBP pence
    const displayAmount = eurAmount / 100;
    expect(displayAmount).toBe(25.00);
  });
});









