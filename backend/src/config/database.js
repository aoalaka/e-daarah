import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Slow query threshold in milliseconds
const SLOW_QUERY_THRESHOLD_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS) || 500;

// Support both DATABASE_URL (Railway) and individual env vars (Docker)
const getPoolConfig = () => {
  // Railway: prefer private URL (free), fallback to public URL
  // Private URLs use *.railway.internal (no egress fees)
  // Public URLs use external networking (incurs egress fees)
  const dbUrl = process.env.MYSQL_PRIVATE_URL || process.env.MYSQL_URL || process.env.DATABASE_URL || process.env.MYSQL_PUBLIC_URL;

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
      connectTimeout: 20000, // 20 seconds to establish connection
      acquireTimeout: 20000, // 20 seconds to acquire connection from pool
      timeout: 30000, // 30 seconds for query execution
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000, // 10 seconds
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
    queueLimit: 0,
    connectTimeout: 20000,
    acquireTimeout: 20000,
    timeout: 30000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
  };
};

const basePool = mysql.createPool(getPoolConfig());

// Wrapper to log slow queries
const createQueryLogger = (pool) => {
  const originalQuery = pool.query.bind(pool);

  pool.query = async (...args) => {
    const start = Date.now();
    try {
      const result = await originalQuery(...args);
      const duration = Date.now() - start;

      if (duration > SLOW_QUERY_THRESHOLD_MS) {
        const query = typeof args[0] === 'string' ? args[0] : args[0]?.sql || 'unknown';
        // Truncate long queries for logging
        const truncatedQuery = query.length > 200 ? query.substring(0, 200) + '...' : query;
        console.warn(`[SLOW QUERY] ${duration}ms: ${truncatedQuery}`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      const query = typeof args[0] === 'string' ? args[0] : args[0]?.sql || 'unknown';
      const truncatedQuery = query.length > 100 ? query.substring(0, 100) + '...' : query;
      console.error(`[QUERY ERROR] ${duration}ms: ${truncatedQuery}`, error.message);
      throw error;
    }
  };

  return pool;
};

const pool = createQueryLogger(basePool);

export const testConnection = async (retries = 3, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await pool.getConnection();
      console.log('Database connected successfully');
      connection.release();
      return true;
    } catch (error) {
      console.error(`Database connection attempt ${i + 1}/${retries} failed:`, error.message);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
};

export default pool;
