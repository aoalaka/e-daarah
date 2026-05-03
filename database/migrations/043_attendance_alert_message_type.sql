-- Add 'attendance_alert' to the sms_messages message_type enum
ALTER TABLE sms_messages
  MODIFY COLUMN message_type ENUM('fee_reminder', 'attendance_alert', 'custom', 'announcement') DEFAULT 'custom';
