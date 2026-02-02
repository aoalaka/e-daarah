-- Migration: Add split address fields to madrasahs table
-- Date: 2026-02-02

USE madrasah_admin;

-- Add new address columns (will fail silently if columns already exist)
ALTER TABLE madrasahs 
ADD COLUMN street VARCHAR(255) AFTER logo_url;

ALTER TABLE madrasahs 
ADD COLUMN city VARCHAR(100) AFTER street;

ALTER TABLE madrasahs 
ADD COLUMN region VARCHAR(100) AFTER city;

ALTER TABLE madrasahs 
ADD COLUMN country VARCHAR(100) AFTER region;

-- Modify phone column to accommodate country code
ALTER TABLE madrasahs 
MODIFY COLUMN phone VARCHAR(30);
