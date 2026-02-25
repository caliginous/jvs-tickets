const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixPendingOrder() {
    try {
        const orderId = '91d31cca-18f3-49b5-91d1-0f39b387c4ed';
        
        console.log('🔧 Fixing pending order:', orderId);
        
        // First, let's check what we need to fix
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: true,
                eventDate: {
                    include: {
                        event: true
                    }
                }
            }
        });
        
        if (!order) {
            console.log('❌ Order not found');
            return;
        }
        
        console.log('\n📋 Current Order State:');
        console.log('- Status:', order.status);
        console.log('- Shipping:', order.shipping);
        console.log('- Payment Result:', order.paymentResult ? 'Present' : 'Not present');
        console.log('- Event:', order.eventDate.event.title);
        console.log('- Customer:', order.user.firstName, order.user.lastName);
        console.log('- Email:', order.user.email);
        
        // Since this order was created by the old flow but never processed by webhook,
        // we need to manually set it to PAID and add some basic data
        
        console.log('\n🔧 Updating order...');
        
        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: {
                status: "PAID",
                paymentResult: JSON.stringify({
                    manualFix: true,
                    fixedAt: new Date().toISOString(),
                    note: "Order was created by old flow, manually fixed to PAID status",
                    originalStatus: "PENDING"
                }),
                // Add basic shipping info from user data
                shipping: JSON.stringify({
                    line1: order.user.address || 'Address not provided',
                    city: order.user.city || 'City not provided',
                    postal_code: order.user.zip || 'ZIP not provided',
                    country: order.user.countryCode || 'GB',
                    state: order.user.regionCode || '',
                    email: order.user.email,
                    name: `${order.user.firstName} ${order.user.lastName}`
                })
            }
        });
        
        console.log('✅ Order updated successfully!');
        console.log('- New Status:', updatedOrder.status);
        console.log('- New Shipping:', updatedOrder.shipping);
        console.log('- New Payment Result:', updatedOrder.paymentResult ? 'Present' : 'Not present');
        
        // Also check if we need to fix the ticket category
        const tickets = await prisma.ticket.findMany({
            where: { orderId: orderId },
            include: { category: true }
        });
        
        console.log('\n🎫 Ticket Status:');
        tickets.forEach((ticket, index) => {
            console.log(`  ${index + 1}. Category: ${ticket.category?.name || 'UNDEFINED'}, Amount: ${ticket.amount}`);
            if (!ticket.category) {
                console.log(`     ⚠️  Ticket ${ticket.id} has undefined category - this needs manual fixing`);
            }
        });
        
        console.log('\n🎉 Order fixed! It should now appear in your admin panel as PAID.');
        console.log('Note: You may need to manually fix the ticket category if it shows as undefined.');
        
    } catch (error) {
        console.error('❌ Error fixing order:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixPendingOrder();
