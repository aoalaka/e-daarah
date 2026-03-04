-- Migration: 025_rename_twilio_sid
-- Description: Rename twilio_sid to provider_message_id after switching from Twilio to AWS SNS

ALTER TABLE sms_messages CHANGE COLUMN twilio_sid provider_message_id VARCHAR(100) NULL;

INSERT INTO migrations (name) VALUES ('025_rename_twilio_sid.sql')
ON DUPLICATE KEY UPDATE name = name;
