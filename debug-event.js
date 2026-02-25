const { PrismaClient } = require('@prisma/client');

async function checkEvent() {
    const prisma = new PrismaClient();
    
    try {
        const event = await prisma.event.findUnique({
            where: { id: 57 },
            include: {
                categories: {
                    include: {
                        category: true
                    }
                }
            }
        });
        
        console.log('Event ID 57 - Re-Wear the Revolution:');
        console.log('Title:', event?.title);
        console.log('Categories found:', event?.categories?.length || 0);
        
        if (event?.categories) {
            event.categories.forEach((cat, index) => {
                console.log(`Category ${index + 1}:`, {
                    id: cat.category.id,
                    label: cat.category.label,
                    price: cat.category.price,
                    maxAmount: cat.maxAmount
                });
            });
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkEvent();











