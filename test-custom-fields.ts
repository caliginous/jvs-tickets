import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCustomFields() {
  console.log('=== Testing Custom Fields Implementation ===\n');

  // 1. Find events with custom fields
  console.log('📋 Events with custom fields:');
  const eventsWithCustomFields = await prisma.event.findMany({
    where: {
      customFields: {
        some: {}
      }
    },
    include: {
      customFields: true,
      dates: {
        include: {
          orders: {
            take: 5,
            orderBy: {
              date: 'desc'
            },
            include: {
              user: true
            }
          }
        }
      }
    }
  });

  for (const event of eventsWithCustomFields) {
    console.log(`\n✅ Event: "${event.title}" (ID: ${event.id})`);
    console.log(`   Custom Fields Defined:`);
    event.customFields.forEach(field => {
      console.log(`   - ${field.label} (${field.name}) ${field.isRequired ? '[REQUIRED]' : '[OPTIONAL]'}`);
    });

    // Check orders for this event
    const totalOrders = event.dates.reduce((sum, date) => sum + date.orders.length, 0);
    console.log(`\n   Total Orders: ${totalOrders}`);
    
    if (totalOrders > 0) {
      console.log(`   Recent Orders:`);
      event.dates.forEach(date => {
        date.orders.forEach(order => {
          console.log(`\n   📦 Order ${order.id.substring(0, 8)}... (${order.status})`);
          console.log(`      Customer: ${order.user.firstName} ${order.user.lastName} (${order.user.email})`);
          console.log(`      Date: ${order.date.toISOString()}`);
          
          // Check if order has custom fields
          if (order.customFields) {
            console.log(`      ✅ Order.customFields: ${order.customFields.substring(0, 100)}...`);
            try {
              const parsed = JSON.parse(order.customFields);
              console.log(`      Custom Field Responses:`);
              Object.entries(parsed).forEach(([key, value]) => {
                const fieldDef = event.customFields.find(f => f.name === key);
                const label = fieldDef?.label || key;
                console.log(`         ${label}: ${value}`);
              });
            } catch (e) {
              console.log(`      ⚠️  Could not parse custom fields`);
            }
          } else {
            console.log(`      ⚠️  No order.customFields (old order before migration)`);
          }

          // Also check user custom fields (for comparison)
          if (order.user.customFields) {
            console.log(`      User.customFields (autofill data): ${order.user.customFields.substring(0, 50)}...`);
          }
        });
      });
    }
  }

  console.log('\n\n=== Summary ===');
  console.log(`Total events with custom fields: ${eventsWithCustomFields.length}`);
  
  await prisma.$disconnect();
}

testCustomFields().catch(console.error);
