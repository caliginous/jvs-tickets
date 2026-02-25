import prisma from "../src/lib/prisma";

console.log(`
⚠️  DEPRECATED SEED FILE ⚠️

This seed file is outdated and missing many modern database features.

For comprehensive seeding that matches your current schema, use:

🚀 Quick Start:
   npm run seed:modern

🔧 Manual Commands:
   npx ts-node --compiler-options {"module":"CommonJS"} prisma/seed-modern.ts
   node scripts/seed-email-templates-modern.js

📋 What the modern seed includes:
   • Admin users with proper permissions
   • Venues with realistic data  
   • Modern EventTicketTypes (not just legacy categories)
   • Events with slugs, descriptions, bespoke messages
   • Realistic orders with anonymized user data
   • Discount codes
   • Email templates with latest tokens
   • System options and email settings

🔄 For a complete reset and seed:
   node scripts/run-comprehensive-seed.js

📁 Legacy seed backed up to: prisma/seed-legacy-backup.ts
`);

// Prevent accidental execution
export async function main() {
    console.log('❌ This seed file is deprecated. Please use the modern seeding scripts above.');
    process.exit(1);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });