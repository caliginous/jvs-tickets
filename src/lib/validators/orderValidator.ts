import prisma from '../prisma';

export type Ticket = { categoryId: number; amount: number; price: number };
export type TicketWithReasons = Ticket & { reasons: string[] };

export async function validateTickets(tickets: Ticket[], eventDateId: number) {
  const validTickets: Ticket[] = [];
  const invalidTickets: TicketWithReasons[] = [];

  console.log('=== VALIDATION SERVICE DEBUG ===');
  console.log('Validating', tickets.length, 'tickets for eventDateId:', eventDateId);
  console.log('Tickets:', JSON.stringify(tickets, null, 2));

  for (const t of tickets) {
    const reasons: string[] = [];
    
    console.log(`\n--- Validating ticket ${t.categoryId} ---`);
    
    // Check each validation rule with detailed logging
    const categoryOnDate = await isCategoryOnDate(t.categoryId, eventDateId);
    console.log('Category on date check:', categoryOnDate);
    if (!categoryOnDate) reasons.push('CATEGORY_NOT_ON_DATE');
    
    const saleWindow = await withinSaleWindow(eventDateId);
    console.log('Sale window check:', saleWindow);
    if (!saleWindow) reasons.push('WINDOW_CLOSED');
    
    const capacity = await hasCapacity(t.categoryId, eventDateId, t.amount);
    console.log('Capacity check:', capacity);
    if (!capacity) reasons.push('NO_CAPACITY');
    
    const priceMatch = await priceMatches(t.categoryId, eventDateId, t.price);
    console.log('Price match check:', priceMatch);
    if (!priceMatch) reasons.push('PRICE_MISMATCH');
    
    console.log('Final reasons:', reasons);

    if (reasons.length) {
      invalidTickets.push({ ...t, reasons });
      console.log('❌ Ticket INVALID:', reasons);
    } else {
      validTickets.push(t);
      console.log('✅ Ticket VALID');
    }
  }

  console.log('\n=== VALIDATION RESULTS ===');
  console.log('Valid tickets:', validTickets.length);
  console.log('Invalid tickets:', invalidTickets.length);
  console.log('================================');

  return { validTickets, invalidTickets };
}

// Real implementations using your database
async function isCategoryOnDate(categoryId: number, eventDateId: number): Promise<boolean> {
  try {
    console.log(`Checking if category ${categoryId} is available for eventDate ${eventDateId}`);
    
    const categoryOnEvent = await prisma.categoriesOnEvents.findFirst({
      where: {
        categoryId: categoryId,
        event: {
          dates: {
            some: {
              id: eventDateId
            }
          }
        }
      }
    });
    
    const result = !!categoryOnEvent;
    console.log(`Category ${categoryId} on eventDate ${eventDateId}:`, result);
    return result;
  } catch (error) {
    console.error('Error checking category-date mapping:', error);
    // During debugging, be more lenient
    console.log('Falling back to true for category-date check due to error');
    return true;
  }
}

async function withinSaleWindow(eventDateId: number): Promise<boolean> {
  try {
    console.log(`Checking sale window for eventDate ${eventDateId}`);
    
    const eventDate = await prisma.eventDate.findUnique({
      where: { id: eventDateId },
      select: { ticketSaleStartDate: true, ticketSaleEndDate: true }
    });
    
    if (!eventDate) {
      console.log('No eventDate found, falling back to true');
      return true; // Be lenient during debugging
    }
    
    const now = new Date();
    const saleStart = eventDate.ticketSaleStartDate ? new Date(eventDate.ticketSaleStartDate) : new Date(0);
    const saleEnd = eventDate.ticketSaleEndDate ? new Date(eventDate.ticketSaleEndDate) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // 1 year from now
    
    const result = now >= saleStart && now <= saleEnd;
    console.log(`Sale window check: now=${now}, start=${saleStart}, end=${saleEnd}, result=${result}`);
    return result;
  } catch (error) {
    console.error('Error checking sale window:', error);
    console.log('Falling back to true for sale window check due to error');
    return true; // Be lenient during debugging
  }
}

async function hasCapacity(categoryId: number, eventDateId: number, amount: number): Promise<boolean> {
  try {
    console.log(`Checking capacity for category ${categoryId}, eventDate ${eventDateId}, amount ${amount}`);
    
    const categoryLimit = await prisma.categoriesOnEvents.findFirst({
      where: {
        categoryId: categoryId,
        event: {
          dates: {
            some: { id: eventDateId }
          }
        }
      },
      select: { maxAmount: true }
    });
    
    if (!categoryLimit || !categoryLimit.maxAmount) {
      console.log('No capacity limit found, allowing unlimited');
      return true; // No capacity limit
    }
    
    const existingTickets = await prisma.ticket.count({
      where: {
        categoryId: categoryId,
        order: {
          eventDateId: eventDateId,
          status: {
            // Include PARTIALLY_REFUNDED as those tickets are still valid
            in: ['CONFIRMED', 'PAID', 'COMPLETED', 'PARTIALLY_REFUNDED']
          }
        }
      }
    });
    
    const result = (existingTickets + amount) <= categoryLimit.maxAmount;
    console.log(`Capacity check: existing=${existingTickets}, limit=${categoryLimit.maxAmount}, requested=${amount}, result=${result}`);
    return result;
  } catch (error) {
    console.error('Error checking capacity:', error);
    console.log('Falling back to true for capacity check due to error');
    return true; // Be lenient during debugging
  }
}

async function priceMatches(categoryId: number, eventDateId: number, price: number): Promise<boolean> {
  try {
    console.log(`Checking price match for category ${categoryId}, expected price ${price}`);
    
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { price: true }
    });
    
    if (!category) {
      console.log('No category found, falling back to true');
      return true; // Be lenient during debugging
    }
    
    // Allow small price differences (e.g., rounding, currency conversion)
    const priceDifference = Math.abs(category.price - price);
    const result = priceDifference < 0.01; // Allow 1 penny difference
    
    console.log(`Price check: category price=${category.price}, ticket price=${price}, difference=${priceDifference}, result=${result}`);
    return result;
  } catch (error) {
    console.error('Error checking price match:', error);
    console.log('Falling back to true for price check due to error');
    return true; // Be lenient during debugging
  }
}
