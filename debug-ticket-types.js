const { PrismaClient } = require('@prisma/client');

async function checkTicketTypes() {
    const prisma = new PrismaClient();
    
    try {
        // Check what ticket types exist for event 57
        const event = await prisma.event.findUnique({
            where: { id: 57 },
            include: {
                ticketTypes: true, // Check if this relation exists
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
        console.log('Ticket Types found:', event?.ticketTypes?.length || 0);
        
        if (event?.ticketTypes) {
            console.log('\nTicket Types:');
            event.ticketTypes.forEach((tt, index) => {
                console.log(`Ticket Type ${index + 1}:`, {
                    id: tt.id,
                    name: tt.name || tt.label,
                    price: tt.price,
                    maxQuantity: tt.maxQuantity || tt.maxAmount
                });
            });
        }
        
        if (event?.categories) {
            console.log('\nCategories:');
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
        
        // If ticketTypes relation doesn't exist, let's check for other possible relations
        try {
            console.log('\nTrying alternative approach...');
            const eventWithAll = await prisma.event.findUnique({
                where: { id: 57 },
                include: {
                    dates: {
                        include: {
                            ticketTypes: true // Maybe ticket types are on dates?
                        }
                    }
                }
            });
            
            if (eventWithAll?.dates) {
                eventWithAll.dates.forEach((date, dateIndex) => {
                    console.log(`Date ${dateIndex + 1} ticket types:`, date.ticketTypes?.length || 0);
                    if (date.ticketTypes) {
                        date.ticketTypes.forEach((tt, index) => {
                            console.log(`  Ticket Type ${index + 1}:`, {
                                id: tt.id,
                                name: tt.name || tt.label,
                                price: tt.price
                            });
                        });
                    }
                });
            }
        } catch (e2) {
            console.log('Alternative approach also failed:', e2.message);
        }
    } finally {
        await prisma.$disconnect();
    }
}

checkTicketTypes();











