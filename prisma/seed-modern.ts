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
    console.log('🌱 Starting database seeding (modern EventTicketType system)...\n');

    // 1. Create Admin Users with proper permissions
    console.log('👥 Creating admin users...');
    const allPermissions = [
        "EventManagement", "UserManagement", "OrderManagement", 
        "TicketManagement", "EventTicketTypes", "LocalizationManagement",
        "OptionsManagement", "TaskManagement", "NotificationManagement",
        "ApiKeyManagement", "EmailManagement", "Orders",
        "Options", "Translation"
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

    // 3. Create Events with modern EventTicketType system
    console.log('\n🎭 Creating events with ticket types...');
    const events = [];
    
    const eventData = [
        {
            title: "Community Gardening Workshop",
            seatType: "free",
            description: "Join us for a hands-on gardening workshop where you'll learn sustainable growing techniques and help tend our community garden.",
            venueId: venue2.id,
            ticketTypes: [
                { name: "Standard", price: 500, capacity: 20 },
                { name: "Supporter", price: 1000, capacity: 10 }
            ]
        },
        {
            title: "Rosh Hashanah Community Dinner",
            seatType: "free", 
            description: "Celebrate the Jewish New Year with a delicious vegetarian feast and meaningful community connections.",
            bespokeMessage: "Please let us know of any dietary requirements when booking. We look forward to celebrating with you!",
            venueId: venue1.id,
            ticketTypes: [
                { name: "Adult", price: 2500, capacity: 50 },
                { name: "Child (under 12)", price: 1200, capacity: 20 },
                { name: "Young Person (13-25)", price: 1500, capacity: 15 }
            ]
        },
        {
            title: "Sustainable Fashion Workshop",
            seatType: "free",
            description: "Learn to upcycle clothing and discover sustainable fashion alternatives in this interactive workshop.",
            venueId: venue1.id,
            ticketTypes: [
                { name: "Standard", price: 1500, capacity: 25 },
                { name: "Supporter", price: 2500, capacity: 10 }
            ]
        },
        {
            title: "Free Community Lunch",
            seatType: "free",
            description: "A welcoming community lunch open to all. Come and meet your neighbors over delicious vegetarian food.",
            venueId: venue1.id,
            ticketTypes: [
                { name: "Free Entry", price: 0, capacity: 100 }
            ]
        },
        {
            title: "Young JVS Meet-up",
            seatType: "free",
            description: "Social gathering for young members of the JVS community. Great food, great company, great conversations!",
            venueId: venue1.id,
            ticketTypes: [
                { name: "Young Person", price: 800, capacity: 30 }
            ]
        },
        {
            title: "Theater Evening",
            seatType: "free",
            description: "Special theatrical performance. A unique cultural experience for our community.",
            venueId: venue1.id,
            ticketTypes: [
                { name: "Standard", price: 2000, capacity: 40 },
                { name: "Supporter", price: 2500, capacity: 20 }
            ]
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
                isActive: true,
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

        // Create EventTicketTypes
        const createdTicketTypes = [];
        for (const ticketType of eventInfo.ticketTypes) {
            const created = await prisma.eventTicketType.create({
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
            createdTicketTypes.push(created);
        }

        events.push({ ...event, ticketTypes: createdTicketTypes });
        console.log(`✅ Created event: ${eventInfo.title} (${createdTicketTypes.length} ticket types)`);
    }

    // 4. Create Discount Codes
    console.log('\n💰 Creating discount codes...');
    const discountCodes = [];
    
    const discountData = [
        {
            code: "WELCOME20",
            description: "20% discount for new members",
            discountType: "percentage",
            discountValue: 20,
            usageLimit: 100,
            validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
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
            discountValue: 500,
            usageLimit: 25,
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
    ];

    for (const discountInfo of discountData) {
        const discountCode = await prisma.discountCode.create({
            data: {
                ...discountInfo,
                createdById: adminUsers[0].id,
                appliesToEvents: []
            }
        });
        discountCodes.push(discountCode);
        console.log(`✅ Created discount code: ${discountInfo.code}`);
    }

    // 5. Create realistic Orders with anonymized users
    console.log('\n📋 Creating orders with anonymized user data...');
    
    const paymentTypes = ['stripe', 'pending', 'invoice'];
    const statuses = ['PAID', 'CONFIRMED', 'PENDING', 'CANCELLED'];
    const locales = ['en-GB', 'en-US'];
    
    for (let i = 0; i < 50; i++) {
        const { firstName, lastName } = getAnonymizedName();
        const eventToUse = faker.helpers.arrayElement(events);
        const paymentType = faker.helpers.arrayElement(paymentTypes);
        const status = paymentType === 'stripe' ? faker.helpers.arrayElement(['PAID', 'CONFIRMED']) : faker.helpers.arrayElement(statuses);
        const useDiscount = Math.random() < 0.2;
        const discountCode = useDiscount ? faker.helpers.arrayElement(discountCodes) : null;
        
        const orderDate = faker.date.recent();
        
        // Get ticket types for this event
        const ticketType = faker.helpers.arrayElement(eventToUse.ticketTypes);
        const ticketQuantity = getRandom(1, 3);
        
        // Calculate totals
        const originalTotal = ticketType.price * ticketQuantity;
        let finalTotal = originalTotal;
        let discountAmount = 0;
        
        if (discountCode) {
            if (discountCode.discountType === 'percentage') {
                discountAmount = Math.round(originalTotal * (discountCode.discountValue / 100));
            } else {
                discountAmount = Math.min(discountCode.discountValue, originalTotal);
            }
            finalTotal = originalTotal - discountAmount;
        }
        
        const order = await prisma.order.create({
            data: {
                user: {
                    create: {
                        firstName: firstName,
                        lastName: lastName,
                        email: faker.internet.email(),
                        address: faker.location.streetAddress(),
                        city: faker.location.city(),
                        zip: faker.location.zipCode(),
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
                discountAmount: discountAmount,
                originalTotal: originalTotal,
                finalTotal: finalTotal,
                paymentIntent: paymentType === 'stripe' ? JSON.stringify({
                    id: `pi_${randomUUID().replace(/-/g, '')}`,
                    status: 'succeeded'
                }) : null
            }
        });

        // Create OrderItem
        await prisma.orderItem.create({
            data: {
                orderId: order.id,
                eventTicketTypeId: ticketType.id,
                quantity: ticketQuantity,
                unitPrice: ticketType.price,
                currency: 'GBP'
            }
        });

        // Create individual Tickets (availability is computed from these rows)
        for (let j = 0; j < ticketQuantity; j++) {
            await prisma.ticket.create({
                data: {
                    orderId: order.id,
                    eventTicketTypeId: ticketType.id,
                    priceCharged: ticketType.price,
                    currency: 'GBP',
                    amount: 1,
                    secret: randomUUID(),
                    firstName: firstName,
                    lastName: lastName,
                    used: Math.random() < 0.1
                }
            });
        }

        if (i % 10 === 0) {
            console.log(`✅ Created ${i + 1}/50 orders...`);
        }
    }

    // 6. Create System Options
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

    // 7. Create Email Settings
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
    console.log(`🎭 Events: ${events.length} (with EventTicketTypes)`);
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
