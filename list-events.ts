import prisma from "./src/lib/prisma";

async function listAllEvents() {
    console.log("🔍 Fetching all events from database...\n");

    try {
        // First, let's just get the basic event data (only fields that exist in current schema)
        const events = await prisma.event.findMany({
            select: {
                id: true,
                title: true,
                slug: true,
                coverImage: true,
                coverImageSize: true,
                personalTicket: true,
                venueId: true,
                description: true,
                isActive: true
            },
            orderBy: {
                id: 'desc'
            }
        });

        // Then get related data separately to avoid schema issues
        const eventsWithDetails = await Promise.all(
            events.map(async (event) => {
                try {
                    const dates = await prisma.eventDate.findMany({
                        where: { eventId: event.id },
                        select: {
                            id: true,
                            date: true,
                            totalTicketLimit: true
                        }
                    });

                    const ticketTypesCount = await prisma.eventTicketType.count({
                        where: { eventId: event.id }
                    });

                    const ordersCount = await prisma.eventDate.count({
                        where: {
                            eventId: event.id,
                            orders: {
                                some: {}
                            }
                        }
                    });

                    return {
                        ...event,
                        dates: dates || [],
                        ticketTypesCount: ticketTypesCount || 0,
                        ordersCount: ordersCount || 0
                    };
                } catch (error) {
                    console.warn(`Error getting details for event ${event.id}:`, error);
                    return {
                        ...event,
                        dates: [],
                        ticketTypesCount: 0,
                        ordersCount: 0
                    };
                }
            })
        );

        if (eventsWithDetails.length === 0) {
            console.log("📭 No events found in the database.");
            return;
        }

        console.log(`📋 Found ${eventsWithDetails.length} event(s) in total:\n`);
        console.log("═".repeat(100));

        eventsWithDetails.forEach((event, index) => {
            console.log(`${index + 1}. 🎭 Event ID: ${event.id}`);
            console.log(`   📌 Title: ${event.title}`);
            console.log(`   🔗 Slug: ${event.slug || 'N/A'}`);
            console.log(`   🏢 Venue: ${event.venueId ? `Venue ID: ${event.venueId}` : 'No venue specified'}`);
            console.log(`   📝 Description: ${event.description ? event.description.substring(0, 100) + '...' : 'No description'}`);
            console.log(`   🎫 Personal Ticket: ${event.personalTicket ? 'Yes' : 'No'}`);
            console.log(`   ✅ Active: ${event.isActive ? 'Yes' : 'No'}`);
            console.log(`   📊 Ticket Types: ${event.ticketTypesCount}`);
            console.log(`   📅 Event Dates: ${event.dates.length}`);

            // Show event dates
            if (event.dates.length > 0) {
                console.log(`   📅 Dates:`);
                event.dates.forEach((date, dateIndex) => {
                    console.log(`      ${dateIndex + 1}. ${new Date(date.date).toLocaleDateString()} - Limit: ${date.totalTicketLimit || 'No limit'}, Orders: ${event.ordersCount}`);
                });
            }

            console.log("─".repeat(50));
        });

        console.log(`\n✅ Successfully listed ${eventsWithDetails.length} event(s)`);

    } catch (error) {
        console.error("❌ Error fetching events:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
listAllEvents();
