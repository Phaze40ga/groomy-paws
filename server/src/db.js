import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export async function createConnection() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'groomy_paws',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  return connection;
}

export function query(connection, sql, params) {
  return connection.execute(sql, params);
}

