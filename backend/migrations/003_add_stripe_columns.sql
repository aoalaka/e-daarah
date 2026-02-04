-- Migration: 003_add_stripe_columns
-- Created: 2026-02-04
-- Description: Add Stripe subscription columns for billing

-- Add Stripe and subscription columns to madrasahs
ALTER TABLE madrasahs ADD COLUMN stripe_customer_id VARCHAR(255) NULL;
ALTER TABLE madrasahs ADD COLUMN stripe_subscription_id VARCHAR(255) NULL;
ALTER TABLE madrasahs ADD COLUMN pricing_plan ENUM('trial', 'standard', 'plus') DEFAULT 'trial';
ALTER TABLE madrasahs ADD COLUMN subscription_status ENUM('trialing', 'active', 'past_due', 'canceled', 'expired') DEFAULT 'trialing';
ALTER TABLE madrasahs ADD COLUMN current_period_end TIMESTAMP NULL;
ALTER TABLE madrasahs ADD COLUMN billing_email VARCHAR(255) NULL;

-- Indexes for billing queries
CREATE INDEX idx_madrasahs_stripe_customer ON madrasahs(stripe_customer_id);
CREATE INDEX idx_madrasahs_subscription_status ON madrasahs(subscription_status);
CREATE INDEX idx_madrasahs_pricing_plan ON madrasahs(pricing_plan);

-- Record this migration
INSERT INTO migrations (name) VALUES ('003_add_stripe_columns');
