const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSpecificOrder() {
    try {
        const orderId = '91d31cca-18f3-49b5-91d1-0f39b387c4ed';
        
        console.log('🔍 Checking specific order:', orderId);
        
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
        
        console.log('\n📋 Order Details:');
        console.log('- ID:', order.id);
        console.log('- Status:', order.status);
        console.log('- Event:', order.eventDate.event.title);
        console.log('- Customer:', order.user.firstName, order.user.lastName);
        console.log('- Email:', order.user.email);
        console.log('- Date:', order.date);
        console.log('- Payment Type:', order.paymentType);
        
        console.log('\n🏠 Shipping/Address Data:');
        console.log('- Shipping field:', order.shipping);
        
        if (order.shipping) {
            try {
                const shippingData = JSON.parse(order.shipping);
                console.log('- Parsed shipping data:', JSON.stringify(shippingData, null, 2));
            } catch (e) {
                console.log('- Shipping data is not valid JSON:', e.message);
            }
        } else {
            console.log('- No shipping data stored');
        }
        
        console.log('\n💳 Payment Data:');
        console.log('- Payment Result:', order.paymentResult ? 'Present' : 'Not present');
        
        if (order.paymentResult) {
            try {
                const paymentData = JSON.parse(order.paymentResult);
                console.log('- Payment Intent ID:', paymentData.payment_intent || 'Not found');
                console.log('- Payment Status:', paymentData.payment_status || 'Not found');
                console.log('- Stripe Session ID:', paymentData.stripeSessionId || 'Not found');
                
                // Check for webhook events
                if (paymentData.webhookEvent) {
                    console.log('- Webhook Event Type:', paymentData.webhookEvent.type);
                    console.log('- Webhook Processed At:', paymentData.webhookProcessedAt);
                } else {
                    console.log('- No webhook event data found');
                }
                
                // Check for any other relevant data
                console.log('- All payment data keys:', Object.keys(paymentData));
                
            } catch (e) {
                console.log('- Payment data is not valid JSON:', e.message);
            }
        }
        
        // Check if there are any tickets for this order
        const tickets = await prisma.ticket.findMany({
            where: { orderId: order.id },
            include: {
                category: true
            }
        });
        
        console.log('\n🎫 Tickets:');
        console.log('- Ticket count:', tickets.length);
        tickets.forEach((ticket, index) => {
            console.log(`  ${index + 1}. Category: ${ticket.category.name}, Amount: ${ticket.amount}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkSpecificOrder();
