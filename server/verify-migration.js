import { createConnection } from './src/db.js';

async function verifyMigration() {
  let db;
  try {
    console.log('Connecting to database...');
    db = await createConnection();
    
    console.log('\n📋 Verifying migration...\n');
    
    // Check users table columns
    console.log('1. Checking users table columns...');
    const [userColumns] = await db.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME IN ('is_online', 'last_seen_at')
      ORDER BY COLUMN_NAME
    `);
    
    if (userColumns.length === 2) {
      console.log('   ✅ Users table has online status columns:');
      userColumns.forEach(col => {
        console.log(`      - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (default: ${col.COLUMN_DEFAULT || 'NULL'})`);
      });
    } else {
      console.log('   ❌ Missing columns in users table');
      console.log('   Found:', userColumns.map(c => c.COLUMN_NAME));
    }
    
    // Check saved_cards table
    console.log('\n2. Checking saved_cards table...');
    const [cardTable] = await db.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'saved_cards'
    `);
    
    if (cardTable.length > 0) {
      console.log('   ✅ saved_cards table exists');
      
      // Check columns
      const [cardColumns] = await db.execute(`
        SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'saved_cards'
        ORDER BY ORDINAL_POSITION
      `);
      
      console.log('   Table structure:');
      cardColumns.forEach(col => {
        console.log(`      - ${col.COLUMN_NAME}: ${col.DATA_TYPE}`);
      });
    } else {
      console.log('   ❌ saved_cards table does not exist');
    }
    
    // Check indexes
    console.log('\n3. Checking indexes...');
    const [indexes] = await db.execute(`
      SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME 
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND (TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_online')
         OR (TABLE_NAME = 'saved_cards' AND INDEX_NAME LIKE 'idx_saved_cards%')
      ORDER BY TABLE_NAME, INDEX_NAME
    `);
    
    if (indexes.length > 0) {
      console.log('   ✅ Indexes found:');
      indexes.forEach(idx => {
        console.log(`      - ${idx.TABLE_NAME}.${idx.INDEX_NAME} on ${idx.COLUMN_NAME}`);
      });
    } else {
      console.log('   ⚠️  No indexes found (may need to be created)');
    }
    
    console.log('\n✅ Migration verification complete!\n');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    if (db) {
      await db.end();
    }
  }
}

verifyMigration();

