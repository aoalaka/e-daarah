-- Migration 021: Simplify Fee Tracking
-- Move from templates/assignments to simple expected_fee per student

-- Add expected fee directly to students table
ALTER TABLE students ADD COLUMN expected_fee DECIMAL(10,2) NULL DEFAULT NULL;
ALTER TABLE students ADD COLUMN fee_note VARCHAR(255) NULL DEFAULT NULL;

-- Add payment_label to fee_payments for descriptive labels
ALTER TABLE fee_payments ADD COLUMN payment_label VARCHAR(100) NULL DEFAULT NULL;

-- Make fee_template_id nullable (old payments keep reference, new ones don't need it)
ALTER TABLE fee_payments MODIFY COLUMN fee_template_id INT NULL DEFAULT NULL;

INSERT INTO migrations (name) VALUES ('021_simplify_fee_tracking.sql')
ON DUPLICATE KEY UPDATE name = name;
