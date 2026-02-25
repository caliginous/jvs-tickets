import { NextApiRequest, NextApiResponse } from "next";
import { withNotification } from "../../../lib/notifications/withNotification";
import { validateOrder } from "../../../constants/serverUtil";
import { OrderState } from "../../../store/reducers/orderReducer";
import { PersonalInformationState } from "../../../store/reducers/personalInformationReducer";
import { PaymentType } from "../../../store/factories/payment/PaymentFactory";
import prisma from "../../../lib/prisma";
import { validateTickets } from "../../../lib/validators/orderValidator";

// CRITICAL: Normalize request body to accept both shapes (top-level and nested under order)
function normalizeBody(raw: any) {
  const tickets = Array.isArray(raw?.tickets)
    ? raw.tickets
    : Array.isArray(raw?.order?.tickets)
    ? raw.order.tickets
    : [];

  const reservationId = raw?.reservationId ?? raw?.order?.reservationId;
  const skipValidation = raw?.skipValidation ?? false;

  return {
    order: raw?.order ?? {},
    user: raw?.user,
    eventDateId: raw?.eventDateId,
    paymentType: raw?.paymentType,
    locale: raw?.locale,
    discountCode: raw?.discountCode ?? null,
    tickets,
    reservationId,
    skipValidation,
  };
}

