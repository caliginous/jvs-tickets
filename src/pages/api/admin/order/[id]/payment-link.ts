import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../../lib/prisma";
import { createPaymentLink } from "../../../../../lib/stripe";
import { serverAuthenticate } from "../../../../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../../../../constants/interfaces";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const actor = await serverAuthenticate(req, res, {
    permission: PermissionSection.Orders,
    permissionType: PermissionType.Write
  });
  if (!actor) return;

  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    // Get the order with related data
    const order = await prisma.order.findUnique({
      where: { id: id },
      include: {
        eventDate: {
          include: {
            event: true
          }
        },
        tickets: {
          include: {
            eventTicketType: true
          }
        },
        user: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if order is already paid
    if (order.status === "PAID") {
      return res.status(400).json({ error: "Order is already paid" });
    }

    // Check if order already has a payment link
    if (order.paymentResult) {
      const paymentResult = JSON.parse(order.paymentResult);
      if (paymentResult.stripePaymentLinkUrl) {
        return res.status(200).json({ 
          paymentLink: paymentResult.stripePaymentLinkUrl,
          message: "Existing payment link found"
        });
      }
    }

    // Generate new Stripe payment link
    try {
      const eventName = order.eventDate?.event?.title || 'Event';
      const eventDateStr = order.eventDate?.date.toISOString() || '';
      
      // Prepare ticket details
      const ticketDetails = order.tickets.map(ticket => ({
        ticketTypeId: ticket.eventTicketTypeId ?? 0,
        amount: ticket.amount,
        price: ticket.eventTicketType?.price ?? 0,
        name: ticket.eventTicketType?.name ?? 'Ticket'
      }));

      // Create Stripe payment link
      const stripePaymentLink = await createPaymentLink({
        tickets: ticketDetails,
        eventDateId: order.eventDateId,
        eventName: eventName,
        eventDate: eventDateStr,
        customerEmail: order.user?.email || '',
        orderId: order.id,
        successUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tickets.jvs.org.uk'}/checkout/success?session_id=admin_${order.id}`,
        cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tickets.jvs.org.uk'}/checkout/cancel`,
        finalTotal: order.finalTotal,
        originalTotal: order.originalTotal
      });

      // Update order with payment link
      const updatedPaymentResult = {
        ...JSON.parse(order.paymentResult || '{}'),
        stripePaymentLinkUrl: stripePaymentLink.url,
        stripePaymentLinkId: stripePaymentLink.id,
        lastPaymentLinkGenerated: new Date().toISOString()
      };

      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentResult: JSON.stringify(updatedPaymentResult)
        }
      });

      console.log(`[admin/order/[id]/payment-link] ✅ Generated new Stripe payment link for order ${order.id}: ${stripePaymentLink.url}`);

      return res.status(200).json({
        paymentLink: stripePaymentLink.url,
        message: "New payment link generated successfully"
      });

    } catch (stripeError) {
      console.error(`[admin/order/[id]/payment-link] ❌ Error creating Stripe payment link for order ${order.id}:`, stripeError);
      return res.status(500).json({
        error: "Failed to generate Stripe payment link",
        message: "Please try again or contact support if the issue persists"
      });
    }

  } catch (error) {
    console.error("Error in payment-link endpoint:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
