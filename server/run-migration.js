import { createConnection } from './src/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  let db;
  try {
    console.log('Connecting to database...');
    db = await createConnection();
    
    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, '../mysql/migration_online_status_and_cards.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Remove comments and split by semicolons
    const cleanedSQL = migrationSQL
      .split('\n')
      .map(line => line.replace(/--.*$/, '').trim())
      .filter(line => line.length > 0)
      .join('\n');
    
    // Split by semicolons and filter out empty statements
    const statements = cleanedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.match(/^\s*$/));
    
    console.log(`Found ${statements.length} SQL statements to execute...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 0) {
        try {
          console.log(`\nExecuting statement ${i + 1}/${statements.length}:`);
          console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
          await db.execute(statement);
          console.log(`✓ Statement ${i + 1} executed successfully`);
        } catch (error) {
          // Check if it's a "duplicate column" or "table already exists" error
          if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log(`⚠ Statement ${i + 1} skipped (already exists): ${error.message}`);
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    process.exit(1);
  } finally {
    if (db) {
      await db.end();
      console.log('Database connection closed.');
    }
  }
}

runMigration();

