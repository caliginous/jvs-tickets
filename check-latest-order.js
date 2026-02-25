const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkLatestOrder() {
    try {
        console.log('🔍 Checking for latest order with session ID: cs_live_a1cXOT5HbsjT9UmwzaXmQRCloINVwJamEYjskBMVy0WeeE2lrwQBaNcRDK');
        
        // Check if any order has this session ID in paymentResult
        const orderWithSession = await prisma.order.findFirst({
            where: {
                paymentResult: {
                    contains: 'cs_live_a1cXOT5HbsjT9UmwzaXmQRCloINVwJamEYjskBMVy0WeeE2lrwQBaNcRDK'
                }
            },
            select: {
                id: true,
                date: true,
                status: true,
                paymentResult: true,
                eventDateId: true,
                userId: true
            }
        });
        
        if (orderWithSession) {
            console.log('✅ Found order with this session ID:');
            console.log('Order ID:', orderWithSession.id);
            console.log('Created:', orderWithSession.date);
            console.log('Status:', orderWithSession.status);
            console.log('EventDate ID:', orderWithSession.eventDateId);
            console.log('User ID:', orderWithSession.userId);
            
            // Parse paymentResult to see the full details
            try {
                const paymentData = JSON.parse(orderWithSession.paymentResult);
                console.log('Payment Result Keys:', Object.keys(paymentData));
                if (paymentData.stripeSessionId) {
                    console.log('Stripe Session ID in DB:', paymentData.stripeSessionId);
                }
            } catch (e) {
                console.log('Could not parse paymentResult JSON');
            }
        } else {
            console.log('❌ No order found with this session ID');
        }
        
        // Check recent orders to see what's happening
        console.log('\n📊 Recent orders (last 10):');
        const recentOrders = await prisma.order.findMany({
            orderBy: {
                date: 'desc'
            },
            take: 10,
            select: {
                id: true,
                date: true,
                status: true,
                eventDateId: true,
                userId: true
            }
        });
        
        recentOrders.forEach((order, index) => {
            console.log(`${index + 1}. Order ${order.id} - ${order.date} - Status: ${order.status} - EventDate: ${order.eventDateId}`);
        });
        
        // Check if there are any orders with PENDING status
        console.log('\n⏳ Orders with PENDING status:');
        const pendingOrders = await prisma.order.findMany({
            where: {
                status: 'PENDING'
            },
            select: {
                id: true,
                date: true,
                eventDateId: true,
                userId: true
            }
        });
        
        if (pendingOrders.length > 0) {
            pendingOrders.forEach(order => {
                console.log(`- Order ${order.id} - ${order.date} - EventDate: ${order.eventDateId}`);
            });
        } else {
            console.log('No PENDING orders found');
        }
        
        // Check for any orders created in the last hour
        console.log('\n🕐 Orders created in the last hour:');
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentHourOrders = await prisma.order.findMany({
            where: {
                date: {
                    gte: oneHourAgo
                }
            },
            orderBy: {
                date: 'desc'
            },
            select: {
                id: true,
                date: true,
                status: true,
                eventDateId: true,
                userId: true
            }
        });
        
        if (recentHourOrders.length > 0) {
            recentHourOrders.forEach(order => {
                console.log(`- Order ${order.id} - ${order.date} - Status: ${order.status} - EventDate: ${order.eventDateId}`);
            });
        } else {
            console.log('No orders created in the last hour');
        }
        
    } catch (error) {
        console.error('❌ Error checking database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkLatestOrder();
