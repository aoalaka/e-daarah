-- Migration 019: Add dropped_out to promotion_type enum
ALTER TABLE student_promotions
MODIFY COLUMN promotion_type ENUM('promoted', 'graduated', 'transferred', 'repeated', 'dropped_out') NOT NULL DEFAULT 'promoted';
