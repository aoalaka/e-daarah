import pool from '../config/database.js';
import { sendTrialExpiringEmail, sendSmsFailureAlert } from './email.service.js';
import { cleanupExpiredSessions } from './security.service.js';
import { sendSMS, formatPhoneNumber, calculateCredits, isSmsConfigured } from './sms.service.js';

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
          remindersSent = typeof trial.trial_reminder_sent === 'string'
            ? JSON.parse(trial.trial_reminder_sent)
            : trial.trial_reminder_sent;
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
 * Delete rejected student applications older than 30 days
 */
export const cleanupRejectedApplications = async () => {
  try {
    const [result] = await pool.query(
      'DELETE FROM student_applications WHERE status = ? AND rejected_at < DATE_SUB(NOW(), INTERVAL 30 DAY)',
      ['rejected']
    );
    if (result.affectedRows > 0) {
      console.log(`[Scheduler] Cleaned up ${result.affectedRows} rejected applications`);
    }
  } catch (error) {
    // Table may not exist yet
    if (error.code !== 'ER_NO_SUCH_TABLE') {
      console.error('[Scheduler] Rejected applications cleanup error:', error.message);
    }
  }
};

/**
 * Send automatic monthly fee reminders to all parents
 * Runs daily — only sends on the configured day of each month during active semesters
 */
