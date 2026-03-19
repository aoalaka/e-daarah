-- Add tilawah and revision position columns to quran_student_position
ALTER TABLE quran_student_position
  ADD COLUMN tilawah_surah_number INT DEFAULT NULL AFTER total_juz_completed,
  ADD COLUMN tilawah_surah_name VARCHAR(50) DEFAULT NULL AFTER tilawah_surah_number,
  ADD COLUMN tilawah_juz INT DEFAULT NULL AFTER tilawah_surah_name,
  ADD COLUMN tilawah_ayah INT DEFAULT NULL AFTER tilawah_juz,
  ADD COLUMN revision_surah_number INT DEFAULT NULL AFTER tilawah_ayah,
  ADD COLUMN revision_surah_name VARCHAR(50) DEFAULT NULL AFTER revision_surah_number,
  ADD COLUMN revision_juz INT DEFAULT NULL AFTER revision_surah_name,
  ADD COLUMN revision_ayah INT DEFAULT NULL AFTER revision_juz;
