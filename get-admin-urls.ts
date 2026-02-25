import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getAdminUrls() {
  const order = await prisma.order.findFirst({
    where: { eventDateId: 51 },
    orderBy: { date: 'desc' },
    include: {
      eventDate: {
        include: {
          event: true
        }
      }
    }
  });

  if (!order) {
    console.log('No order found');
    await prisma.$disconnect();
    return;
  }

  const baseUrl = 'https://tickets.jvs.org.uk';
  const eventId = order.eventDate.event.id;

  console.log('=== ADMIN PANEL URLS TO VIEW CUSTOM FIELDS ===\n');
  
  console.log('📊 EVENT REPORT (Best place to see custom fields):');
  console.log(`   ${baseUrl}/admin/events/${eventId}/report`);
  console.log('   This shows:');
  console.log('   - Custom Fields Summary (aggregated responses)');
  console.log('   - Orders table with "Custom Info" column\n');

  console.log('📋 SPECIFIC ORDER DETAILS:');
  console.log(`   ${baseUrl}/admin/orders?search=${order.id.substring(0, 12)}`);
  console.log('   Search for order, then click to view details\n');

  console.log('🗄️  PRISMA STUDIO (Database viewer):');
  console.log('   http://localhost:5555');
  console.log('   Navigate to: Order table → Find ID: ' + order.id.substring(0, 20) + '...\n');

  console.log('💡 QUICK TEST:');
  console.log(`   Order ID: ${order.id}`);
  console.log(`   Event: "${order.eventDate.event.title}" (ID: ${eventId})`);
  console.log(`   Custom Field Data: ${order.customFields || 'NULL'}\n`);

  await prisma.$disconnect();
}

getAdminUrls().catch(console.error);
