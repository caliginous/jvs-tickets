#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 JVS Tessera - Comprehensive Database Seeding\n');

async function runCommand(command, args, description) {
  return new Promise((resolve, reject) => {
    console.log(`📋 ${description}...`);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${description} completed successfully\n`);
        resolve();
      } else {
        console.error(`❌ ${description} failed with exit code ${code}\n`);
        reject(new Error(`${description} failed`));
      }
    });

    child.on('error', (error) => {
      console.error(`❌ Error running ${description}:`, error.message);
      reject(error);
    });
  });
}

async function main() {
  try {
    console.log('⚠️  WARNING: This will completely reset your database!');
    console.log('⚠️  Only run this on development/test environments!');
    console.log('⚠️  Press Ctrl+C within 5 seconds to cancel...\n');
    
    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🔄 Starting comprehensive database seeding...\n');

    // 1. Reset database (optional - comment out if you want to keep existing data)
    console.log('🗑️  Resetting database schema...');
    await runCommand('npx', ['prisma', 'migrate', 'reset', '--force'], 'Database reset');

    // 2. Run the modern comprehensive seed
    console.log('🌱 Running comprehensive seed (users, venues, events, orders)...');
    await runCommand('npx', ['ts-node', '--compiler-options', '{"module":"CommonJS"}', 'prisma/seed-modern.ts'], 'Comprehensive seeding');

    // 3. Run email template seeding
    console.log('📧 Seeding email templates...');
    await runCommand('node', ['scripts/seed-email-templates-modern.js'], 'Email template seeding');

    console.log('🎉 All seeding completed successfully!');
    console.log('\n📊 Your development database now includes:');
    console.log('  👥 3 Admin users with full permissions');
    console.log('  🏢 3 Venues (JVS main, garden, TBC)');
    console.log('  🏷️ 8 Ticket categories (legacy system)');
    console.log('  🎭 6 Events (mix of free/paid, with/without seat maps)');
    console.log('  🎫 Modern EventTicketTypes for paid events');
    console.log('  💰 3 Discount codes');
    console.log('  📋 50 Orders with anonymized user data');
    console.log('  📧 8 Email templates with modern tokens');
    console.log('  ⚙️ System options and email settings');
    
    console.log('\n🔐 Admin Login Credentials:');
    console.log('  📧 admin@jvs.org.uk / 🔑 admin123');
    console.log('  📧 dev@jvs.org.uk / 🔑 dev123');
    console.log('  📧 test@jvs.org.uk / 🔑 test123');
    
    console.log('\n🌐 You can now:');
    console.log('  • Login to /admin with any of the above credentials');
    console.log('  • View realistic events with proper slugs and venues');
    console.log('  • Test both legacy categories and modern ticket types');
    console.log('  • Use discount codes: WELCOME20, STUDENT50, EARLYBIRD');
    console.log('  • Send test emails using the updated templates');

  } catch (error) {
    console.error('\n❌ Seeding process failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('  • Ensure your DATABASE_URL is set correctly');
    console.error('  • Check that PostgreSQL is running');
    console.error('  • Verify you have the required dependencies installed');
    console.error('  • Make sure you\'re in the tessera-main directory');
    process.exit(1);
  }
}

main();











