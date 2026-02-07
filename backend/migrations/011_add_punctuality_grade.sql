-- Migration 011: Add punctuality grade column to attendance and toggle to madrasahs
-- This adds punctuality as a third grading metric alongside dressing and behavior

ALTER TABLE attendance ADD COLUMN punctuality_grade ENUM('Excellent', 'Good', 'Fair', 'Poor') DEFAULT NULL;

ALTER TABLE madrasahs ADD COLUMN enable_punctuality_grade BOOLEAN NOT NULL DEFAULT TRUE;
