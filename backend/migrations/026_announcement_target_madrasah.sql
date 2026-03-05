-- Add target_madrasah_id to announcements for per-madrasah notifications
ALTER TABLE announcements ADD COLUMN target_madrasah_id INT NULL DEFAULT NULL AFTER target_plans;
ALTER TABLE announcements ADD INDEX idx_target_madrasah (target_madrasah_id);
