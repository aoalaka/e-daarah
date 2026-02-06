-- Migration: Add parent access code column to students table
-- Replaces surname-based parent login with secure hashed PIN

-- Add parent_access_code column (stores bcrypt hash of 6-digit PIN)
ALTER TABLE students
ADD COLUMN parent_access_code VARCHAR(255) NULL AFTER notes;