export const processAutoFeeReminders = async () => {
  if (!isSmsConfigured()) return;

  const today = new Date();
  const todayDay = today.getDate();
  const todayDate = today.toISOString().split('T')[0];

  try {
    // Check if timing column exists
    let hasTimingCol = false;
    try {
      await pool.query('SELECT auto_fee_reminder_timing FROM madrasahs LIMIT 0');
      hasTimingCol = true;
    } catch {}

    // Find madrasahs with auto reminders enabled, not already sent this month
    // Supports two timing modes: day_of_month (specific day) and semester_start (first day of each semester)
    const timingSelect = hasTimingCol
      ? "COALESCE(m.auto_fee_reminder_timing, 'day_of_month') as auto_fee_reminder_timing"
      : "'day_of_month' as auto_fee_reminder_timing";
    const timingWhere = hasTimingCol
      ? `AND (
          (COALESCE(m.auto_fee_reminder_timing, 'day_of_month') = 'day_of_month' AND m.auto_fee_reminder_day = ?)
          OR (m.auto_fee_reminder_timing = 'semester_start' AND EXISTS (
            SELECT 1 FROM semesters sem
            JOIN sessions s ON s.id = sem.session_id
            WHERE s.madrasah_id = m.id AND s.is_active = 1 AND s.deleted_at IS NULL
              AND sem.deleted_at IS NULL AND sem.start_date = ?
          ))
        )`
      : 'AND m.auto_fee_reminder_day = ?';

    const queryParams = hasTimingCol ? [todayDay, todayDate] : [todayDay];

    const [madrasahs] = await pool.query(`
      SELECT m.id, m.name, m.auto_fee_reminder_message, m.auto_fee_reminder_day,
             ${timingSelect}
      FROM madrasahs m
      WHERE m.auto_fee_reminder_enabled = 1
        AND m.auto_fee_reminder_message IS NOT NULL
        AND m.deleted_at IS NULL
        AND m.subscription_status IN ('active', 'trialing')
        AND (m.auto_fee_reminder_last_sent IS NULL OR MONTH(m.auto_fee_reminder_last_sent) != MONTH(NOW()) OR YEAR(m.auto_fee_reminder_last_sent) != YEAR(NOW()))
        ${timingWhere}
    `, queryParams);

    if (madrasahs.length === 0) return;

    console.log(`[Scheduler] Processing auto fee reminders for ${madrasahs.length} madrasah(s)`);

    for (const madrasah of madrasahs) {
      try {
        // Check SMS credits
        const [credits] = await pool.query(
          'SELECT balance FROM sms_credits WHERE madrasah_id = ?', [madrasah.id]
        );
        const balance = credits[0]?.balance || 0;
        if (balance < 1) {
          console.log(`[Scheduler] Skipping ${madrasah.name} — no SMS credits`);
          continue;
        }

        // Check for active semester
        const [activeSemesters] = await pool.query(`
          SELECT sem.id FROM semesters sem
          JOIN sessions s ON s.id = sem.session_id
          WHERE s.madrasah_id = ? AND s.is_active = 1 AND s.deleted_at IS NULL
            AND sem.deleted_at IS NULL AND sem.start_date <= ? AND sem.end_date >= ?
        `, [madrasah.id, todayDate, todayDate]);

        if (activeSemesters.length === 0) {
          console.log(`[Scheduler] Skipping ${madrasah.name} — no active semester`);
          continue;
        }

        // Skip if today is a holiday for this madrasah
        const [holidays] = await pool.query(`
          SELECT id FROM academic_holidays
          WHERE madrasah_id = ? AND deleted_at IS NULL
            AND start_date <= ? AND end_date >= ?
          LIMIT 1
        `, [madrasah.id, todayDate, todayDate]);

        if (holidays.length > 0) {
          console.log(`[Scheduler] Skipping ${madrasah.name} — today is a holiday`);
          continue;
        }

        // Get all students with parent phone numbers in active classes
        const [students] = await pool.query(`
          SELECT s.id, s.first_name, s.last_name,
                 s.parent_guardian_phone, s.parent_guardian_phone_country_code
          FROM students s
          WHERE s.madrasah_id = ? AND s.deleted_at IS NULL
            AND s.class_id IS NOT NULL
            AND s.parent_guardian_phone IS NOT NULL AND s.parent_guardian_phone != ''
        `, [madrasah.id]);

        if (students.length === 0) {
          console.log(`[Scheduler] Skipping ${madrasah.name} — no students with parent phones`);
          continue;
        }

        // Group by phone number to avoid duplicate messages to same parent
        const phoneGroups = {};
        for (const student of students) {
          const phone = formatPhoneNumber(student.parent_guardian_phone, student.parent_guardian_phone_country_code || '');
          if (!phone) continue;
          if (!phoneGroups[phone]) phoneGroups[phone] = [];
          phoneGroups[phone].push(student);
        }

        const uniquePhones = Object.keys(phoneGroups);
        const msgTemplate = madrasah.auto_fee_reminder_message;
        const estimatedCredits = uniquePhones.length * calculateCredits(msgTemplate);

        if (balance < estimatedCredits) {
          console.log(`[Scheduler] Skipping ${madrasah.name} — insufficient credits (need ~${estimatedCredits}, have ${balance})`);
          continue;
        }

        // Get admin user id for sent_by
        const [admins] = await pool.query(
          'SELECT id FROM users WHERE madrasah_id = ? AND role = ? AND deleted_at IS NULL LIMIT 1',
          [madrasah.id, 'admin']
        );
        const adminId = admins[0]?.id || null;

        let sent = 0, failed = 0, totalCreditsUsed = 0;
        const errors = [];

        for (const [phone, groupStudents] of Object.entries(phoneGroups)) {
          const studentNames = groupStudents.map(s => `${s.first_name} ${s.last_name}`).join(', ');
          const firstNames = groupStudents.map(s => s.first_name).join(', ');

          const personalizedMsg = msgTemplate
            .replace(/\{student_name\}/gi, studentNames)
            .replace(/\{first_name\}/gi, firstNames)
            .replace(/\{madrasah_name\}/gi, madrasah.name);

          try {
            const smsResult = await sendSMS(phone, personalizedMsg);
            const msgCredits = calculateCredits(personalizedMsg);
            totalCreditsUsed += msgCredits;

            for (const student of groupStudents) {
              await pool.query(
                `INSERT INTO sms_messages (madrasah_id, student_id, to_phone, message_body, message_type, status, provider_message_id, credits_used, sent_by)
                 VALUES (?, ?, ?, ?, 'fee_reminder', ?, ?, ?, ?)`,
                [madrasah.id, student.id, phone, personalizedMsg, smsResult.status, smsResult.sid,
                 groupStudents.indexOf(student) === 0 ? msgCredits : 0, adminId]
              );
            }
            sent++;
          } catch (smsError) {
            for (const student of groupStudents) {
              await pool.query(
                `INSERT INTO sms_messages (madrasah_id, student_id, to_phone, message_body, message_type, status, error_message, credits_used, sent_by)
                 VALUES (?, ?, ?, ?, 'fee_reminder', 'failed', ?, 0, ?)`,
                [madrasah.id, student.id, phone, personalizedMsg, smsError.message, adminId]
              );
            }
            failed++;
            errors.push({ phone, error: smsError.message });
          }
        }

        // Deduct credits
        if (totalCreditsUsed > 0) {
          await pool.query(
            'UPDATE sms_credits SET balance = balance - ?, total_used = total_used + ? WHERE madrasah_id = ?',
            [totalCreditsUsed, totalCreditsUsed, madrasah.id]
          );
        }

        // Mark as sent this month
        await pool.query(
          'UPDATE madrasahs SET auto_fee_reminder_last_sent = ? WHERE id = ?',
          [todayDate, madrasah.id]
        );

        console.log(`[Scheduler] ${madrasah.name}: sent ${sent} reminders, ${failed} failed, ${totalCreditsUsed} credits used`);

        if (failed > 0) {
          sendSmsFailureAlert(madrasah.name, failed, uniquePhones.length, errors).catch(console.error);
        }
      } catch (err) {
        console.error(`[Scheduler] Auto fee reminder error for ${madrasah.name}:`, err.message);
      }
    }
  } catch (error) {
    if (error.code !== 'ER_BAD_FIELD_ERROR') {
      console.error('[Scheduler] Auto fee reminders error:', error.message);
    }
  }
};

