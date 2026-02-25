const { Client } = require('pg');
require('dotenv').config();

async function checkDatabaseStatus() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Connecting to database...');
    await client.connect();

    console.log('✅ Connected successfully!');

    // Get basic database information
    const dbInfo = await client.query(`
      SELECT
        current_database() as database_name,
        current_user as current_user,
        version() as postgres_version,
        pg_database_size(current_database()) as database_size
    `);

    console.log('\n📊 DATABASE INFORMATION:');
    console.log('='.repeat(50));
    console.log(`Database Name: ${dbInfo.rows[0].database_name}`);
    console.log(`Current User: ${dbInfo.rows[0].current_user}`);
    console.log(`PostgreSQL Version: ${dbInfo.rows[0].postgres_version.split(' ')[0]} ${dbInfo.rows[0].postgres_version.split(' ')[1]}`);
    console.log(`Database Size: ${Math.round(dbInfo.rows[0].database_size / 1024 / 1024)} MB`);

    // Check what tables actually exist
    const allTables = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log('\n📋 ALL TABLES IN DATABASE:');
    console.log('='.repeat(50));
    if (allTables.rows.length === 0) {
      console.log('❌ No tables found - this may be an empty database');
    } else {
      console.log(`Found ${allTables.rows.length} tables:`);
      allTables.rows.forEach(table => {
        console.log(`   - ${table.tablename}`);
      });
    }

    // Check specifically for Event table
    const eventTables = allTables.rows.filter(t => t.tablename.toLowerCase().includes('event'));
    if (eventTables.length > 0) {
      console.log('\n🎭 EVENT-RELATED TABLES:');
      eventTables.forEach(table => {
        console.log(`   - ${table.tablename}`);
      });

      // Try to query the Event table
      try {
        const events = await client.query(`SELECT COUNT(*) as count FROM "Event"`);
        console.log(`✅ Event table exists with ${events.rows[0].count} records`);
      } catch (error) {
        console.log(`❌ Cannot query Event table: ${error.message}`);
      }
    } else {
      console.log('\n❌ No event-related tables found');
    }

    console.log('\n🔄 DATABASE STATUS SUMMARY:');
    console.log('='.repeat(50));
    console.log('✅ Connection: Working');
    console.log('✅ Authentication: Working');
    console.log(`📊 Tables found: ${allTables.rows.length}`);
    console.log(`📏 Database size: ${Math.round(dbInfo.rows[0].database_size / 1024 / 1024)} MB`);

    if (allTables.rows.length > 0) {
      console.log('\n💡 The database contains tables, which suggests:');
      console.log('   - Schema has been created (possibly by Prisma migration)');
      console.log('   - Data may have been seeded');
      console.log('   - Your original events may have been overwritten');
    } else {
      console.log('\n💡 The database appears to be empty:');
      console.log('   - No tables found');
      console.log('   - May need to run Prisma migrations');
      console.log('   - May need to seed the database');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.message.includes('authentication')) {
      console.log('\n🔐 AUTHENTICATION ISSUE DETECTED');
      console.log('The DATABASE_URL may be invalid or expired');
      console.log('Check your .env file and refresh the credentials if needed');
    } else if (error.message.includes('connect')) {
      console.log('\n🌐 CONNECTION ISSUE DETECTED');
      console.log('Cannot reach the database server');
      console.log('Check your internet connection');
    } else {
      console.log('\n❓ UNKNOWN ERROR');
      console.log('The error may be related to database permissions or state');
    }
  } finally {
    await client.end();
  }
}

checkDatabaseStatus();
