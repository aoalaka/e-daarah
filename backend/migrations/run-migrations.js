#!/usr/bin/env node

/**
 * Simple Migration Runner
 *
 * Usage:
 *   node run-migrations.js                    # Run all pending migrations
 *   node run-migrations.js --status           # Show migration status
 *   node run-migrations.js --dry-run          # Show what would be run without executing
 *
 * Environment:
 *   Requires DATABASE_URL or individual DB_* env vars
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection config
function getDbConfig() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'madrasah_admin',
    multipleStatements: true
  };
}

async function getConnection() {
  const config = getDbConfig();
  if (typeof config === 'string') {
    return mysql.createConnection(config + '?multipleStatements=true');
  }
  return mysql.createConnection(config);
}

async function ensureMigrationsTable(connection) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedMigrations(connection) {
  const [rows] = await connection.execute('SELECT name FROM migrations ORDER BY id');
  return rows.map(row => row.name);
}

function getMigrationFiles() {
  const files = fs.readdirSync(__dirname)
    .filter(f => f.endsWith('.sql') && /^\d{3}_/.test(f))
    .sort();
  return files;
}

async function runMigration(connection, filename) {
  const filepath = path.join(__dirname, filename);
  const sql = fs.readFileSync(filepath, 'utf8');

  console.log(`  Running: ${filename}`);

  try {
    await connection.query(sql);
    console.log(`  ✓ Success: ${filename}`);
    return true;
  } catch (error) {
    console.error(`  ✗ Failed: ${filename}`);
    console.error(`    Error: ${error.message}`);
    return false;
  }
}

async function showStatus(connection) {
  const applied = await getAppliedMigrations(connection);
  const files = getMigrationFiles();

  console.log('\nMigration Status:');
  console.log('─'.repeat(50));

  for (const file of files) {
    const name = file.replace('.sql', '');
    const isApplied = applied.includes(name);
    const status = isApplied ? '✓ Applied' : '○ Pending';
    console.log(`  ${status}  ${file}`);
  }

  console.log('─'.repeat(50));
  console.log(`Total: ${files.length} migrations, ${applied.length} applied, ${files.length - applied.length} pending\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const showStatusOnly = args.includes('--status');

  let connection;

  try {
    console.log('\n🗄️  Madrasah Admin - Migration Runner\n');

    connection = await getConnection();
    console.log('Connected to database');

    await ensureMigrationsTable(connection);

    if (showStatusOnly) {
      await showStatus(connection);
      return;
    }

    const applied = await getAppliedMigrations(connection);
    const files = getMigrationFiles();

    // Find pending migrations
    const pending = files.filter(f => {
      const name = f.replace('.sql', '');
      return !applied.includes(name);
    });

    if (pending.length === 0) {
      console.log('✓ All migrations are up to date\n');
      return;
    }

    console.log(`Found ${pending.length} pending migration(s):\n`);

    if (isDryRun) {
      console.log('DRY RUN - Would execute:');
      for (const file of pending) {
        console.log(`  - ${file}`);
      }
      console.log('\nRun without --dry-run to apply these migrations.\n');
      return;
    }

    // Run pending migrations
    for (const file of pending) {
      const success = await runMigration(connection, file);
      if (!success) {
        console.error('\n⚠️  Migration failed. Stopping.\n');
        process.exit(1);
      }
    }

    console.log(`\n✓ Successfully applied ${pending.length} migration(s)\n`);

  } catch (error) {
    console.error('Migration error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
