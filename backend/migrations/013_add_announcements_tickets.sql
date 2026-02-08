-- Add announcements and support tickets tables
-- Used by superadmin for platform announcements and support management

-- Announcements (superadmin broadcasts to madrasah dashboards)
CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'warning', 'success', 'update') DEFAULT 'info',
    target_plans JSON DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    expires_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active (is_active, expires_at),
    INDEX idx_created (created_at)
);

-- Track which madrasahs dismissed which announcements
CREATE TABLE IF NOT EXISTS announcement_dismissals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    announcement_id INT NOT NULL,
    madrasah_id INT NOT NULL,
    dismissed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
    FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_dismissal (announcement_id, madrasah_id)
);

-- Support tickets (madrasah admins submit, superadmin responds)
CREATE TABLE IF NOT EXISTS support_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    madrasah_id INT NOT NULL,
    user_id INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_madrasah (madrasah_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_created (created_at)
);

-- Ticket messages (threaded conversation)
CREATE TABLE IF NOT EXISTS ticket_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    sender_type ENUM('user', 'super_admin') NOT NULL,
    sender_id INT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
    INDEX idx_ticket (ticket_id)
);

-- Record migration
INSERT INTO migrations (name) VALUES ('013_add_announcements_tickets.sql')
ON DUPLICATE KEY UPDATE name = name;
