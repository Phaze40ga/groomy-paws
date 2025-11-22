// Quick database connection test
import { createConnection } from './src/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('Host:', process.env.DB_HOST || 'localhost');
    console.log('Database:', process.env.DB_NAME || 'groomy_paws');
    console.log('User:', process.env.DB_USER || 'root');
    
    const db = await createConnection();
    console.log('✅ Connected to database successfully!');
    
    // Test query
    const [tables] = await db.execute('SHOW TABLES');
    console.log('\n📊 Tables found:', tables.length);
    tables.forEach(table => {
      console.log(`  - ${Object.values(table)[0]}`);
    });
    
    await db.end();
    console.log('\n✅ Connection test passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure MySQL is running');
    console.error('2. Check your .env file has correct credentials');
    console.error('3. Verify the database exists');
    console.error('4. Run: mysql -u root -p groomy_paws < ../mysql/schema.sql');
    process.exit(1);
  }
}

testConnection();