/**
 * Send automatic attendance alerts to parents whose kids have N+ absences in the configured period.
 * Runs daily — fires at the natural boundary of each period (Mon for weekly, 1st for monthly,
 * day-after-end for semester/cohort_period). Multi-child families get one SMS naming all
 * qualifying children with their absence counts.
 */
export const processAutoAttendanceAlerts = async () => {
  if (!isSmsConfigured()) return;

  const today = new Date();
  const todayDate = today.toISOString().split('T')[0];

  try {
    const [madrasahs] = await pool.query(`
      SELECT id, name, auto_attendance_alert_period, auto_attendance_alert_threshold,
             auto_attendance_alert_message, auto_attendance_alert_last_sent
      FROM madrasahs
      WHERE auto_attendance_alert_enabled = 1
        AND auto_attendance_alert_message IS NOT NULL
        AND deleted_at IS NULL
        AND subscription_status IN ('active', 'trialing')
    `);

    if (madrasahs.length === 0) return;

    for (const madrasah of madrasahs) {
      try {
        // Decide whether today is the boundary for this madrasah's period
        const period = madrasah.auto_attendance_alert_period || 'monthly';
        const lastSent = madrasah.auto_attendance_alert_last_sent;
        const periodWindow = await resolveAttendancePeriodWindow(madrasah.id, period, today);
        if (!periodWindow) continue;

        const { startDate, endDate, label, sendOn } = periodWindow;
        if (todayDate !== sendOn) continue;
        if (lastSent && new Date(lastSent).toISOString().split('T')[0] === sendOn) continue;

        // Skip on holidays
        const [holidays] = await pool.query(
          `SELECT id FROM academic_holidays
           WHERE madrasah_id = ? AND deleted_at IS NULL AND start_date <= ? AND end_date >= ?
           LIMIT 1`,
          [madrasah.id, todayDate, todayDate]
        );
        if (holidays.length > 0) continue;

        // Pull absences in the window for every student with a parent phone
        const [absentees] = await pool.query(`
          SELECT s.id, s.first_name, s.last_name,
                 s.parent_guardian_phone, s.parent_guardian_phone_country_code,
                 COUNT(*) AS absent_count
          FROM students s
          JOIN attendance a ON a.student_id = s.id
          WHERE s.madrasah_id = ?
            AND s.deleted_at IS NULL
            AND s.class_id IS NOT NULL
            AND s.parent_guardian_phone IS NOT NULL AND s.parent_guardian_phone != ''
            AND a.present = 0
            AND a.date >= ? AND a.date <= ?
          GROUP BY s.id
          HAVING absent_count >= ?
        `, [madrasah.id, startDate, endDate, madrasah.auto_attendance_alert_threshold]);

        if (absentees.length === 0) {
          // Mark as processed so we don't keep re-checking the same period
          await pool.query(
            'UPDATE madrasahs SET auto_attendance_alert_last_sent = ? WHERE id = ?',
            [todayDate, madrasah.id]
          );
          console.log(`[Scheduler] ${madrasah.name}: no students hit attendance threshold for ${label}`);
          continue;
        }

        // Group by parent phone — one SMS per family covering all qualifying kids
        const phoneGroups = {};
        for (const s of absentees) {
          const phone = formatPhoneNumber(s.parent_guardian_phone, s.parent_guardian_phone_country_code || '');
          if (!phone) continue;
          if (!phoneGroups[phone]) phoneGroups[phone] = [];
          phoneGroups[phone].push(s);
        }

        const uniquePhones = Object.keys(phoneGroups);
        const msgTemplate = madrasah.auto_attendance_alert_message;

        // Credit check (rough estimate using template — actual cost depends on substitutions)
        const [credits] = await pool.query('SELECT balance FROM sms_credits WHERE madrasah_id = ?', [madrasah.id]);
        const balance = credits[0]?.balance || 0;
        const estimatedCredits = uniquePhones.length * calculateCredits(msgTemplate);
        if (balance < estimatedCredits) {
          console.log(`[Scheduler] ${madrasah.name}: insufficient credits for attendance alerts (need ~${estimatedCredits}, have ${balance})`);
          continue;
        }

        const [admins] = await pool.query(
          'SELECT id FROM users WHERE madrasah_id = ? AND role = ? AND deleted_at IS NULL LIMIT 1',
          [madrasah.id, 'admin']
        );
        const adminId = admins[0]?.id || null;

        let sent = 0, failed = 0, totalCreditsUsed = 0;
        const errors = [];

        for (const [phone, group] of Object.entries(phoneGroups)) {
          const studentNames = group.map(s => `${s.first_name} ${s.last_name}`).join(', ');
          const firstNames = group.map(s => s.first_name).join(', ');
          const perChild = group.map(s => `${s.first_name} (${s.absent_count})`).join(', ');
          const totalAbsences = group.reduce((sum, s) => sum + Number(s.absent_count), 0);

          const personalizedMsg = msgTemplate
            .replace(/\{student_name\}/gi, studentNames)
            .replace(/\{first_name\}/gi, firstNames)
            .replace(/\{absences_per_child\}/gi, perChild)
            .replace(/\{absent_count\}/gi, String(totalAbsences))
            .replace(/\{period_label\}/gi, label)
            .replace(/\{madrasah_name\}/gi, madrasah.name);

          try {
            const smsResult = await sendSMS(phone, personalizedMsg);
            const msgCredits = calculateCredits(personalizedMsg);
            totalCreditsUsed += msgCredits;

            for (const s of group) {
              await pool.query(
                `INSERT INTO sms_messages (madrasah_id, student_id, to_phone, message_body, message_type, status, provider_message_id, credits_used, sent_by)
                 VALUES (?, ?, ?, ?, 'attendance_alert', ?, ?, ?, ?)`,
                [madrasah.id, s.id, phone, personalizedMsg, smsResult.status, smsResult.sid,
                 group.indexOf(s) === 0 ? msgCredits : 0, adminId]
              );
            }
            sent++;
          } catch (smsError) {
            for (const s of group) {
              await pool.query(
                `INSERT INTO sms_messages (madrasah_id, student_id, to_phone, message_body, message_type, status, error_message, credits_used, sent_by)
                 VALUES (?, ?, ?, ?, 'attendance_alert', 'failed', ?, 0, ?)`,
                [madrasah.id, s.id, phone, personalizedMsg, smsError.message, adminId]
              );
            }
            failed++;
            errors.push({ phone, error: smsError.message });
          }
        }

        if (totalCreditsUsed > 0) {
          await pool.query(
            'UPDATE sms_credits SET balance = balance - ?, total_used = total_used + ? WHERE madrasah_id = ?',
            [totalCreditsUsed, totalCreditsUsed, madrasah.id]
          );
        }

        await pool.query(
          'UPDATE madrasahs SET auto_attendance_alert_last_sent = ? WHERE id = ?',
          [todayDate, madrasah.id]
        );

        console.log(`[Scheduler] ${madrasah.name}: ${sent} attendance alerts sent (${period}, threshold ${madrasah.auto_attendance_alert_threshold}), ${failed} failed, ${totalCreditsUsed} credits used`);

        if (failed > 0) {
          sendSmsFailureAlert(madrasah.name, failed, uniquePhones.length, errors).catch(console.error);
        }
      } catch (err) {
        console.error(`[Scheduler] Auto attendance alert error for ${madrasah.name}:`, err.message);
      }
    }
  } catch (error) {
    if (error.code !== 'ER_BAD_FIELD_ERROR') {
      console.error('[Scheduler] Auto attendance alerts error:', error.message);
    }
  }
};

