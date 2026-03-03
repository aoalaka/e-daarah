-- Migration: Change grading toggles default to FALSE for all plans
-- Dressing, behavior, and punctuality grades are opt-in, not default

ALTER TABLE madrasahs ALTER COLUMN enable_dressing_grade SET DEFAULT FALSE;
ALTER TABLE madrasahs ALTER COLUMN enable_behavior_grade SET DEFAULT FALSE;
ALTER TABLE madrasahs ALTER COLUMN enable_punctuality_grade SET DEFAULT FALSE;

-- Update all existing madrasahs that still have the old default (TRUE) to FALSE
UPDATE madrasahs SET enable_dressing_grade = FALSE, enable_behavior_grade = FALSE, enable_punctuality_grade = FALSE;
