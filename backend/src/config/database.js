import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Support both DATABASE_URL (Railway) and individual env vars (Docker)
const getPoolConfig = () => {
  // Railway: prefer MYSQL_PUBLIC_URL, fallback to DATABASE_URL
  const dbUrl = process.env.MYSQL_PUBLIC_URL || process.env.DATABASE_URL;

  if (dbUrl) {
    // Railway provides a MySQL URL like: mysql://user:pass@host:port/database
    const url = new URL(dbUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: decodeURIComponent(url.password), // Handle special chars in password
      database: url.pathname.slice(1), // Remove leading slash
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    };
  }

  // Fallback to individual environment variables (Docker Compose)
  return {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'madrasah_admin',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
};

const pool = mysql.createPool(getPoolConfig());

export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    throw error;
  }
};

export default pool;
