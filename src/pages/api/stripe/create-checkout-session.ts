import { NextApiRequest, NextApiResponse } from 'next';
import { createCheckoutSession } from '../../../lib/stripe';
import prisma from '../../../lib/prisma';
import { checkCapacityForOrder } from '../../../lib/services/ticketing/availability';
import { validateClaimSession, createOrderWithWaitlistFulfilment } from '../../../lib/services/waitlist/claimSessionValidator';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let orderId: string | null = null; // Declare here so it's accessible in catch block for rollback

  try {
    console.log('=== STRIPE CHECKOUT SESSION API START ===');
    console.log('Request body:', req.body);

    // Parse request body
    const { tickets, eventDateId, eventName, eventDate, customerEmail, customerData, discountInfo, finalTotal, originalTotal } = req.body;

    // Validate required fields
    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      console.error('❌ Validation failed: No tickets provided');
      return res.status(400).json({ error: 'Tickets are required' });
    }

    if (!eventDateId || !eventName || !eventDate || !customerEmail) {
      console.error('❌ Validation failed: Missing required fields', { eventDateId, eventName, eventDate, customerEmail });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate customer data if provided
    if (customerData && (!customerData.firstName || !customerData.lastName)) {
      console.error('❌ Validation failed: Customer data incomplete', customerData);
      return res.status(400).json({ error: 'Customer data incomplete' });
    }

    // Validate ticket structure and normalize field names
    // Accept both ticketTypeId and categoryId for backwards compatibility
    for (const ticket of tickets) {
      // Normalize: if categoryId is provided but not ticketTypeId, use categoryId
      if (!ticket.ticketTypeId && ticket.categoryId) {
        ticket.ticketTypeId = ticket.categoryId;
      }
      
      if (!ticket.ticketTypeId || !ticket.amount || ticket.price === undefined || ticket.price === null || !ticket.name) {
        console.error('❌ Validation failed: Invalid ticket structure', ticket);
        return res.status(400).json({ error: 'Invalid ticket structure - ticketTypeId or categoryId required' });
      }
    }

    // TICKET SALE END DATE CHECK: Validate sales haven't ended
    console.log('🕐 Checking ticket sale end date...');
    
    const eventDateForSaleCheck = await prisma.eventDate.findUnique({
      where: { id: eventDateId },
      select: { ticketSaleEndDate: true, totalTicketLimit: true }
    });
    
    if (eventDateForSaleCheck?.ticketSaleEndDate) {
      const now = new Date();
      const saleEndDate = new Date(eventDateForSaleCheck.ticketSaleEndDate);
      
      if (now > saleEndDate) {
        console.error(`❌ Ticket sales have ended: sale ended at ${saleEndDate.toISOString()}, current time ${now.toISOString()}`);
        return res.status(409).json({ 
          error: 'Sorry, ticket sales for this event have ended',
          saleEndDate: saleEndDate.toISOString()
        });
      }
      console.log(`✅ Ticket sale end date check passed: sales end at ${saleEndDate.toISOString()}`);
    }

    // WAITLIST CLAIM SESSION: check for controlled capacity bypass
    const { claimSessionToken } = req.body;
    let claimSessionValidation: Awaited<ReturnType<typeof validateClaimSession>> | null = null;

    if (claimSessionToken) {
      console.log('🎫 Validating waitlist claim session...');
      claimSessionValidation = await validateClaimSession({
        claimSessionToken,
        eventDateId,
        tickets: tickets.map(t => ({
          eventTicketTypeId: t.ticketTypeId,
          quantity: t.amount,
        })),
      });

      if (!claimSessionValidation.valid) {
        const validationError = 'error' in claimSessionValidation ? claimSessionValidation.error : 'Validation failed';
        console.error(`❌ Claim session validation failed: ${validationError}`);
        return res.status(400).json({ error: validationError });
      }

      console.log('✅ Waitlist claim session validated - bypassing standard capacity check');
    }

    // CAPACITY CHECK: Use canonical availability service (skipped for valid claim sessions)
    if (!claimSessionValidation?.valid) {
      console.log('🔒 Checking ticket capacity via availability service...');
      
      const capacityItems = tickets.map(t => ({
        eventTicketTypeId: t.ticketTypeId,
        quantity: t.amount
      }));
      
      const capacityCheck = await checkCapacityForOrder(eventDateId, capacityItems);
      
      if (!capacityCheck.success) {
        const errorMessage = 'error' in capacityCheck ? capacityCheck.error : 'Capacity check failed';
        const errorDetails = 'details' in capacityCheck ? capacityCheck.details : undefined;
        console.error(`❌ Capacity check failed: ${errorMessage}`);
        return res.status(409).json({ 
          error: errorMessage,
          details: errorDetails
        });
      }
    }
    
    console.log('✅ All capacity checks passed');

    // Calculate totals
    // Debug logging to see what values are being received
    console.log('💰 Amount calculation:', {
      finalTotal_received: finalTotal,
      originalTotal_received: originalTotal,
      tickets_sample: tickets[0] ? { price: tickets[0].price, amount: tickets[0].amount } : null
    });
    
    const totalAmount = finalTotal !== undefined && finalTotal !== null 
      ? finalTotal 
      : tickets.reduce((sum, ticket) => sum + (ticket.price * ticket.amount), 0);
    const isFreeEvent = totalAmount === 0;
    
    console.log('💰 Calculated totalAmount:', totalAmount, 'isFreeEvent:', isFreeEvent);

    if (isFreeEvent) {
      console.log('📋 Free event detected, redirecting to free registration API...');
      
      // Redirect to the free event registration endpoint
      return res.status(200).json({ 
        redirectToFreeRegistration: true,
        freeRegistrationEndpoint: '/api/free-event/register',
        isFreeEvent: true,
        totalAmount: totalAmount,
        message: 'This is a free event - registration will be processed without payment'
      });
    }

    // Create PENDING order to reserve capacity
    orderId = `stripe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('📝 Creating PENDING order to reserve tickets...');
    
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: customerEmail }
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: customerEmail,
          firstName: customerData?.firstName || 'Customer',
          lastName: customerData?.lastName || 'Customer',
          phone: customerData?.phone || '',
          address: customerData?.address || '',
          zip: customerData?.zip || '',
          city: customerData?.city || '',
          countryCode: customerData?.countryCode || 'GB',
          regionCode: customerData?.regionCode || '',
          customFields: customerData?.customFields ? JSON.stringify(customerData.customFields) : null
        }
      });
    }
    
    const originalTotalInPence = Math.round(originalTotal || 0);
    const finalTotalInPence = Math.round(totalAmount);
    const discountInPence = originalTotal && totalAmount ? Math.round(originalTotal - totalAmount) : 0;
    
    console.log('💾 Storing order with values (in pence):', {
      originalTotal: originalTotalInPence,
      finalTotal: finalTotalInPence,
      discountAmount: discountInPence
    });

    // Build ticket rows for creation
    const ticketRows: Array<{
      eventTicketTypeId: number;
      amount: number;
      priceCharged: number;
      secret: string;
      firstName: string;
      lastName: string;
    }> = [];
    for (const ticket of tickets) {
      for (let i = 0; i < ticket.amount; i++) {
        ticketRows.push({
          eventTicketTypeId: ticket.ticketTypeId,
          amount: 1,
          priceCharged: ticket.price,
          secret: Math.random().toString(36).substr(2, 15),
          firstName: customerData?.firstName || '',
          lastName: customerData?.lastName || '',
        });
      }
    }

    const orderData = {
      paymentType: 'stripe',
      shipping: 'digital',
      locale: 'en',
      idempotencyKey: orderId,
      cancellationSecret: Math.random().toString(36).substr(2, 15),
      originalTotal: originalTotalInPence,
      finalTotal: finalTotalInPence,
      discountAmount: discountInPence,
      customFields: customerData?.customFields ? JSON.stringify(customerData.customFields) : null,
    };

    if (claimSessionValidation?.valid) {
      // WAITLIST PATH: order + tickets + offer fulfilment in ONE transaction
      try {
        const result = await createOrderWithWaitlistFulfilment({
          orderId,
          userId: user.id,
          eventDateId,
          orderData,
          ticketRows,
          orderItems: tickets.map((t: any) => ({
            eventTicketTypeId: t.ticketTypeId,
            quantity: t.amount,
            unitPrice: t.price,
          })),
          claimSessionId: claimSessionValidation.claimSession.id,
          offerId: claimSessionValidation.offer.id,
          waitlistEntryId: claimSessionValidation.offer.waitlistEntryId,
        });
        console.log(`✅ Created PENDING order ${orderId} and fulfilled waitlist offer ${claimSessionValidation.offer.id} in single transaction`);
      } catch (txError) {
        console.error('❌ Waitlist claim transaction failed:', txError);
        orderId = null; // nothing to roll back - the transaction was atomic
        return res.status(500).json({ error: 'Failed to create order from waitlist claim' });
      }
    } else {
      // NORMAL PATH: standard order + ticket creation
      const order = await prisma.order.create({
        data: {
          id: orderId,
          userId: user.id,
          eventDateId,
          ...orderData,
          status: 'PENDING',
        }
      });
      
      console.log('✅ Order created with finalTotal:', order.finalTotal, 'originalTotal:', order.originalTotal);
      
      for (const ticket of ticketRows) {
        await prisma.ticket.create({
          data: {
            orderId,
            ...ticket,
          }
        });
      }
    }
    
    console.log(`✅ Created PENDING order ${orderId} reserving ${tickets.reduce((sum, t) => sum + t.amount, 0)} tickets`);

    console.log('✅ Creating Stripe checkout session...');

    // Use passed totals or calculate if not provided
    const finalTotalAmount = finalTotal !== undefined && finalTotal !== null
      ? finalTotal 
      : tickets.reduce((sum, ticket) => sum + (ticket.price * ticket.amount), 0);
    const originalTotalAmount = originalTotal !== undefined && originalTotal !== null
      ? originalTotal
      : tickets.reduce((sum, ticket) => sum + (ticket.price * ticket.amount), 0);

    // Create checkout session with orderId in metadata so webhook can find and update the order
    const session = await createCheckoutSession({
      tickets,
      eventDateId,
      eventName,
      eventDate,
      customerEmail,
      customerData,
      orderId: orderId, // Pass orderId so webhook can update existing order instead of creating new one
      finalTotal: finalTotalAmount,
      originalTotal: originalTotalAmount,
      discountInfo,
      successUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tickets.jvs.org.uk'}/checkout/success?session_id={CHECKOUT_SESSION_ID}&orderId=${orderId}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tickets.jvs.org.uk'}/checkout/cancel?orderId=${orderId}`,
    });

    console.log('✅ Checkout session created successfully:', session.id);

    // Return the checkout session URL
    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
      orderId: orderId
    });

  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    
    // ROLLBACK: Delete PENDING order if Stripe session creation failed
    // This prevents stuck orders that consume capacity
    if (orderId) {
      try {
        console.log(`🔄 Rolling back PENDING order ${orderId} due to error...`);
        
        // Delete tickets first (due to foreign key constraints)
        await prisma.ticket.deleteMany({
          where: { orderId: orderId }
        });
        
        // Delete the order
        await prisma.order.delete({
          where: { id: orderId }
        });
        
        console.log(`✅ Successfully rolled back order ${orderId}`);
      } catch (rollbackError) {
        console.error('❌ Failed to rollback order:', rollbackError);
        // Don't fail the request due to rollback error - the cleanup job will handle it
      }
    }
    
    // Provide more detailed error information
    let errorMessage = 'Failed to create checkout session';
    let errorDetails = 'Unknown error';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || 'No stack trace';
    }
    
    return res.status(500).json({ 
      error: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString()
    });
  }
}
