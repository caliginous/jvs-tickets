import prisma from "../src/lib/prisma";
import { faker } from "@faker-js/faker";
import { randomUUID } from "crypto";
import { Options } from "../src/constants/Constants";
import bcrypt from "bcryptjs";

// Helper functions
function getRandom(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

// Anonymization helpers
const anonymizedNames = {
    first: ['Alex', 'Jordan', 'Casey', 'Taylor', 'Morgan', 'Riley', 'Avery', 'Quinn', 'Sage', 'River'],
    last: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']
};

function getAnonymizedName() {
    return {
        firstName: faker.helpers.arrayElement(anonymizedNames.first),
        lastName: faker.helpers.arrayElement(anonymizedNames.last)
    };
}

export async function main() {
    console.log('🌱 Starting comprehensive database seeding...\n');

    // 1. Create Admin Users with proper permissions
    console.log('👥 Creating admin users...');
    const allPermissions = [
        "EventManagement", "UserManagement", "OrderManagement", 
        "CategoryManagement", "SeatMapManagement", "LocalizationManagement",
        "OptionsManagement", "TaskManagement", "NotificationManagement",
        "ApiKeyManagement", "EmailManagement", "Orders",
        "EventSeatMaps", "Options", "EventCategories", "Translation"
    ];

    const adminUsers = [];
    const adminUserData = [
        { userName: 'admin', email: 'admin@jvs.org.uk', password: 'admin123' },
        { userName: 'devuser', email: 'dev@jvs.org.uk', password: 'dev123' },
        { userName: 'testuser', email: 'test@jvs.org.uk', password: 'test123' }
    ];

    for (const userData of adminUserData) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const adminUser = await prisma.adminUser.create({
            data: {
                userName: userData.userName,
                email: userData.email,
                password: hashedPassword,
                readRights: JSON.stringify(allPermissions),
                writeRights: JSON.stringify(allPermissions)
            }
        });
        adminUsers.push(adminUser);
        console.log(`✅ Created admin user: ${userData.email}`);
    }

    // 2. Create Venues
    console.log('\n🏢 Creating venues...');
    const venues = [];
    
    const venue1 = await prisma.venue.create({
        data: {
            name: "JVS Community Hall - Main Location",
            address: "853-855 Finchley Road",
            city: "London",
            postcode: "NW11 8LX",
            description: "Main JVS community space with full facilities for events and gatherings.",
            isActive: true,
            createdById: adminUsers[0].id
        }
    });
    venues.push(venue1);

    const venue2 = await prisma.venue.create({
        data: {
            name: "JVS Garden Space",
            address: "853-855 Finchley Road",
            city: "London", 
            postcode: "NW11 8LX",
            description: "Outdoor garden area perfect for community gardening and outdoor events.",
            isActive: true,
            createdById: adminUsers[0].id
        }
    });
    venues.push(venue2);

    const venue3 = await prisma.venue.create({
        data: {
            name: "To Be Confirmed",
            city: "London",
            description: "Flexible venue option for events where location is still being determined.",
            isActive: true,
            createdById: adminUsers[0].id
        }
    });
    venues.push(venue3);

    console.log(`✅ Created ${venues.length} venues`);

    // 3. Create Categories (legacy system - still needed for backward compatibility)
    console.log('\n🏷️ Creating ticket categories...');
    const categories = [];
    
    const categoryData = [
        { label: "Free Entry", price: 0, color: "#4CAF50" },
        { label: "Standard Entry", price: 5, color: "#2196F3" },
        { label: "Standard Entry", price: 10, color: "#2196F3" },
        { label: "Standard Entry", price: 15, color: "#2196F3" },
        { label: "Standard Entry", price: 20, color: "#2196F3" },
        { label: "Supporter Ticket", price: 25, color: "#FF9800" },
        { label: "Child Entry", price: 8, color: "#9C27B0" },
        { label: "Young Person", price: 12, color: "#9C27B0" }
    ];

    for (const catData of categoryData) {
        const category = await prisma.category.create({
            data: catData
        });
        categories.push(category);
    }
    console.log(`✅ Created ${categories.length} categories`);

    // 4. Create SeatMap (for seatmap events)
    console.log('\n🪑 Creating seat map...');
    const seatMap = await prisma.seatMap.create({
        data: {
            definition: JSON.stringify([
                [
                    {"id":1,"category":1,"amount":1,"type":"seat"},
                    {"id":2,"category":1,"amount":1,"type":"seat"},
                    {"id":3,"category":1,"amount":1,"type":"seat"},
                    {"id":4,"category":1,"amount":1,"type":"seat"},
                    {"id":5,"category":1,"amount":1,"type":"seat"},
                    {"id":6,"category":1,"amount":1,"type":"seat"},
                    {"type":"space"},
                    {"id":7,"category":1,"amount":1,"type":"seat"},
                    {"id":8,"category":1,"amount":1,"type":"seat"},
                    {"id":9,"category":1,"amount":1,"type":"seat"},
                    {"id":10,"category":1,"amount":1,"type":"seat"}
                ],
                [
                    {"id":11,"category":2,"amount":1,"type":"seat"},
                    {"id":12,"category":2,"amount":1,"type":"seat"},
                    {"id":13,"category":2,"amount":1,"type":"seat"},
                    {"id":14,"category":2,"amount":1,"type":"seat"},
                    {"id":15,"category":2,"amount":1,"type":"seat"},
                    {"id":16,"category":2,"amount":1,"type":"seat"},
                    {"type":"space"},
                    {"id":17,"category":2,"amount":1,"type":"seat"},
                    {"id":18,"category":2,"amount":1,"type":"seat"},
                    {"id":19,"category":2,"amount":1,"type":"seat"},
                    {"id":20,"category":2,"amount":1,"type":"seat"}
                ]
            ])
        }
    });
    console.log('✅ Created seat map with 20 seats');

    // 5. Create Events with modern structure
    console.log('\n🎭 Creating events...');
    const events = [];
    
    const eventData = [
        {
            title: "Community Gardening Workshop",
            seatType: "free",
            description: "Join us for a hands-on gardening workshop where you'll learn sustainable growing techniques and help tend our community garden.",
            venueId: venue2.id,
            hasTicketTypes: true,
            ticketTypes: [
                { name: "Standard", price: 500, capacity: 20 }, // £5.00
                { name: "Supporter", price: 1000, capacity: 10 } // £10.00
            ],
            categories: [categories[1].id] // Standard Entry £5
        },
        {
            title: "Rosh Hashanah Community Dinner",
            seatType: "free", 
            description: "Celebrate the Jewish New Year with a delicious vegetarian feast and meaningful community connections.",
            bespokeMessage: "Please let us know of any dietary requirements when booking. We look forward to celebrating with you!",
            venueId: venue1.id,
            hasTicketTypes: true,
            ticketTypes: [
                { name: "Adult", price: 2500, capacity: 50 }, // £25.00
                { name: "Child (under 12)", price: 1200, capacity: 20 }, // £12.00
                { name: "Young Person (13-25)", price: 1500, capacity: 15 } // £15.00
            ],
            categories: [categories[5].id] // Supporter Ticket £25
        },
        {
            title: "Sustainable Fashion Workshop",
            seatType: "free",
            description: "Learn to upcycle clothing and discover sustainable fashion alternatives in this interactive workshop.",
            venueId: venue1.id,
            hasTicketTypes: true,
            ticketTypes: [
                { name: "Standard", price: 1500, capacity: 25 }, // £15.00
                { name: "Supporter", price: 2500, capacity: 10 } // £25.00
            ],
            categories: [categories[3].id] // Standard Entry £15
        },
        {
            title: "Free Community Lunch",
            seatType: "free",
            description: "A welcoming community lunch open to all. Come and meet your neighbors over delicious vegetarian food.",
            venueId: venue1.id,
            hasTicketTypes: false,
            categories: [categories[0].id] // Free Entry
        },
        {
            title: "Young JVS Meet-up",
            seatType: "free",
            description: "Social gathering for young members of the JVS community. Great food, great company, great conversations!",
            venueId: venue1.id,
            hasTicketTypes: true,
            ticketTypes: [
                { name: "Young Person", price: 800, capacity: 30 } // £8.00
            ],
            categories: [categories[7].id] // Young Person £12
        },
        {
            title: "Theater Evening with Assigned Seating",
            seatType: "seatmap",
            description: "Special theatrical performance with reserved seating. A unique cultural experience for our community.",
            venueId: venue1.id,
            seatMapId: seatMap.id,
            hasTicketTypes: false,
            categories: [categories[4].id, categories[5].id] // Standard £20 + Supporter £25
        }
    ];

    for (const eventInfo of eventData) {
        const slug = generateSlug(eventInfo.title);
        
        const event = await prisma.event.create({
            data: {
                title: eventInfo.title,
                seatType: eventInfo.seatType,
                description: eventInfo.description,
                bespokeMessage: eventInfo.bespokeMessage,
                slug: slug,
                venueId: eventInfo.venueId,
                seatMapId: eventInfo.seatMapId,
                isActive: true,
                categories: {
                    create: eventInfo.categories.map(categoryId => ({
                        categoryId: categoryId
                    }))
                },
                dates: {
                    create: [
                        {
                            title: eventInfo.title,
                            date: faker.date.future(),
                            ticketSaleStartDate: faker.date.recent(),
                            ticketSaleEndDate: faker.date.future()
                        }
                    ]
                }
            },
            include: {
                dates: true
            }
        });

        // Create EventTicketTypes if specified
        if (eventInfo.hasTicketTypes && eventInfo.ticketTypes) {
            for (const ticketType of eventInfo.ticketTypes) {
                await prisma.eventTicketType.create({
                    data: {
                        eventId: event.id,
                        name: ticketType.name,
                        price: ticketType.price,
                        capacity: ticketType.capacity,
                        currency: "GBP",
                        isActive: true,
                        isPublic: true
                    }
                });
            }
        }

        events.push(event);
        console.log(`✅ Created event: ${eventInfo.title}`);
    }

    // 6. Create Discount Codes
    console.log('\n💰 Creating discount codes...');
    const discountCodes = [];
    
    const discountData = [
        {
            code: "WELCOME20",
            description: "20% discount for new members",
            discountType: "percentage",
            discountValue: 20,
            usageLimit: 100,
            validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
        },
        {
            code: "STUDENT50", 
            description: "50% discount for students",
            discountType: "percentage",
            discountValue: 50,
            usageLimit: 50,
            validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        },
        {
            code: "EARLYBIRD",
            description: "Early bird £5 discount",
            discountType: "fixed",
            discountValue: 500, // £5.00 in pence
            usageLimit: 25,
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
    ];

    for (const discountInfo of discountData) {
        const discountCode = await prisma.discountCode.create({
            data: {
                ...discountInfo,
                createdById: adminUsers[0].id,
                appliesToEvents: [],
                appliesToCategories: []
            }
        });
        discountCodes.push(discountCode);
        console.log(`✅ Created discount code: ${discountInfo.code}`);
    }

    // 7. Create realistic Orders with anonymized users
    console.log('\n📋 Creating orders with anonymized user data...');
    
    const paymentTypes = ['stripe', 'pending', 'invoice'];
    const statuses = ['PAID', 'PENDING', 'CANCELLED'];
    const locales = ['en-GB', 'en-US'];
    
    for (let i = 0; i < 50; i++) {
        const { firstName, lastName } = getAnonymizedName();
        const eventToUse = faker.helpers.arrayElement(events);
        const paymentType = faker.helpers.arrayElement(paymentTypes);
        const status = paymentType === 'stripe' ? 'PAID' : faker.helpers.arrayElement(statuses);
        const useDiscount = Math.random() < 0.2; // 20% chance of discount
        const discountCode = useDiscount ? faker.helpers.arrayElement(discountCodes) : null;
        
        const orderDate = faker.date.recent();
        
        // Get ticket types for this event
        const eventTicketTypes = await prisma.eventTicketType.findMany({
            where: { eventId: eventToUse.id }
        });
        
        const order = await prisma.order.create({
            data: {
                user: {
                    create: {
                        firstName: firstName,
                        lastName: lastName,
                        email: faker.internet.email(),
                        address: faker.address.streetAddress(),
                        city: faker.address.city(),
                        zip: faker.address.zipCode(),
                        countryCode: 'GB',
                        regionCode: 'London',
                        phone: faker.phone.number('07### ######')
                    }
                },
                paymentType: paymentType,
                status: status,
                shipping: JSON.stringify({ type: "email", data: {} }),
                locale: faker.helpers.arrayElement(locales),
                date: orderDate,
                idempotencyKey: randomUUID(),
                cancellationSecret: randomUUID(),
                invoiceNumber: i + 1,
                eventDateId: eventToUse.dates[0]?.id || 1,
                discountCodeId: discountCode?.id,
                discountAmount: discountCode ? (discountCode.discountType === 'percentage' ? 0 : discountCode.discountValue) : 0,
                paymentIntent: paymentType === 'stripe' ? JSON.stringify({
                    id: `pi_${randomUUID().replace(/-/g, '')}`,
                    status: 'succeeded'
                }) : null
            }
        });

        // Create tickets based on event type
        const ticketQuantity = getRandom(1, 3);
        
        if (eventTicketTypes.length > 0) {
            // Modern ticket system - create OrderItems and Tickets
            const ticketType = faker.helpers.arrayElement(eventTicketTypes);
            
            await prisma.orderItem.create({
                data: {
                    orderId: order.id,
                    eventTicketTypeId: ticketType.id,
                    quantity: ticketQuantity,
                    unitPrice: ticketType.price,
                    currency: 'GBP'
                }
            });

            // Create individual tickets
            for (let j = 0; j < ticketQuantity; j++) {
                await prisma.ticket.create({
                    data: {
                        orderId: order.id,
                        eventTicketTypeId: ticketType.id,
                        priceCharged: ticketType.price,
                        secret: randomUUID(),
                        used: Math.random() < 0.1 // 10% chance ticket is used
                    }
                });
            }
        } else {
            // Legacy system - create tickets with categories
            const eventCategories = await prisma.categoriesOnEvents.findMany({
                where: { eventId: eventToUse.id },
                include: { category: true }
            });
            
            if (eventCategories.length > 0) {
                const categoryToUse = faker.helpers.arrayElement(eventCategories);
                
                for (let j = 0; j < ticketQuantity; j++) {
                    await prisma.ticket.create({
                        data: {
                            orderId: order.id,
                            categoryId: categoryToUse.categoryId,
                            priceCharged: Math.round(categoryToUse.category.price * 100), // Convert to pence
                            secret: randomUUID(),
                            used: Math.random() < 0.1,
                            seatId: eventToUse.seatType === 'seatmap' ? getRandom(1, 20) : null
                        }
                    });
                }
            }
        }

        if (i % 10 === 0) {
            console.log(`✅ Created ${i + 1}/50 orders...`);
        }
    }

    // 8. Create System Options
    console.log('\n⚙️ Creating system options...');
    const options = [
        { key: Options.InvoiceNumber, value: JSON.stringify({ value: 51 }) },
        { key: "payment.currency", value: "GBP" },
        { key: "email.app-name", value: "JVS Events" },
        { key: "email.app-url", value: "https://tickets.jvs.org.uk" },
        { key: "email.sender-name", value: "Jewish Vegetarian Society" },
        { key: "email.support-email", value: "support@jvs.org.uk" }
    ];

    for (const option of options) {
        await prisma.option.create({
            data: option
        });
    }
    console.log(`✅ Created ${options.length} system options`);

    // 9. Create Email Settings
    console.log('\n📧 Creating email settings...');
    await prisma.emailSettings.create({
        data: {
            transportMode: "smtp",
            smtpHost: "smtp.example.com",
            smtpPort: 587,
            smtpSecure: false,
            smtpUser: "noreply@jvs.org.uk",
            smtpPassword: "password123",
            senderEmail: "noreply@jvs.org.uk",
            senderName: "Jewish Vegetarian Society",
            bccEmail: "admin@jvs.org.uk",
            appBaseUrl: "https://tickets.jvs.org.uk",
            updatedBy: adminUsers[0].id
        }
    });
    console.log('✅ Created email settings');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`👥 Admin Users: ${adminUsers.length}`);
    console.log(`🏢 Venues: ${venues.length}`);
    console.log(`🏷️ Categories: ${categories.length}`);
    console.log(`🎭 Events: ${events.length}`);
    console.log(`💰 Discount Codes: ${discountCodes.length}`);
    console.log(`📋 Orders: 50 (with anonymized users)`);
    console.log(`⚙️ System Options: ${options.length}`);
    console.log('📧 Email Settings: 1');
    
    console.log('\n🔐 Admin Login Details:');
    adminUserData.forEach(user => {
        console.log(`   📧 ${user.email} / 🔑 ${user.password}`);
    });
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });


