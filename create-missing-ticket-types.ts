import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TicketTypeData {
  eventId: number;
  name: string;
  price: number; // in pence
  description?: string;
}

async function createMissingTicketTypes() {
  console.log('🎫 Creating missing ticket types for import...');
  
  const ticketTypesToCreate: TicketTypeData[] = [
    // Rosh Hashanah Seder and Dinner - Event ID 22
    {
      eventId: 22,
      name: 'Standard Ticket',
      price: 2000, // £20.00
      description: 'Standard ticket for Rosh Hashanah Seder and Dinner'
    },
    
    // Summer social: falafel and drinks - Event ID 20
    {
      eventId: 20,
      name: 'Standard Ticket',
      price: 1800, // £18.00
      description: 'Standard ticket for Summer social: falafel and drinks'
    }
  ];

  for (const ticketType of ticketTypesToCreate) {
    try {
      // Check if event exists
      const event = await prisma.event.findUnique({
        where: { id: ticketType.eventId },
        include: { ticketTypes: true }
      });

      if (!event) {
        console.log(`❌ Event ${ticketType.eventId} not found, skipping`);
        continue;
      }

      // Check if ticket type already exists
      const existingTicketType = event.ticketTypes.find(tt => 
        tt.name === ticketType.name && tt.price === ticketType.price
      );

      if (existingTicketType) {
        console.log(`⏭️  Ticket type already exists for event ${ticketType.eventId}: ${ticketType.name}`);
        continue;
      }

      // Create the ticket type
      const createdTicketType = await prisma.eventTicketType.create({
        data: {
          eventId: ticketType.eventId,
          name: ticketType.name,
          description: ticketType.description,
          price: ticketType.price,
          currency: 'GBP',
          isActive: true,
          isPublic: true,
          sortOrder: 0,
          publicSortOrder: 0
        }
      });

      console.log(`✅ Created ticket type for event ${ticketType.eventId} (${event.title}): ${ticketType.name} - £${ticketType.price/100}`);

    } catch (error) {
      console.error(`❌ Error creating ticket type for event ${ticketType.eventId}:`, error);
    }
  }

  console.log('🎫 Finished creating missing ticket types');
}

async function main() {
  try {
    await createMissingTicketTypes();
  } catch (error) {
    console.error('💥 Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { createMissingTicketTypes };
