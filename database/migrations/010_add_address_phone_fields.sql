-- Migration: Add address and phone country code fields to users and students tables
-- This migration is safe - it only adds columns without deleting data

-- Add address fields to users table (teachers)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone_country_code VARCHAR(5) DEFAULT '+64' AFTER phone,
ADD COLUMN IF NOT EXISTS street VARCHAR(255) DEFAULT '' AFTER phone_country_code,
ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT '' AFTER street,
ADD COLUMN IF NOT EXISTS state VARCHAR(100) DEFAULT '' AFTER city,
ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT '' AFTER state;

-- Add address and phone fields to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS student_phone VARCHAR(20) DEFAULT '' AFTER gender,
ADD COLUMN IF NOT EXISTS student_phone_country_code VARCHAR(5) DEFAULT '+64' AFTER student_phone,
ADD COLUMN IF NOT EXISTS street VARCHAR(255) DEFAULT '' AFTER student_phone_country_code,
ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT '' AFTER street,
ADD COLUMN IF NOT EXISTS state VARCHAR(100) DEFAULT '' AFTER city,
ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT '' AFTER state,
ADD COLUMN IF NOT EXISTS next_of_kin_phone_country_code VARCHAR(5) DEFAULT '+64' AFTER next_of_kin_phone;
