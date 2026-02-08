import mysql from 'mysql2/promise';

const config = {
  host: process.env.DB_HOST || process.env.MYSQLHOST,
  port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT || '3306'),
  user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'madrasah_admin',
};

async function runMigration() {
  console.log('Connecting to database...');
  const connection = await mysql.createConnection(config);
  
  try {
    // Create announcements table
    console.log('Creating announcements table...');
    await connection.execute(`
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
      )
    `);
    console.log('✅ announcements table created');

    // Create announcement_dismissals table
    console.log('Creating announcement_dismissals table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS announcement_dismissals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        announcement_id INT NOT NULL,
        madrasah_id INT NOT NULL,
        dismissed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
        FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
        UNIQUE KEY unique_dismissal (announcement_id, madrasah_id)
      )
    `);
    console.log('✅ announcement_dismissals table created');

    // Create support_tickets table
    console.log('Creating support_tickets table...');
    await connection.execute(`
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
      )
    `);
    console.log('✅ support_tickets table created');

    // Create ticket_messages table
    console.log('Creating ticket_messages table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id INT NOT NULL,
        sender_type ENUM('user', 'super_admin') NOT NULL,
        sender_id INT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
        INDEX idx_ticket (ticket_id)
      )
    `);
    console.log('✅ ticket_messages table created');

    // Record migration
    await connection.execute(
      `INSERT IGNORE INTO migrations (name, applied_at) VALUES ('013_add_announcements_tickets', NOW())`
    );
    console.log('✅ Migration 013 recorded');

    console.log('\\n🎉 Migration 013 completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();