export default withNotification(handler, ["order", "store"]);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: 'Request body is required' });
  }

  // CRITICAL: Normalize the body to handle both payload shapes
  const normalizedBody = normalizeBody(req.body);
  
  const {
    order,
    user,
    eventDateId,
    paymentType,
    locale,
    discountCode,
    tickets,
    reservationId,
    skipValidation
  } = normalizedBody;

  // CRITICAL: Validate all required fields
  const requiredFields = { order, user, eventDateId, paymentType, locale, reservationId, tickets };
  const missingFields = Object.entries(requiredFields)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingFields.length > 0) {
    console.error('STORE API ERROR: Missing required fields:', missingFields);
    return res.status(400).json({
      error: 'Missing required fields',
      missingFields,
      receivedFields: Object.keys(req.body)
    });
  }

  // CRITICAL: Validate tickets array
  if (!Array.isArray(tickets) || tickets.length === 0) {
    console.error('STORE API ERROR: Invalid tickets array:', tickets);
    return res.status(400).json({
      error: 'Invalid tickets data',
      details: 'tickets must be a non-empty array if provided',
      received: tickets,
      orderKeys: order ? Object.keys(order) : 'No order object'
    });
  }

  // CRITICAL: Log the normalized payload
  console.log('=== STORE API NORMALIZED PAYLOAD ===');
  console.log('Event Date ID:', eventDateId);
  console.log('Reservation ID:', reservationId);
  console.log('Tickets count:', tickets.length);
  console.log('Tickets:', JSON.stringify(tickets, null, 2));
  console.log('User email:', user.email);
  console.log('Payment type:', paymentType);
  console.log('Skip validation:', skipValidation);
  console.log('Order keys:', order ? Object.keys(order) : 'No order object');
  console.log('===================================');

  // CRITICAL: Use centralized validation service (unless skipping for Stripe payments)
  let validTickets = tickets;
  let invalidTickets: any[] = [];
  
  if (!skipValidation) {
    const validationResult = await validateTickets(tickets, eventDateId);
    validTickets = validationResult.validTickets;
    invalidTickets = validationResult.invalidTickets;
    
    console.log('=== TICKET VALIDATION RESULTS ===');
    console.log('Valid tickets:', validTickets.length);
    console.log('Invalid tickets:', invalidTickets.length);
    if (invalidTickets.length > 0) {
      console.log('Invalid ticket reasons:', invalidTickets.map(t => ({ 
        categoryId: t.categoryId, 
        reasons: t.reasons 
      })));
    }
    console.log('================================');
  } else {
    console.log('=== SKIPPING VALIDATION FOR STRIPE PAYMENT ===');
    console.log('All tickets considered valid to prevent failed charges');
    console.log('====================================================');
  }

  // CRITICAL: If no valid tickets, return 422 (NOT 411) with reasons
  if (validTickets.length === 0) {
    console.error('STORE API ERROR: All tickets invalid');
    return res.status(422).json({
      error: 'All tickets invalid',
      invalidTickets,
      details: 'No tickets passed validation. Check the reasons array for specific issues.'
    });
  }

  try {
    // CRITICAL: Call validateOrder with bypassSeatValidation: true (unless skipping validation)
    let isValid = true;
    let validationErrors: any[] = [];
    
    if (!skipValidation) {
      [isValid, validationErrors] = await validateOrder(validTickets, eventDateId, reservationId, true, true);
    } else {
      console.log('=== SKIPPING ORDER VALIDATION FOR STRIPE PAYMENT ===');
      console.log('Order validation bypassed to prevent failed charges');
      console.log('===================================================');
    }
    
    if (!isValid) {
      console.error('STORE API ERROR: Order validation failed:', validationErrors);
      return res.status(422).json({
        error: 'Order validation failed',
        details: validationErrors,
        validTickets: [],
        invalidTickets: validTickets.map(t => ({ ...t, reasons: ['ORDER_VALIDATION_FAILED'] }))
      });
    }

    // ROBUST FIX: Transaction-based find-or-create user (prevents FK violations)
    console.log('=== CREATING/UPDATING USER ===');
    console.log('User data:', user);
    
    // Validate and normalize user data
    if (!user.email) {
      throw new Error('User email is required');
    }
    
    const normalizedEmail = user.email.toLowerCase().trim();
    
    // Defensive check: short-circuit if email is empty after normalization
    if (!normalizedEmail) {
      throw new Error('Invalid email address provided');
    }
    
    // Use transaction to find existing user or create new one (race-safe)
    let dbUser;
    let userCreated = false;
    try {
      dbUser = await prisma.$transaction(async (tx) => {
        const existing = await tx.user.findFirst({ where: { email: normalizedEmail } });
        if (existing) {
          console.log('Found existing user, updating:', existing.id);
          return tx.user.update({
            where: { id: existing.id },
            data: {
              firstName: user.firstName || 'Unknown',
              lastName: user.lastName || 'Unknown',
              address: user.address || '',
              zip: user.zip || '',
              city: user.city || '',
              countryCode: user.countryCode || 'GB',
              regionCode: user.regionCode || '',
              customFields: user.customFields ? JSON.stringify(user.customFields) : null,
            },
          });
        }
        console.log('Creating new user with email:', normalizedEmail);
        userCreated = true;
        return tx.user.create({
          data: {
            firstName: user.firstName || 'Unknown',
            lastName: user.lastName || 'Unknown',
            email: normalizedEmail,
            address: user.address || '',
            zip: user.zip || '',
            city: user.city || '',
            countryCode: user.countryCode || 'GB',
            regionCode: user.regionCode || '',
            customFields: user.customFields ? JSON.stringify(user.customFields) : null,
          },
        });
      });
    } catch (error) {
      console.error('USER CREATION ERROR:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      throw new Error(`Failed to create/update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    console.log('User created/updated successfully:', dbUser.id);

    // Send welcome email if this is a new user
    if (userCreated) {
      try {
        console.log('📧 Sending welcome email to new user:', dbUser.email);
        const { emailTriggerService } = await import('../../../lib/services/emailTriggerService');
        
        await emailTriggerService.sendWelcomeEmail({
          userEmail: dbUser.email,
          userFirstName: dbUser.firstName || 'User',
          userLastName: dbUser.lastName || 'User',
          locale: locale || 'en'
        });
        console.log('✅ Welcome email sent successfully to:', dbUser.email);
      } catch (emailError) {
        console.error('❌ Failed to send welcome email:', emailError);
        // Don't fail the order creation if email fails
      }
    }

    // Create the order in the database with proper user connection
    const orderData = {
      eventDateId: eventDateId,
      userId: dbUser.id, // Now we have a valid user ID
      paymentType: paymentType,
      locale: locale,
      shipping: JSON.stringify(order.shipping || {}),
      idempotencyKey: `order-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      cancellationSecret: Math.random().toString(36).substring(2, 15),
      // Store payment details for admin panel
      paymentIntent: order.paymentIntent || null,
      paymentResult: order.paymentResult || null,
      // Store order totals for refund processing
      finalTotal: order.finalTotal || null,
      originalTotal: order.originalTotal || null,
      // Store custom fields on the order (not just on user) for order-specific responses
      customFields: user.customFields ? JSON.stringify(user.customFields) : null,
    };

    // Remove undefined fields to avoid Prisma errors
    Object.keys(orderData).forEach(key => {
      if (orderData[key] === undefined) {
        delete orderData[key];
      }
    });

    console.log('Creating order with data:', orderData);

    const createdOrder = await prisma.order.create({
      data: orderData,
      include: {
        tickets: true
      }
    });

    // Create tickets separately to avoid complex nested creation
    for (const ticket of validTickets) {
      await prisma.ticket.create({
        data: {
          orderId: createdOrder.id,
          categoryId: ticket.categoryId,
          amount: ticket.amount,
          firstName: ticket.firstName || null,
          lastName: ticket.lastName || null,
          secret: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        }
      });
    }

    // Fetch the order with tickets to return
    const finalOrder = await prisma.order.findUnique({
      where: { id: createdOrder.id },
      include: { tickets: true }
    });

    console.log('=== STORE API SUCCESS ===');
    console.log('Order created successfully with ID:', createdOrder.id);
    console.log('User ID:', dbUser.id);
    console.log('Valid tickets:', validTickets.length);
    console.log('Invalid tickets:', invalidTickets.length);
    console.log('========================');

    return res.status(200).json({
      success: true,
      message: 'Order created successfully',
      validTickets,
      invalidTickets,
      orderId: createdOrder.id
    });

  } catch (error) {
    console.error('STORE API ERROR: Unexpected error:', error);
    
    // Enhanced error logging as recommended by developers
    if (error instanceof Error) {
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    }
    
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}
