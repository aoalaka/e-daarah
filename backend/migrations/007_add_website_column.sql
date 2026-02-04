-- Migration: Add website column to madrasahs
-- For verification and trust purposes

ALTER TABLE madrasahs ADD COLUMN website VARCHAR(255) NULL AFTER email;
