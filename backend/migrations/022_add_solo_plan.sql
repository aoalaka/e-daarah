-- Migration: 022_add_solo_plan
-- Description: Add 'solo' to pricing_plan ENUM for single-teacher plan

ALTER TABLE madrasahs MODIFY COLUMN pricing_plan ENUM('trial', 'solo', 'standard', 'plus', 'enterprise') DEFAULT 'trial';
