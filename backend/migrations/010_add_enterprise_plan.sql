-- Migration: 010_add_enterprise_plan
-- Created: 2026-02-06
-- Description: Add 'enterprise' to pricing_plan ENUM for custom/large deployments

ALTER TABLE madrasahs MODIFY COLUMN pricing_plan ENUM('trial', 'standard', 'plus', 'enterprise') DEFAULT 'trial';

-- Record this migration
INSERT INTO migrations (name) VALUES ('010_add_enterprise_plan');
