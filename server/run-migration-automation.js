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

    const migrationPath = path.join(
      __dirname,
      '../mysql/migration_automation_and_sla.sql'
    );
    console.log('Reading migration file:', migrationPath);

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    const cleanedSQL = migrationSQL
      .split('\n')
      .map((line) => line.replace(/--.*$/, '').trim())
      .filter((line) => line.length > 0)
      .join('\n');

    const statements = cleanedSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute...`);

    for (let i = 0; i < statements.length; i += 1) {
      const statement = statements[i];
      if (!statement) continue;
      try {
        console.log(`\nExecuting statement ${i + 1}/${statements.length}`);
        await db.execute(statement);
        console.log('✓ Success');
      } catch (error) {
        if (
          error.code === 'ER_TABLE_EXISTS_ERROR' ||
          error.code === 'ER_DUP_FIELDNAME' ||
          error.code === 'ER_DUP_ENTRY'
        ) {
          console.log(`⚠ Skipped (already applied): ${error.message}`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n✅ Automation migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (db) {
      await db.end();
      console.log('Database connection closed.');
    }
  }
}

runMigration();

