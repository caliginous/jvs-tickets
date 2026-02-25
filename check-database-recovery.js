const { Client } = require('pg');
require('dotenv').config();

async function checkDatabaseRecovery() {
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

    // Check if tables exist
    const tables = await client.query(`
      SELECT
        tablename,
        pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log('\n📋 TABLES IN DATABASE:');
    console.log('='.repeat(50));
    if (tables.rows.length === 0) {
      console.log('❌ No tables found - database may be empty or corrupted');
    } else {
      tables.rows.forEach(table => {
        console.log(`✅ ${table.tablename} (${table.size})`);
      });
    }

    // Check for your events specifically
    console.log('\n🎭 CHECKING FOR YOUR EVENTS:');
    console.log('='.repeat(50));

    try {
      const events = await client.query(`
        SELECT id, title, description, "isActive", "seatType"
        FROM "Event"
        ORDER BY id
      `);

      if (events.rows.length === 0) {
        console.log('❌ No events found in the Event table');
        console.log('💡 Your original events may have been lost when seed was run');
      } else {
        console.log(`✅ Found ${events.rows.length} events:`);
        events.rows.forEach(event => {
          console.log(`   - ID ${event.id}: "${event.title}" (${event.isActive ? 'Active' : 'Inactive'})`);
        });
      }
    } catch (error) {
      console.log('❌ Could not query Event table:', error.message);
    }

    // Check for orders
    try {
      const orders = await client.query(`
        SELECT COUNT(*) as order_count
        FROM "Order"
      `);

      console.log(`\n🛒 ORDERS: Found ${orders.rows[0].order_count} orders in database`);
    } catch (error) {
      console.log('❌ Could not query Order table:', error.message);
    }

    console.log('\n🔄 RECOVERY STATUS:');
    console.log('='.repeat(50));
    console.log('✅ Database connection: Working');
    console.log('✅ Database access: Confirmed');
    console.log('⚠️  Event data: May have been lost due to seed overwrite');

    console.log('\n💡 NEXT STEPS FOR RECOVERY:');
    console.log('='.repeat(50));
    console.log('1. Check Vercel Dashboard → Storage → Neon for backup options');
    console.log('2. Look for "Point-in-Time Recovery" or "Backups" section');
    console.log('3. If available, restore to a point before seed was run');
    console.log('4. Alternatively, recreate your events manually in the admin interface');
    console.log('5. We can help restore from your CSV files if needed');

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);

    if (error.message.includes('authentication')) {
      console.log('\n🔐 SOLUTION: Check DATABASE_URL in .env file');
      console.log('Your database credentials may have expired');
    } else if (error.message.includes('connect')) {
      console.log('\n🌐 SOLUTION: Check internet connection');
      console.log('Cannot reach the database server');
    }
  } finally {
    await client.end();
  }
}

checkDatabaseRecovery();
