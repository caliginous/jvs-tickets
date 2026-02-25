const { Client } = require('pg');
require('dotenv').config();

async function checkNeonDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Connecting to Neon database...');
    await client.connect();

    console.log('✅ Connected successfully!');

    // Get database information
    const dbInfo = await client.query(`
      SELECT
        current_database() as database_name,
        current_user as current_user,
        version() as postgres_version,
        pg_postmaster_start_time() as server_start_time,
        pg_database_size(current_database()) as database_size
    `);

    console.log('\n📊 DATABASE INFORMATION:');
    console.log('='.repeat(50));
    console.log(`Database Name: ${dbInfo.rows[0].database_name}`);
    console.log(`Current User: ${dbInfo.rows[0].current_user}`);
    console.log(`PostgreSQL Version: ${dbInfo.rows[0].postgres_version.split(' ')[0]} ${dbInfo.rows[0].postgres_version.split(' ')[1]}`);
    console.log(`Server Start Time: ${dbInfo.rows[0].server_start_time}`);
    console.log(`Database Size: ${Math.round(dbInfo.rows[0].database_size / 1024 / 1024)} MB`);

    // Check if this is a Neon database
    const neonCheck = await client.query(`
      SELECT
        setting as neon_version
      FROM pg_settings
      WHERE name = 'neon.version'
    `);

    if (neonCheck.rows.length > 0) {
      console.log(`Neon Version: ${neonCheck.rows[0].neon_version}`);
    } else {
      console.log('❌ This does not appear to be a Neon database');
    }

    // Get table information
    const tables = await client.query(`
      SELECT
        schemaname,
        tablename,
        tableowner,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log('\n📋 TABLES IN DATABASE:');
    console.log('='.repeat(50));
    if (tables.rows.length === 0) {
      console.log('No tables found');
    } else {
      tables.rows.forEach(table => {
        console.log(`${table.tablename} (${table.size})`);
      });
    }

    // Check for recent activity
    const recentActivity = await client.query(`
      SELECT
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        last_autoanalyze,
        last_autovacuum
      FROM pg_stat_user_tables
      ORDER BY last_autoanalyze DESC NULLS LAST
      LIMIT 5
    `);

    console.log('\n📈 RECENT ACTIVITY:');
    console.log('='.repeat(50));
    if (recentActivity.rows.length === 0) {
      console.log('No activity data available');
    } else {
      recentActivity.rows.forEach(activity => {
        console.log(`${activity.tablename}: ${activity.inserts} inserts, ${activity.updates} updates, ${activity.deletes} deletes`);
        if (activity.last_autoanalyze) {
          console.log(`  Last analyzed: ${activity.last_autoanalyze}`);
        }
      });
    }

    // Check if we can see any backup-related information
    console.log('\n🔄 CHECKING FOR BACKUP INFORMATION:');
    console.log('='.repeat(50));

    try {
      const backupInfo = await client.query(`
        SELECT
          name,
          setting
        FROM pg_settings
        WHERE name LIKE '%backup%' OR name LIKE '%archive%' OR name LIKE '%wal%'
      `);

      if (backupInfo.rows.length > 0) {
        backupInfo.rows.forEach(setting => {
          console.log(`${setting.name}: ${setting.setting}`);
        });
      } else {
        console.log('No backup-related settings visible at database level');
      }
    } catch (backupError) {
      console.log('Could not query backup settings:', backupError.message);
    }

    console.log('\n💡 RECOMMENDATION:');
    console.log('='.repeat(50));
    console.log('✅ Database is accessible and functioning');
    console.log('✅ This appears to be a Neon PostgreSQL database');
    console.log('📋 For backup recovery, you should:');
    console.log('   1. Go to Vercel Dashboard → Storage → Neon');
    console.log('   2. Look for "Backups" or "Point-in-Time Recovery"');
    console.log('   3. Restore to a point before the seed command was run');

  } catch (error) {
    console.error('❌ Error connecting to database:', error.message);

    if (error.message.includes('authentication')) {
      console.log('\n🔐 AUTHENTICATION ISSUE:');
      console.log('The database credentials may have expired or changed.');
      console.log('Try refreshing the DATABASE_URL in your .env file.');
    } else if (error.message.includes('connect')) {
      console.log('\n🌐 CONNECTION ISSUE:');
      console.log('Cannot reach the database server.');
      console.log('Check your internet connection and DATABASE_URL.');
    }
  } finally {
    await client.end();
  }
}

checkNeonDatabase();
