-- Migration 017: Add currency setting per madrasah

ALTER TABLE madrasahs ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'USD';

INSERT INTO migrations (name) VALUES ('017_add_currency.sql')
ON DUPLICATE KEY UPDATE name = name;
