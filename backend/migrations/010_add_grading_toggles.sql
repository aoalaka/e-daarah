-- Migration: Add toggles for dressing and behavior grading
-- These allow school admins to enable/disable dressing and behavior grade tracking

ALTER TABLE madrasahs
ADD COLUMN enable_dressing_grade BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN enable_behavior_grade BOOLEAN NOT NULL DEFAULT TRUE;
