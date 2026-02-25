import Stripe from 'stripe';
import { toPenceString } from './amountUtils';

// Validate and clean Stripe secret key
const getStripeSecretKey = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  
  // Remove any quotes, whitespace, or invalid characters
  const cleanedKey = key.trim().replace(/['"]/g, '');
  
  // Validate key format
  if (!cleanedKey.startsWith('sk_test_') && !cleanedKey.startsWith('sk_live_')) {
    throw new Error(`Invalid Stripe secret key format. Key should start with 'sk_test_' or 'sk_live_', got: ${cleanedKey.substring(0, 10)}...`);
  }
  
  return cleanedKey;
};

// Initialize Stripe server-side
let stripe: Stripe;
try {
  const secretKey = getStripeSecretKey();
  stripe = new Stripe(secretKey, {
    apiVersion: '2022-08-01',
  });
  console.log('✅ Stripe initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Stripe:', error);
  // Create a dummy Stripe instance that will fail gracefully
  stripe = {} as Stripe;
}

export { stripe };

// Client-side Stripe loader
export const getStripe = async () => {
  const { loadStripe } = await import('@stripe/stripe-js');
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
};

// Create Stripe payment link
export const createPaymentLink = async (params: {
  tickets: Array<{
    ticketTypeId: number;
    amount: number;
    price: number;
    name: string;
  }>;
  eventDateId: number;
  eventName: string;
  eventDate: string;
  customerEmail: string;
  orderId: string;
  successUrl: string;
  cancelUrl: string;
  finalTotal?: number;
  originalTotal?: number;
  discountInfo?: any;
}) => {
  try {
    // Check if Stripe is properly initialized
    if (!stripe || !stripe.paymentLinks) {
      throw new Error('Stripe is not properly initialized. Check your STRIPE_SECRET_KEY environment variable.');
    }

    const { tickets, eventDateId, eventName, eventDate, customerEmail, orderId, successUrl, cancelUrl } = params;
    
    // Calculate the original total and final total
    // If both finalTotal and originalTotal are explicitly passed, use them (for admin orders)
    // Otherwise calculate from ticket prices (for regular checkout)
    const originalTotal = (params.originalTotal !== undefined && params.finalTotal !== undefined) 
      ? params.originalTotal 
      : tickets.reduce((sum, ticket) => sum + (ticket.price * ticket.amount), 0);
    const finalTotal = params.finalTotal || originalTotal;
    
    // Calculate discount amount and ensure it's valid
    const discountAmount = Math.max(0, originalTotal - finalTotal);
    
    // Validate that final total doesn't exceed original total
    if (finalTotal > originalTotal) {
      throw new Error('Final total cannot exceed original total');
    }
    
    console.log('Creating Stripe payment link with params:', {
      tickets: tickets.length,
      eventDateId,
      eventName,
      customerEmail,
      orderId,
      originalTotal,
      finalTotal,
      discountAmount
    });
    
    // Create line items for the payment link
    const lineItems = tickets.map(ticket => ({
      price_data: {
        currency: 'gbp',
        product_data: {
          name: `${eventName} - ${ticket.name}`,
          description: `Event: ${eventName} on ${eventDate}`,
        },
        unit_amount: Math.round(ticket.price), // Already in pence/cents
      },
      quantity: ticket.amount,
    })) as any; // Type assertion to avoid Stripe type conflicts

    // Apply discount proportionally to ticket prices instead of adding negative line item
    if (discountAmount > 0 && params.discountInfo) {
      const discountRatio = finalTotal / originalTotal;
      lineItems.forEach(item => {
        if (item.price_data) {
          const originalAmount = item.price_data.unit_amount;
          item.price_data.unit_amount = Math.round(originalAmount * discountRatio);
        }
      });
    }

    // Create the payment link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: lineItems,
      after_completion: {
        type: 'redirect',
        redirect: {
          url: successUrl,
        },
      },
      metadata: {
        orderId: orderId,
        eventDateId: eventDateId.toString(),
        eventName: eventName,
        eventDate: eventDate,
        customerEmail: customerEmail,
        finalTotal: finalTotal.toString(),
        originalTotal: originalTotal.toString(),
        discountCode: params.discountInfo?.code || '',
        discountAmount: discountAmount.toString(),
        discountType: params.discountInfo?.discountType || '',
        discountValue: params.discountInfo?.discountValue?.toString() || '',
        adminCreated: 'true',
        paymentMethod: 'stripe_link'
      },
      billing_address_collection: 'required',
      customer_creation: 'if_required',
    });

    console.log('✅ Stripe payment link created successfully:', paymentLink.url);
    return paymentLink;

  } catch (error) {
    console.error('❌ Error creating Stripe payment link:', error);
    throw error;
  }
};

