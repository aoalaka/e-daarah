-- Explicit is_demo flag on madrasahs. Replaces the fragile slug-suffix detection
-- (slugs ending with '-demo'). Backfills existing demo accounts from the slug pattern.

ALTER TABLE madrasahs
  ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT FALSE
  AFTER verification_status;

UPDATE madrasahs SET is_demo = TRUE WHERE slug LIKE '%-demo';

CREATE INDEX idx_madrasahs_is_demo ON madrasahs (is_demo, deleted_at);
