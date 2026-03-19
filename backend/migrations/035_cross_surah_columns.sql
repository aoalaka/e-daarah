-- Add cross-surah support: to_surah fields for sessions spanning multiple surahs
ALTER TABLE quran_progress
  ADD COLUMN to_surah_number INT DEFAULT NULL AFTER surah_name,
  ADD COLUMN to_surah_name VARCHAR(50) DEFAULT NULL AFTER to_surah_number;
