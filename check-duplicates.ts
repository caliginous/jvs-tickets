import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicates() {
    console.log('🔍 Checking for duplicate emails in User table...\n');

    try {
        // Check for duplicate emails
        const duplicateEmails = await prisma.$queryRaw`
            SELECT email, COUNT(*) as count
            FROM "User"
            GROUP BY email
            HAVING COUNT(*) > 1
            ORDER BY count DESC
        `;

        console.log('📧 Duplicate emails found:');
        console.log(duplicateEmails);

        // Check for duplicate slugs in Event table
        const duplicateSlugs = await prisma.$queryRaw`
            SELECT slug, COUNT(*) as count
            FROM "Event"
            WHERE slug IS NOT NULL
            GROUP BY slug
            HAVING COUNT(*) > 1
            ORDER BY count DESC
        `;

        console.log('\n🏷️  Duplicate slugs found:');
        console.log(duplicateSlugs);

        // Show total counts
        const userCount = await prisma.user.count();
        const eventCount = await prisma.event.count();

        console.log(`\n📊 Totals:`);
        console.log(`   Users: ${userCount}`);
        console.log(`   Events: ${eventCount}`);

    } catch (error) {
        console.error('❌ Error checking duplicates:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDuplicates();













