-- Add password reset fields to users table
ALTER TABLE users
ADD COLUMN reset_token VARCHAR(255) DEFAULT NULL,
ADD COLUMN reset_token_expires DATETIME DEFAULT NULL;

-- Add index for performance
CREATE INDEX idx_users_reset_token ON users(reset_token);
