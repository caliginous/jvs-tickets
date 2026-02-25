import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import prisma from '../../../../lib/prisma';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-08-01'
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id: bookingId } = req.query;
    const { cancellationSecret, reason } = req.body;

    if (!bookingId || typeof bookingId !== 'string') {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }

    if (!cancellationSecret || typeof cancellationSecret !== 'string') {
      return res.status(400).json({ error: 'Cancellation secret is required' });
    }

    if (!reason || typeof reason !== 'string') {
      return res.status(400).json({ error: 'Cancellation reason is required' });
    }

    // Get the order/booking details
    const order = await prisma.order.findUnique({
      where: { 
        id: bookingId,
        cancellationSecret: cancellationSecret
      },
      include: {
        user: true,
        eventDate: {
          include: {
            event: true
          }
        },
        tickets: {
          include: {
            eventTicketType: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Booking not found or invalid cancellation secret' });
    }

    // Check if already cancelled
    if (order.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    // Check if payment was made (we can only refund paid orders)
    if (!order.paymentIntent) {
      return res.status(400).json({ error: 'Cannot cancel unpaid booking' });
    }

    // Check if event is within cancellation window (e.g., 24 hours before event)
    if (order.eventDate.date) {
      const eventDate = new Date(order.eventDate.date);
      const now = new Date();
      const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilEvent < 24) {
        return res.status(400).json({ 
          error: 'Cannot cancel booking within 24 hours of the event' 
        });
      }
    }

    // Process refund through Stripe
    let refundId: string | null = null;
    let refundAmount: number | null = null;

    try {
      // Calculate refund amount (considering discounts)
      const totalAmount = order.finalTotal || order.originalTotal || 0;
      
      // Create refund in Stripe
      const refund = await stripe.refunds.create({
        payment_intent: order.paymentIntent,
        reason: 'requested_by_customer',
        metadata: {
          orderId: order.id,
          cancellationReason: reason,
          cancelledBy: 'customer'
        }
      });

      refundId = refund.id;
      refundAmount = refund.amount / 100; // Convert from cents to pounds (Stripe stores in cents)

      console.log('✅ [CUSTOMER CANCELLATION] Stripe refund processed:', {
        refundId: refund.id,
        amount: refundAmount,
        orderId: order.id
      });

    } catch (stripeError) {
      console.error('❌ [CUSTOMER CANCELLATION] Stripe refund failed:', stripeError);
      return res.status(500).json({ 
        error: 'Failed to process refund',
        details: stripeError instanceof Error ? stripeError.message : 'Unknown error'
      });
    }

    // Update order status and add cancellation details
    const updatedOrder = await prisma.order.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: 'customer',
        cancellationReason: reason,
        refundId: refundId,
        refundAmount: refundAmount,
        refundedAt: new Date()
      }
    });

    // Send cancellation email
    try {
      const { EmailTriggerService } = await import('../../../../lib/services/emailTriggerService');
      const emailService = new EmailTriggerService();
      
      await emailService.sendBookingCancellation({
        userEmail: order.user.email,
        userFirstName: order.user.firstName,
        userLastName: order.user.lastName,
        eventTitle: order.eventDate.event.title,
        eventDate: order.eventDate.date?.toLocaleDateString() || 'TBD',
        eventTime: order.eventDate.date ? new Date(order.eventDate.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'TBD',
        eventLocation: 'JVS Events',
        bookingId: order.id,
        seats: order.tickets.reduce((sum, ticket) => sum + ticket.amount, 0),
        total: `£${order.finalTotal || order.originalTotal || 0}`,
        locale: order.locale || 'en',
        cancellationReason: reason,
        cancelledBy: 'Customer',
        cancellationDate: new Date().toLocaleDateString(),
        refundAmount: `£${refundAmount?.toFixed(2) || '0.00'}`,
      });

      console.log('✅ [CUSTOMER CANCELLATION] Cancellation email sent successfully');
    } catch (emailError) {
      console.error('❌ [CUSTOMER CANCELLATION] Failed to send cancellation email:', emailError);
      // Don't fail the cancellation if email fails
    }

    // Log the cancellation
    console.log('✅ [CUSTOMER CANCELLATION] Booking cancelled successfully:', {
      orderId: order.id,
      cancelledBy: 'customer',
      reason: reason,
      refundId: refundId,
      refundAmount: refundAmount
    });

    return res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        orderId: order.id,
        status: 'CANCELLED',
        refundId: refundId,
        refundAmount: refundAmount,
        cancelledAt: updatedOrder.cancelledAt
      }
    });

  } catch (error) {
    console.error('❌ [CUSTOMER CANCELLATION] Error cancelling booking:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    await prisma.$disconnect();
  }
}
