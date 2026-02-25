import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";
import { v4 as uuid } from "uuid";
import { generateSecret } from "../../../../constants/serverUtil";
import { createPaymentLink } from "../../../../lib/stripe";
import { send, sendPaymentLinkEmail } from "../../../../lib/send";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { 
      eventDateId, 
      customerEmail, 
      customerFirstName, 
      customerLastName, 
      customerPhone, 
      tickets, 
      notes, 
      paymentMethod, 
      total 
    } = req.body;
    
    console.log(`[admin/order/create-simple] 🔍 Received request data:`, {
      eventDateId,
      customerEmail,
      customerFirstName,
      customerLastName,
      customerPhone,
      tickets: tickets ? `${tickets.length} tickets` : 'undefined',
      notes,
      paymentMethod,
      total
    });
    
    if (tickets && tickets.length > 0) {
      console.log(`[admin/order/create-simple] 🔍 First ticket structure:`, JSON.stringify(tickets[0], null, 2));
    }

    // Validate required fields
    if (!eventDateId || !customerEmail || !customerFirstName || !customerLastName || !tickets || tickets.length === 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    // Validate ticket structure (use eventTicketTypeId - Category deprecated)
    for (const ticket of tickets) {
      // Quantity: prefer explicit 'quantity', then legacy 'amount', default 1
      const qtyRaw = (ticket.quantity ?? ticket.amount ?? 1);
      const quantity = Number.isFinite(Number(qtyRaw)) ? Number(qtyRaw) : 1;

      if (!ticket.eventTicketTypeId) {
        console.error(`[admin/order/create-simple] ❌ Invalid ticket data (missing eventTicketTypeId):`, ticket);
        return res.status(400).json({ error: "Invalid ticket data", details: "Missing eventTicketTypeId" });
      }
      if (quantity <= 0) {
        console.error(`[admin/order/create-simple] ❌ Invalid ticket quantity:`, ticket);
        return res.status(400).json({ error: "Invalid ticket data", details: "Quantity must be >= 1" });
      }

      ticket.amount = quantity;
    }

    // Validate event exists
    const eventDate = await prisma.eventDate.findUnique({
      where: { id: eventDateId },
      include: { event: true }
    });

    if (!eventDate) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Create or find user
    let user = await prisma.user.findUnique({
      where: { email: customerEmail } as any
    });

    let userCreated = false;
    if (!user) {
      user = await prisma.user.create({
        data: {
          firstName: customerFirstName,
          lastName: customerLastName,
          email: customerEmail,
          phone: customerPhone || null,
          address: "Address not provided",
          zip: "ZIP not provided",
          city: "City not provided",
          countryCode: "GB",
          regionCode: "",
          customFields: null,
        }
      });
      userCreated = true;
      console.log(`[admin/order/create-simple] ✅ Created new user: ${user.id}`);
    }

    // Determine order status based on payment method
    let orderStatus = "PENDING";
    let paymentType = "manual";
    
    switch (paymentMethod) {
      case "stripe_link":
        orderStatus = "PENDING";
        paymentType = "stripe";
        break;
      case "manual_paid":
        orderStatus = "PAID";
        paymentType = "manual";
        break;
      case "invoice":
        orderStatus = "PENDING";
        paymentType = "invoice";
        break;
      case "free":
        orderStatus = "PAID";
        paymentType = "free";
        break;
      default:
        orderStatus = "PENDING";
        paymentType = "manual";
    }

    // Create the order
    const order = await prisma.order.create({
      data: {
        eventDateId: parseInt(eventDateId),
        userId: user.id,
        paymentType: paymentType,
        locale: "en",
        shipping: JSON.stringify({}),
        idempotencyKey: `admin-create-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
        cancellationSecret: generateSecret(),
        paymentResult: JSON.stringify({
          adminCreated: true,
          paymentMethod: paymentMethod,
          createdAt: new Date().toISOString(),
          notes: notes || ""
        }),
        status: orderStatus,
        finalTotal: Math.round(parseFloat(total || "0") * 100), // Convert pounds to pence
        originalTotal: Math.round(parseFloat(total || "0") * 100), // Convert pounds to pence
        customFields: null // Admin-created orders don't have custom fields
      }
    });

    // Create tickets (use eventTicketTypeId - Category deprecated)
    for (const ticket of tickets) {
      await prisma.ticket.create({
        data: {
          orderId: order.id,
          eventTicketTypeId: ticket.eventTicketTypeId,
          amount: ticket.quantity || ticket.amount || 1, // Use quantity from frontend
          secret: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        }
      });
    }

    // Generate payment link if needed
    let paymentLink = null;
    if (paymentMethod === "stripe_link") {
      try {
        // Get event details for the payment link
        const eventName = eventDate.event?.title || 'Event';
        const eventDateStr = eventDate.date.toISOString();
        
            // Get ticket type names and prices (use EventTicketType - Category deprecated)
    console.log(`[admin/order/create-simple] 🔍 Processing ${tickets.length} tickets:`, JSON.stringify(tickets, null, 2));
    
    const ticketDetails = await Promise.all(tickets.map(async (ticket) => {
      const ticketType = await prisma.eventTicketType.findUnique({
        where: { id: ticket.eventTicketTypeId }
      });
      
      // Handle the frontend data structure correctly
      // Frontend sends: { eventTicketTypeId: 19, quantity: 1, price: 3 }
      // This means: 1 ticket at £3 each
      let ticketQuantity, ticketPrice;
      
      // Use the actual quantity from frontend
      ticketQuantity = ticket.quantity || ticket.amount || 1;
      
      // Handle price: accept 0 as valid, use Number.isFinite for parsing
      const priceNum = (ticket.price !== undefined && ticket.price !== null) ? Number(ticket.price) : NaN;
      if (!Number.isNaN(priceNum) && priceNum >= 0) {
        // Frontend price is in pounds, convert to pence
        ticketPrice = Math.round(priceNum * 100);
        console.log(`[admin/order/create-simple] 🔍 Using frontend price: ${priceNum} pounds (${ticketPrice} pence) for ${ticketQuantity} ticket(s)`);
      } else {
        // EventTicketType price is already in pence
        ticketPrice = ticketType?.price ?? 0;
        console.log(`[admin/order/create-simple] 🔍 No/invalid frontend price, using ticket type price: ${ticketPrice} pence (£${(ticketPrice/100).toFixed(2)}) for ${ticketQuantity} ticket(s)`);
      }
      
      const ticketDetail = {
        ticketTypeId: ticket.eventTicketTypeId,
        amount: ticketQuantity, // This will be used as quantity in Stripe
        price: ticketPrice, // Use ticket type price
        name: ticketType?.name || 'Ticket'
      };
      console.log(`[admin/order/create-simple] 🔍 Ticket detail:`, ticketDetail);
      return ticketDetail;
    }));
    
    // Calculate the correct total based on actual ticket prices and quantities
    const calculatedTotal = ticketDetails.reduce((sum, ticket) => sum + (ticket.price * ticket.amount), 0);
    console.log(`[admin/order/create-simple] 🔍 Calculated total: ${calculatedTotal}, Frontend total: ${total}`);
    
    // Use the calculated total if it's significantly different from frontend total
    const totalInPence = Math.round(parseFloat(total || "0") * 100);
    const finalTotal = Math.abs(calculatedTotal - totalInPence) > 1 ? calculatedTotal : totalInPence; // Compare in pence
    
    console.log(`[admin/order/create-simple] 🔍 Final ticket details:`, JSON.stringify(ticketDetails, null, 2));

        // Create real Stripe payment link
        const stripePaymentLink = await createPaymentLink({
          tickets: ticketDetails,
          eventDateId: eventDateId,
          eventName: eventName,
          eventDate: eventDateStr,
          customerEmail: customerEmail,
          orderId: order.id,
          successUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tickets.jvs.org.uk'}/checkout/success?session_id=admin_${order.id}`,
          cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tickets.jvs.org.uk'}/checkout/cancel`,
          finalTotal: finalTotal,
          originalTotal: finalTotal
        });

        paymentLink = stripePaymentLink.url;
        console.log(`[admin/order/create-simple] ✅ Created Stripe payment link: ${paymentLink}`);
        
        // Send payment link email to customer (using Mailgun API - reliable and fast)
        console.log(`[admin/order/create-simple] 📧 Sending payment link email for order ${order.id} via Mailgun API`);
        
        // Send email and wait for it to complete (with timeout)
        try {
            const emailPromise = sendPaymentLinkEmail(order.id, paymentLink, finalTotal);
            const emailTimeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Email timeout after 30 seconds')), 30000)
            );
            
            await Promise.race([emailPromise, emailTimeout]);
            console.log(`[admin/order/create-simple] ✅ Payment link email sent successfully for order ${order.id}`);
        } catch (emailError) {
            console.error(`[admin/order/create-simple] ❌ Email send failed for order ${order.id}:`, emailError);
            // Don't fail the order creation if email fails
        }
      } catch (error) {
        console.error('[admin/order/create-simple] ❌ Error creating Stripe payment link:', error);
        // Fallback to API endpoint that will generate payment link
        paymentLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tickets.jvs.org.uk'}/api/admin/order/${order.id}/payment-link`;
      }
    }

    // Create task if manual processing is needed
    if (paymentMethod === "invoice" || paymentMethod === "manual_paid") {
      await prisma.task.create({
        data: {
          order: { connect: { id: order.id } },
          notes: JSON.stringify([
            `Order created by admin via ${paymentMethod}`,
            notes ? `Notes: ${notes}` : null
          ].filter(Boolean))
        }
      });
    }

    // Send confirmation email for paid orders
    if (orderStatus === "PAID") {
      try {
        console.log(`[admin/order/create-simple] 📧 Sending confirmation email for paid order ${order.id}`);
        await send(order.id);
        console.log(`[admin/order/create-simple] ✅ Confirmation email sent successfully for order ${order.id}`);
      } catch (emailError) {
        console.error(`[admin/order/create-simple] ❌ Failed to send confirmation email for order ${order.id}:`, emailError);
        // Don't fail the order creation if email fails
      }
    }

    console.log(`[admin/order/create-simple] ✅ Created order ${order.id} with ${tickets.length} tickets`);

    // Send response immediately to avoid timeout
    res.status(201).json({
      orderId: order.id,
      paymentLink: paymentLink,
      status: orderStatus,
      message: "Order created successfully"
    });
    
    console.log(`[admin/order/create-simple] ✅ Response sent to frontend for order ${order.id}`);

  } catch (error) {
    console.error("Error creating simple order:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
}
