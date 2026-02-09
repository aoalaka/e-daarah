import fs from 'fs';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
  // Parse MYSQL_URL or MYSQL_PUBLIC_URL
  const dbUrl = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL;
  if (!dbUrl) {
    console.error('No MYSQL_URL or MYSQL_PUBLIC_URL set');
    process.exit(1);
  }

  const url = new URL(dbUrl);
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port),
    user: url.username,
    password: url.password,
    database: url.pathname.replace('/', ''),
    multipleStatements: true
  });

  console.log('Connected to database:', url.hostname);

  const sql = fs.readFileSync(join(__dirname, '014_add_quran_progress.sql'), 'utf8');
  console.log('Running migration 014_add_quran_progress...');
  
  await connection.query(sql);
  console.log('Migration 014 complete!');

  // Record in migrations table
  await connection.query(
    "INSERT IGNORE INTO migrations (name) VALUES ('014_add_quran_progress')"
  );

  await connection.end();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
