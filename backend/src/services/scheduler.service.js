import pool from '../config/database.js';
import { sendTrialExpiringEmail } from './email.service.js';

/**
 * Check for trials expiring soon and send reminder emails
 * Should be called daily (e.g., via cron job or setInterval)
 */
export const checkTrialExpirations = async () => {
  console.log('[Scheduler] Checking trial expirations...');

  try {
    // Find madrasahs with trials expiring in 1, 3, or 7 days
    // Only send to admins who haven't received a reminder for this day threshold
    const [expiringTrials] = await pool.query(`
      SELECT
        m.id as madrasah_id,
        m.name as madrasah_name,
        m.trial_ends_at,
        m.trial_reminder_sent,
        u.id as admin_id,
        u.email as admin_email,
        u.first_name as admin_first_name,
        DATEDIFF(m.trial_ends_at, NOW()) as days_left
      FROM madrasahs m
      JOIN users u ON u.madrasah_id = m.id AND u.role = 'admin'
      WHERE m.subscription_status = 'trialing'
        AND m.pricing_plan = 'trial'
        AND m.trial_ends_at IS NOT NULL
        AND m.deleted_at IS NULL
        AND u.deleted_at IS NULL
        AND u.email_verified = 1
        AND DATEDIFF(m.trial_ends_at, NOW()) IN (1, 3, 7)
    `);

    console.log(`[Scheduler] Found ${expiringTrials.length} trials to check`);

    for (const trial of expiringTrials) {
      const daysLeft = trial.days_left;
      const reminderKey = `day_${daysLeft}`;

      // Parse existing reminders sent
      let remindersSent = {};
      if (trial.trial_reminder_sent) {
        try {
          remindersSent = JSON.parse(trial.trial_reminder_sent);
        } catch (e) {
          remindersSent = {};
        }
      }

      // Check if we already sent this reminder
      if (remindersSent[reminderKey]) {
        console.log(`[Scheduler] Already sent ${reminderKey} reminder to ${trial.admin_email}`);
        continue;
      }

      // Send the email
      console.log(`[Scheduler] Sending trial expiring email to ${trial.admin_email} (${daysLeft} days left)`);

      try {
        await sendTrialExpiringEmail(
          trial.admin_email,
          trial.admin_first_name,
          trial.madrasah_name,
          daysLeft
        );

        // Update the reminder tracking
        remindersSent[reminderKey] = new Date().toISOString();
        await pool.query(
          'UPDATE madrasahs SET trial_reminder_sent = ? WHERE id = ?',
          [JSON.stringify(remindersSent), trial.madrasah_id]
        );

        console.log(`[Scheduler] Successfully sent ${reminderKey} reminder to ${trial.admin_email}`);
      } catch (emailError) {
        console.error(`[Scheduler] Failed to send email to ${trial.admin_email}:`, emailError);
      }
    }

    console.log('[Scheduler] Trial expiration check complete');
    return { checked: expiringTrials.length };
  } catch (error) {
    console.error('[Scheduler] Error checking trial expirations:', error);
    throw error;
  }
};

/**
 * Start the scheduler with interval-based execution
 * @param {number} intervalHours - How often to run (default: 24 hours)
 */
export const startScheduler = (intervalHours = 24) => {
  const intervalMs = intervalHours * 60 * 60 * 1000;

  console.log(`[Scheduler] Starting scheduler with ${intervalHours}h interval`);

  // Run immediately on startup
  checkTrialExpirations().catch(console.error);

  // Then run on interval
  setInterval(() => {
    checkTrialExpirations().catch(console.error);
  }, intervalMs);
};

export default { checkTrialExpirations, startScheduler };