/**
 * Resolve the (start, end, label, sendOn) for a given period mode.
 * sendOn = the date today must equal for the alert to fire (the boundary).
 */
async function resolveAttendancePeriodWindow(madrasahId, period, today) {
  const fmt = (d) => d.toISOString().split('T')[0];

  if (period === 'weekly') {
    // Send every Monday for the previous Mon–Sun week
    if (today.getDay() !== 1) return null;
    const end = new Date(today); end.setDate(end.getDate() - 1); // yesterday (Sunday)
    const start = new Date(end); start.setDate(start.getDate() - 6); // previous Monday
    return { startDate: fmt(start), endDate: fmt(end), label: 'last week', sendOn: fmt(today) };
  }

  if (period === 'monthly') {
    // Send on the 1st of each month for the previous full month
    if (today.getDate() !== 1) return null;
    const end = new Date(today); end.setDate(0); // last day of previous month
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    const monthLabel = end.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return { startDate: fmt(start), endDate: fmt(end), label: monthLabel, sendOn: fmt(today) };
  }

  if (period === 'semester') {
    // Send the day after the active semester ends
    const [rows] = await pool.query(`
      SELECT sem.id, sem.name, sem.start_date, sem.end_date
      FROM semesters sem
      JOIN sessions s ON s.id = sem.session_id
      WHERE s.madrasah_id = ? AND s.is_active = 1 AND s.deleted_at IS NULL AND sem.deleted_at IS NULL
      ORDER BY sem.end_date DESC LIMIT 1
    `, [madrasahId]);
    if (rows.length === 0) return null;
    const sem = rows[0];
    const dayAfter = new Date(sem.end_date); dayAfter.setDate(dayAfter.getDate() + 1);
    return { startDate: fmt(new Date(sem.start_date)), endDate: fmt(new Date(sem.end_date)), label: sem.name || 'this semester', sendOn: fmt(dayAfter) };
  }

  if (period === 'cohort_period') {
    const [rows] = await pool.query(`
      SELECT id, name, start_date, end_date
      FROM cohort_periods
      WHERE madrasah_id = ? AND deleted_at IS NULL
      ORDER BY end_date DESC LIMIT 1
    `, [madrasahId]);
    if (rows.length === 0) return null;
    const cp = rows[0];
    const dayAfter = new Date(cp.end_date); dayAfter.setDate(dayAfter.getDate() + 1);
    return { startDate: fmt(new Date(cp.start_date)), endDate: fmt(new Date(cp.end_date)), label: cp.name || 'this period', sendOn: fmt(dayAfter) };
  }

  return null;
}

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

  // Session cleanup runs every hour
  const sessionCleanupInterval = 60 * 60 * 1000; // 1 hour
  setInterval(() => {
    cleanupExpiredSessions().catch(err => {
      console.error('[Scheduler] Session cleanup error:', err.message);
    });
  }, sessionCleanupInterval);

  // Run session cleanup on startup too
  cleanupExpiredSessions().catch(err => {
    console.error('[Scheduler] Initial session cleanup error:', err.message);
  });

  // Rejected applications cleanup — runs daily alongside trial checks
  cleanupRejectedApplications().catch(console.error);
  setInterval(() => {
    cleanupRejectedApplications().catch(console.error);
  }, intervalMs);

  // Auto fee reminders — runs daily, sends only on configured day of month
  processAutoFeeReminders().catch(console.error);
  setInterval(() => {
    processAutoFeeReminders().catch(console.error);
  }, intervalMs);

  // Auto attendance alerts — runs daily, fires on each period's natural boundary
  processAutoAttendanceAlerts().catch(console.error);
  setInterval(() => {
    processAutoAttendanceAlerts().catch(console.error);
  }, intervalMs);
};

export default { checkTrialExpirations, startScheduler };