// Create Stripe checkout session
export const createCheckoutSession = async (params: {
  tickets: Array<{
    ticketTypeId: number;
    amount: number;
    price: number;
    name: string;
  }>;
  eventDateId: number;
  eventName: string;
  eventDate: string;
  customerEmail: string;
  customerData?: {
    firstName: string;
    lastName: string;
    phone?: string;
    address: string;
    zip: string;
    city: string;
    countryCode: string;
    regionCode: string;
    customFields?: Record<string, string>;
  };
  orderId?: string; // Add orderId parameter
  successUrl: string;
  cancelUrl: string;
  // Additional metadata fields for webhook processing
  finalTotal?: number;
  originalTotal?: number;
  discountInfo?: any; // Add discount info parameter
}) => {
  try {
    // Check if Stripe is properly initialized
    if (!stripe || !stripe.checkout) {
      throw new Error('Stripe is not properly initialized. Check your STRIPE_SECRET_KEY environment variable.');
    }

    const { tickets, eventDateId, eventName, eventDate, customerEmail, customerData, successUrl, cancelUrl } = params;
    
    // Calculate the original total and final total
    // Important: Handle 0 correctly (0 is a valid finalTotal when fully discounted)
    const originalTotal = tickets.reduce((sum, ticket) => sum + (ticket.price * ticket.amount), 0);
    const finalTotal = params.finalTotal !== undefined && params.finalTotal !== null 
      ? params.finalTotal 
      : originalTotal;
    
    // Calculate discount amount
    const discountAmount = originalTotal - finalTotal;
    
    console.log('Creating Stripe checkout session with params:', {
      tickets: tickets.length,
      eventDateId,
      eventName,
      customerEmail,
      originalTotal,
      finalTotal,
      discountAmount,
      customerData
    });
    
    console.log('🔍 [lib/stripe] customerData.customFields:', customerData?.customFields);
    console.log('🔍 [lib/stripe] Will store in metadata as:', customerData?.customFields ? JSON.stringify(customerData.customFields) : 'EMPTY');
    
    console.log('💰 [lib/stripe] Discount calculation details:', {
      hasDiscountInfo: !!params.discountInfo,
      discountAmount,
      originalTotal,
      finalTotal,
      discountRatio: discountAmount > 0 ? finalTotal / originalTotal : 1
    });
    
    // Create line items - if there's a discount, adjust ticket prices proportionally
    const lineItems = tickets.map(ticket => {
      let unitAmount;
      
      if (discountAmount > 0 && params.discountInfo) {
        // Apply discount proportionally across tickets
        const discountRatio = finalTotal / originalTotal;
        const discountedPrice = (ticket.price * discountRatio);
        unitAmount = Math.round(discountedPrice); // Already in pence
        
        console.log(`🎫 [lib/stripe] Ticket: ${ticket.name}`, {
          originalPricePerTicket: ticket.price,
          discountRatio,
          discountedPricePerTicket: unitAmount,
          quantity: ticket.amount,
          lineTotal: unitAmount * ticket.amount
        });
      } else {
        // No discount, use original price
        unitAmount = Math.round(ticket.price); // Already in pence
        
        console.log(`🎫 [lib/stripe] Ticket (no discount): ${ticket.name}`, {
          pricePerTicket: unitAmount,
          quantity: ticket.amount,
          lineTotal: unitAmount * ticket.amount
        });
      }
      
      return {
        price_data: {
          currency: 'gbp',
          product_data: {
            name: `${eventName} - ${ticket.name}`,
            description: `Event: ${eventName} on ${eventDate}`,
          },
          unit_amount: unitAmount,
        },
        quantity: ticket.amount,
      };
    });
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      billing_address_collection: 'required',
      metadata: {
        eventDateId: eventDateId.toString(),
        orderId: params.orderId || '', // Add orderId to metadata
        tickets: JSON.stringify(tickets),
        // Store customer data in Stripe metadata for order creation
        ...(customerData && {
          customerFirstName: customerData.firstName || '',
          customerLastName: customerData.lastName || '',
          customerPhone: customerData.phone || '',
          customerAddress: customerData.address || '',
          customerZip: customerData.zip || '',
          customerCity: customerData.city || '',
          customerCountryCode: customerData.countryCode || 'GB',
          customerRegionCode: customerData.regionCode || '',
          customerCustomFields: customerData.customFields ? JSON.stringify(customerData.customFields) : '',
        }),
        // Add metadata for email triggers and webhook processing
        userEmail: customerEmail,
        eventTitle: eventName,
        eventDate: eventDate,
        seats: tickets.reduce((sum, ticket) => sum + ticket.amount, 0).toString(),
        total: (params.finalTotal || tickets.reduce((sum, ticket) => sum + (ticket.price * ticket.amount), 0)).toString(), // Already in pence
        finalTotal: (params.finalTotal || tickets.reduce((sum, ticket) => sum + (ticket.price * ticket.amount), 0)).toString(), // Already in pence
        originalTotal: (params.originalTotal || tickets.reduce((sum, ticket) => sum + (ticket.price * ticket.amount), 0)).toString(), // Already in pence
        // Add discount information to metadata
        ...(params.discountInfo && {
          discountCode: params.discountInfo.code,
          discountAmount: toPenceString(Math.round(Math.abs(params.discountInfo.discountAmount) * 100)), // Store as pence string
          discountType: params.discountInfo.discountType,
          discountValue: params.discountInfo.discountValue.toString()
        }),
        locale: 'en',
      },
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
    });
    
    console.log('✅ Stripe checkout session created successfully:', session.id);
    console.log('📋 Session metadata stored:', JSON.stringify(session.metadata, null, 2));
    return session;
  } catch (error) {
    console.error('❌ Error creating Stripe checkout session:', error);
    throw error;
  }
};

// Retrieve checkout session
export const retrieveCheckoutSession = async (sessionId: string) => {
  try {
    if (!stripe || !stripe.checkout) {
      throw new Error('Stripe is not properly initialized');
    }
    return await stripe.checkout.sessions.retrieve(sessionId);
  } catch (error) {
    console.error('❌ Error retrieving checkout session:', error);
    throw error;
  }
};

// Create refund
export const createRefund = async (params: {
  paymentIntentId: string;
  amount?: number;
  reason?: 'requested_by_customer' | 'duplicate' | 'fraudulent';
  metadata?: Record<string, string>;
}) => {
  try {
    if (!stripe || !stripe.refunds) {
      throw new Error('Stripe is not properly initialized');
    }
    
    const { paymentIntentId, amount, reason, metadata } = params;
    
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount) : undefined, // Amount already in pence
      reason,
      metadata,
    });
    
    return refund;
  } catch (error) {
    console.error('❌ Error creating refund:', error);
    throw error;
  }
};
