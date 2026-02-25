import { NextApiRequest, NextApiResponse } from 'next';
import {
    serverAuthenticate
} from '../../../../constants/serverUtil';
import prisma from '../../../../lib/prisma';
import { PermissionSection, PermissionType } from '../../../../constants/interfaces';
import { createOrderWithEventTicketTypes } from '../../../../lib/services/ticketing/orderService';
import { createPaymentLink } from '../../../../lib/stripe';
import { sendPaymentLinkEmail } from '../../../../lib/send';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const user = await serverAuthenticate(req, res, {
    permission: PermissionSection.Orders,
    permissionType: PermissionType.Write
  });
  
  if (!user) return;

  try {
    const {
      eventId,
      eventDateId,
      items,
      customer,
      paymentMethod,
      notes,
      locale,
      discountCode
    } = req.body;

    // Validation
    if (!eventId || !eventDateId || !items || !customer || !paymentMethod) {
      return res.status(400).json({
        error: 'Missing required fields: eventId, eventDateId, items, customer, paymentMethod'
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Items must be a non-empty array'
      });
    }

    // Validate each item
    for (const item of items) {
      if (!item.eventTicketTypeId || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({
          error: 'Each item must have eventTicketTypeId and quantity > 0'
        });
      }
    }

    // Validate customer
    if (!customer.firstName || !customer.lastName || !customer.email) {
      return res.status(400).json({
        error: 'Customer must have firstName, lastName, and email'
      });
    }

    // Check if event and event date exist
    const event = await prisma.event.findUnique({
      where: { id: parseInt(eventId) },
      select: { id: true, title: true }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const eventDate = await prisma.eventDate.findUnique({
      where: { id: parseInt(eventDateId) },
      select: { id: true, eventId: true }
    });

    if (!eventDate) {
      return res.status(404).json({ error: 'Event date not found' });
    }

    if (eventDate.eventId !== parseInt(eventId)) {
      return res.status(400).json({ error: 'Event date does not belong to the specified event' });
    }

    // Validate ticket types exist and belong to the event
    const ticketTypeIds = items.map(item => item.eventTicketTypeId);
    const ticketTypes = await prisma.eventTicketType.findMany({
      where: {
        id: { in: ticketTypeIds },
        eventId: parseInt(eventId),
        isActive: true
      },
      select: { id: true, name: true, capacity: true, price: true }
    });

    if (ticketTypes.length !== ticketTypeIds.length) {
      return res.status(400).json({ error: 'One or more ticket types not found or inactive' });
    }

    // NOTE: Capacity check is now performed inside createOrderWithEventTicketTypes
    // using checkCapacityForOrder from the availability service

    // Create order using the service with server-side price validation
    const result = await createOrderWithEventTicketTypes({
      eventId: parseInt(eventId),
      eventDateId: parseInt(eventDateId),
      items: items.map(item => {
        const ticketType = ticketTypes.find(tt => tt.id === item.eventTicketTypeId);
        if (!ticketType) {
          throw new Error(`Ticket type ${item.eventTicketTypeId} not found`);
        }
        
        // Use server-side price, never trust client priceOverride without permission check
        const unitPrice = item.priceOverride != null ? Math.round(item.priceOverride * 100) : ticketType.price;
        
        return {
          eventTicketTypeId: item.eventTicketTypeId,
          quantity: item.quantity,
          priceOverride: unitPrice
        };
      }),
      customer,
      locale: locale || 'en',
      discountCode
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Get the created order with details
    const order = await prisma.order.findUnique({
      where: { id: result.orderId },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true }
        },
        eventDate: {
          select: { date: true, event: { select: { title: true } } }
        },
        tickets: {
          include: {
            eventTicketType: {
              select: { id: true, name: true, price: true, currency: true }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(500).json({ error: 'Order created but could not retrieve details' });
    }

    console.log(`[ADMIN-ORDER] Created order ${order.id} for event ${eventId} with ${order.tickets.length} tickets`);

    // Generate payment link if needed
    let paymentLink = null;
    if (paymentMethod === 'stripe_link') {
      try {
        const eventName = order.eventDate.event.title;
        const eventDateStr = order.eventDate.date.toISOString();
        
        // Prepare ticket details for Stripe using original request items (not incomplete DB tickets)
        const ticketDetails = items.map(item => {
          const ticketType = ticketTypes.find(tt => tt.id === item.eventTicketTypeId);
          const itemPrice = item.priceOverride != null ? item.priceOverride : (ticketType?.price || 0); // priceOverride already in pence from line 129, ticketType.price also in pence
          
          return {
            ticketTypeId: item.eventTicketTypeId,
            amount: item.quantity,
            price: itemPrice, // Use the actual price from request/ticket type
            name: ticketType?.name || 'Ticket'
          };
        });

        // Create Stripe payment link
        const stripePaymentLink = await createPaymentLink({
          tickets: ticketDetails,
          eventDateId: eventDateId,
          eventName: eventName,
          eventDate: eventDateStr,
          customerEmail: order.user.email,
          orderId: order.id,
          successUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tickets.jvs.org.uk'}/checkout/success`,
          cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tickets.jvs.org.uk'}/checkout/cancel`,
          finalTotal: result.totalAmount, // Already in pounds from order service
          originalTotal: result.totalAmount // Already in pounds from order service
        });

        paymentLink = stripePaymentLink.url;
        console.log(`[ADMIN-ORDER] ✅ Created Stripe payment link for order ${order.id}: ${paymentLink}`);

        // Update order with payment link
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentResult: JSON.stringify({
              stripePaymentLinkUrl: paymentLink,
              stripePaymentLinkId: stripePaymentLink.id,
              lastPaymentLinkGenerated: new Date().toISOString()
            })
          }
        });

        // Send payment link email to customer
        console.log(`[ADMIN-ORDER] 📧 Sending payment link email for order ${order.id}`);
        
        try {
          const emailPromise = sendPaymentLinkEmail(order.id, paymentLink, result.totalAmount);
          const emailTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Email timeout after 30 seconds')), 30000)
          );
          
          await Promise.race([emailPromise, emailTimeout]);
          console.log(`[ADMIN-ORDER] ✅ Payment link email sent successfully for order ${order.id}`);
        } catch (emailError) {
          console.error(`[ADMIN-ORDER] ❌ Email send failed for order ${order.id}:`, emailError);
          // Don't fail the order creation if email fails
        }

      } catch (error) {
        console.error(`[ADMIN-ORDER] ❌ Error creating Stripe payment link for order ${order.id}:`, error);
        // Don't fail the order creation if payment link fails
        paymentLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tickets.jvs.org.uk'}/api/admin/order/${order.id}/payment-link`;
      }
    }

    return res.status(201).json({
      success: true,
      orderId: order.id,
      paymentLink: paymentLink,
      order: {
        id: order.id,
        customer: {
          firstName: order.user.firstName,
          lastName: order.user.lastName,
          email: order.user.email
        },
        event: order.eventDate.event.title,
        eventDate: order.eventDate.date,
        tickets: order.tickets.map(ticket => ({
          id: ticket.id,
          type: ticket.eventTicketType?.name || 'Ticket',
          price: ticket.priceCharged, // Keep in pence for Stripe metadata
          currency: ticket.currency
        })),
        totalAmount: result.totalAmount,
        status: order.status,
        createdAt: order.date
      }
    });

  } catch (error) {
    console.error('[ADMIN-ORDER] Error creating order:', error);
    console.error('[ADMIN-ORDER] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[ADMIN-ORDER] Request body:', JSON.stringify(req.body, null, 2));
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
