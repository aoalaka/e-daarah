-- Migration 018: Fix Quran progress type enum and position table columns
-- The teacher routes use 'hifz', 'revision', 'tilawah' but the original enum was different.
-- Also adds separate position tracking columns for tilawah and revision.

-- Update the type enum to match what the teacher routes actually send
ALTER TABLE quran_progress
  MODIFY COLUMN type ENUM('memorization_new', 'memorization_revision', 'tilawah', 'hifz', 'revision') NOT NULL;

-- Add a 'passed' column used by teacher routes
ALTER TABLE quran_progress
  ADD COLUMN IF NOT EXISTS passed BOOLEAN DEFAULT TRUE AFTER notes;

-- Add tilawah and revision position columns to quran_student_position
ALTER TABLE quran_student_position
  ADD COLUMN IF NOT EXISTS tilawah_surah_number INT DEFAULT NULL AFTER current_ayah,
  ADD COLUMN IF NOT EXISTS tilawah_surah_name VARCHAR(50) DEFAULT NULL AFTER tilawah_surah_number,
  ADD COLUMN IF NOT EXISTS tilawah_juz INT DEFAULT NULL AFTER tilawah_surah_name,
  ADD COLUMN IF NOT EXISTS tilawah_ayah INT DEFAULT NULL AFTER tilawah_juz,
  ADD COLUMN IF NOT EXISTS revision_surah_number INT DEFAULT NULL AFTER tilawah_ayah,
  ADD COLUMN IF NOT EXISTS revision_surah_name VARCHAR(50) DEFAULT NULL AFTER revision_surah_number,
  ADD COLUMN IF NOT EXISTS revision_juz INT DEFAULT NULL AFTER revision_surah_name,
  ADD COLUMN IF NOT EXISTS revision_ayah INT DEFAULT NULL AFTER revision_juz;
