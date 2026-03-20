-- Allow class_id and semester_id to be NULL (free plan has no classes/semesters)
-- Drop foreign key on class_id first so we can modify the column
ALTER TABLE quran_progress DROP FOREIGN KEY quran_progress_ibfk_3;
ALTER TABLE quran_progress MODIFY COLUMN class_id int DEFAULT NULL;
ALTER TABLE quran_progress MODIFY COLUMN semester_id int DEFAULT NULL;
ALTER TABLE quran_progress ADD CONSTRAINT quran_progress_ibfk_3 FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;

-- Add passed column
ALTER TABLE quran_progress ADD COLUMN passed tinyint(1) NOT NULL DEFAULT 1 AFTER grade;

-- Update type ENUM to match frontend values (hifz, tilawah, revision)
ALTER TABLE quran_progress MODIFY COLUMN type enum('memorization_new','memorization_revision','tilawah','hifz','revision') NOT NULL;

-- Migrate existing data to new type values
UPDATE quran_progress SET type = 'hifz' WHERE type = 'memorization_new';
UPDATE quran_progress SET type = 'revision' WHERE type = 'memorization_revision';

-- Now remove old enum values by redefining with only new values
ALTER TABLE quran_progress MODIFY COLUMN type enum('hifz','tilawah','revision') NOT NULL;
