// Script to create admin user
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const ADMIN_EMAIL = 'danny@enviomedia.com';
const ADMIN_PASSWORD = '1you2are';
const ADMIN_NAME = 'Danny';

async function createAdmin() {
  let connection;
  
  try {
    console.log('🔐 Creating admin account...');
    
    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'groomy_paws',
    });

    console.log('✅ Connected to database');

    // Check if user already exists
    const [existing] = await connection.execute(
      'SELECT id, email, role FROM users WHERE email = ?',
      [ADMIN_EMAIL]
    );

    if (existing.length > 0) {
      console.log(`⚠️  User ${ADMIN_EMAIL} already exists`);
      
      // Update to admin role and password
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await connection.execute(
        'UPDATE users SET password_hash = ?, role = ?, name = ? WHERE email = ?',
        [passwordHash, 'admin', ADMIN_NAME, ADMIN_EMAIL]
      );
      
      console.log(`✅ Updated ${ADMIN_EMAIL} to admin role with new password`);
      console.log(`   Email: ${ADMIN_EMAIL}`);
      console.log(`   Password: ${ADMIN_PASSWORD}`);
      console.log(`   Role: admin`);
    } else {
      // Create new admin user
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      
      // Generate UUID
      const [uuidResult] = await connection.execute('SELECT UUID() as id');
      const userId = uuidResult[0].id;

      await connection.execute(
        'INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)',
        [userId, ADMIN_EMAIL, passwordHash, ADMIN_NAME, 'admin']
      );

      console.log(`✅ Created admin account:`);
      console.log(`   Email: ${ADMIN_EMAIL}`);
      console.log(`   Password: ${ADMIN_PASSWORD}`);
      console.log(`   Role: admin`);
    }

    // Verify the user
    const [user] = await connection.execute(
      'SELECT id, email, name, role FROM users WHERE email = ?',
      [ADMIN_EMAIL]
    );

    console.log('\n📋 Account Details:');
    console.log(`   ID: ${user[0].id}`);
    console.log(`   Email: ${user[0].email}`);
    console.log(`   Name: ${user[0].name}`);
    console.log(`   Role: ${user[0].role}`);
    console.log('\n✅ Admin account ready!');
    console.log('   You can now login at http://localhost:5173/login');

  } catch (error) {
    console.error('❌ Error creating admin account:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createAdmin();

