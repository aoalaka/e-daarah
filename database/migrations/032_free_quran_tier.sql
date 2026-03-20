-- Add 'free' pricing plan and 'quran_focused' institution type
ALTER TABLE madrasahs MODIFY COLUMN pricing_plan ENUM('trial', 'solo', 'standard', 'plus', 'enterprise', 'free') DEFAULT 'trial';
ALTER TABLE madrasahs MODIFY COLUMN institution_type ENUM('mosque_based', 'independent', 'school_affiliated', 'online', 'other', 'quran_focused');
