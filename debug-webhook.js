const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugWebhook() {
    try {
        console.log('🔍 Debugging webhook and order creation...');
        
        // Check recent orders
        const recentOrders = await prisma.order.findMany({
            take: 5,
            orderBy: { date: 'desc' },
            include: {
                user: true,
                eventDate: {
                    include: {
                        event: true
                    }
                }
            }
        });
        
        console.log('\n📋 Recent Orders:');
        recentOrders.forEach(order => {
            console.log(`- ID: ${order.id}`);
            console.log(`  Status: ${order.status}`);
            console.log(`  Event: ${order.eventDate.event.title}`);
            console.log(`  Customer: ${order.user.firstName} ${order.user.lastName}`);
            console.log(`  Date: ${order.date}`);
            console.log(`  Payment Type: ${order.paymentType}`);
            console.log(`  Shipping: ${order.shipping ? 'Has address data' : 'No address data'}`);
            console.log('  ---');
        });
        
        // Check if there are any orders with PENDING status
        const pendingOrders = await prisma.order.findMany({
            where: { status: 'PENDING' },
            include: {
                user: true,
                eventDate: {
                    include: {
                        event: true
                    }
                }
            }
        });
        
        console.log('\n⏳ Pending Orders:');
        if (pendingOrders.length === 0) {
            console.log('No pending orders found');
        } else {
            pendingOrders.forEach(order => {
                console.log(`- ID: ${order.id}`);
                console.log(`  Event: ${order.eventDate.event.title}`);
                console.log(`  Customer: ${order.user.firstName} ${order.user.lastName}`);
                console.log(`  Date: ${order.date}`);
            });
        }
        
        // Check webhook logs in paymentResult
        console.log('\n🔍 Checking for webhook processing in paymentResult...');
        const ordersWithWebhookData = await prisma.order.findMany({
            where: {
                paymentResult: {
                    contains: 'webhookEvent'
                }
            },
            select: {
                id: true,
                status: true,
                paymentResult: true,
                date: true
            }
        });
        
        console.log(`Found ${ordersWithWebhookData.length} orders with webhook data:`);
        ordersWithWebhookData.forEach(order => {
            try {
                const paymentData = JSON.parse(order.paymentResult);
                console.log(`- Order ${order.id}:`);
                console.log(`  Status: ${order.status}`);
                console.log(`  Webhook Event: ${paymentData.webhookEvent?.type || 'Unknown'}`);
                console.log(`  Processed At: ${paymentData.webhookProcessedAt || 'Unknown'}`);
                console.log(`  Date: ${order.date}`);
            } catch (e) {
                console.log(`- Order ${order.id}: Could not parse paymentResult`);
            }
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugWebhook();
