-- Migration: 011_add_enterprise_plan
-- Created: 2026-02-07
-- Description: Add 'enterprise' to pricing_plan enum so super admin can assign it

ALTER TABLE madrasahs MODIFY COLUMN pricing_plan ENUM('trial', 'standard', 'plus', 'enterprise') DEFAULT 'trial';

-- Record this migration
INSERT INTO migrations (name) VALUES ('011_add_enterprise_plan');
