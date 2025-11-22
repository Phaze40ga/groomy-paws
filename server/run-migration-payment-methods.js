import { createConnection } from './src/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  let db;
  try {
    db = await createConnection();
    const migrationPath = path.join(
      __dirname,
      '../mysql/migration_payment_methods.sql'
    );
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    const statements = migrationSQL
      .split(';')
      .map((stmt) => stmt.trim())
      .filter(Boolean);

    for (const statement of statements) {
      try {
        await db.execute(statement);
        console.log('Executed:', statement);
      } catch (error) {
        if (
          error.code === 'ER_DUP_FIELDNAME' ||
          error.code === 'ER_CANNOT_ADD_FOREIGN' ||
          error.code === 'ER_BAD_FIELD_ERROR'
        ) {
          console.log('Skipped (already applied):', error.message);
        } else {
          throw error;
        }
      }
    }
    console.log('✅ Payment methods migration complete');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (db) {
      await db.end();
    }
  }
}

runMigration();

