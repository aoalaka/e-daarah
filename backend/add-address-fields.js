#!/usr/bin/env node

/**
 * One-time migration to add address and phone country code fields
 * Run this on Railway: node add-address-fields.js
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function getConnection() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL not found');
  }
  return mysql.createConnection(dbUrl + '?multipleStatements=true');
}

async function runMigration() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await getConnection();
    console.log('Connected!');

    // Add columns to users table
    console.log('\nAdding columns to users table...');
    
    const usersMigrations = [
      { name: 'phone_country_code', sql: "ALTER TABLE users ADD COLUMN phone_country_code VARCHAR(5) DEFAULT '+64' AFTER phone" },
      { name: 'street', sql: "ALTER TABLE users ADD COLUMN street VARCHAR(255) DEFAULT '' AFTER phone_country_code" },
      { name: 'city', sql: "ALTER TABLE users ADD COLUMN city VARCHAR(100) DEFAULT '' AFTER street" },
      { name: 'state', sql: "ALTER TABLE users ADD COLUMN state VARCHAR(100) DEFAULT '' AFTER city" },
      { name: 'country', sql: "ALTER TABLE users ADD COLUMN country VARCHAR(100) DEFAULT '' AFTER state" }
    ];

    for (const migration of usersMigrations) {
      try {
        await connection.execute(migration.sql);
        console.log(`  ✓ Added ${migration.name} to users`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`  - ${migration.name} already exists in users`);
        } else {
          throw error;
        }
      }
    }

    // Add columns to students table
    console.log('\nAdding columns to students table...');
    
    const studentsMigrations = [
      { name: 'student_phone', sql: "ALTER TABLE students ADD COLUMN student_phone VARCHAR(20) DEFAULT '' AFTER gender" },
      { name: 'student_phone_country_code', sql: "ALTER TABLE students ADD COLUMN student_phone_country_code VARCHAR(5) DEFAULT '+64' AFTER student_phone" },
      { name: 'street', sql: "ALTER TABLE students ADD COLUMN street VARCHAR(255) DEFAULT '' AFTER student_phone_country_code" },
      { name: 'city', sql: "ALTER TABLE students ADD COLUMN city VARCHAR(100) DEFAULT '' AFTER street" },
      { name: 'state', sql: "ALTER TABLE students ADD COLUMN state VARCHAR(100) DEFAULT '' AFTER city" },
      { name: 'country', sql: "ALTER TABLE students ADD COLUMN country VARCHAR(100) DEFAULT '' AFTER state" },
      { name: 'next_of_kin_phone_country_code', sql: "ALTER TABLE students ADD COLUMN next_of_kin_phone_country_code VARCHAR(5) DEFAULT '+64' AFTER next_of_kin_phone" }
    ];

    for (const migration of studentsMigrations) {
      try {
        await connection.execute(migration.sql);
        console.log(`  ✓ Added ${migration.name} to students`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`  - ${migration.name} already exists in students`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
