-- Migration: Fix verification_status ENUM to include all needed values
-- The original ENUM only had 'unverified', need to add: pending, verified, flagged, rejected

ALTER TABLE madrasahs
MODIFY COLUMN verification_status ENUM('unverified', 'pending', 'verified', 'flagged', 'rejected')
DEFAULT 'unverified';
