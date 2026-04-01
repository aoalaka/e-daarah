-- Add setup_complete flag to madrasahs
-- FALSE = show onboarding wizard on next admin login
-- TRUE  = wizard has been completed or dismissed

ALTER TABLE madrasahs
  ADD COLUMN setup_complete BOOLEAN NOT NULL DEFAULT FALSE
  AFTER scheduling_mode;

-- Existing madrasahs that already have a class set up are considered done
-- (they've been using the product — no point showing the wizard)
UPDATE madrasahs m
  SET m.setup_complete = TRUE
  WHERE EXISTS (
    SELECT 1 FROM classes c
    WHERE c.madrasah_id = m.id AND c.deleted_at IS NULL
  );
