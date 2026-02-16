import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

const router = express.Router();

// Middleware to verify super admin token
const authenticateSuperAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }

    req.superAdmin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Audit log helper
const logAudit = async (req, action, resource, resourceId, details = {}, madrasahId = null) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (request_id, user_type, user_id, madrasah_id, action, resource, resource_id, details, ip_address, user_agent)
       VALUES (?, 'super_admin', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.requestId,
        req.superAdmin?.id,
        madrasahId,
        action,
        resource,
        resourceId,
        JSON.stringify(details),
        req.ip,
        req.get('user-agent')?.substring(0, 255)
      ]
    );
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
};

// Super admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [admins] = await pool.query(
      'SELECT * FROM super_admins WHERE email = ? AND is_active = TRUE',
      [email]
    );

    if (admins.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = admins[0];
    const validPassword = await bcrypt.compare(password, admin.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: 'super_admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: admin.id,
        email: admin.email,
        firstName: admin.first_name,
        lastName: admin.last_name
      }
    });
  } catch (error) {
    console.error('Super admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get dashboard stats
router.get('/dashboard', authenticateSuperAdmin, async (req, res) => {
  try {
    // Total madrasahs
    const [[{ totalMadrasahs }]] = await pool.query(
      'SELECT COUNT(*) as totalMadrasahs FROM madrasahs WHERE deleted_at IS NULL'
    );

    // Active madrasahs
    const [[{ activeMadrasahs }]] = await pool.query(
      'SELECT COUNT(*) as activeMadrasahs FROM madrasahs WHERE is_active = TRUE AND deleted_at IS NULL'
    );

    // Total users
    const [[{ totalUsers }]] = await pool.query(
      'SELECT COUNT(*) as totalUsers FROM users WHERE deleted_at IS NULL'
    );

    // Total students
    const [[{ totalStudents }]] = await pool.query(
      'SELECT COUNT(*) as totalStudents FROM students WHERE deleted_at IS NULL'
    );

    // Recent registrations (last 7 days)
    const [[{ recentRegistrations }]] = await pool.query(
      'SELECT COUNT(*) as recentRegistrations FROM madrasahs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND deleted_at IS NULL'
    );

    // Madrasahs by plan
    const [planStats] = await pool.query(
      `SELECT pricing_plan, COUNT(*) as count
       FROM madrasahs
       WHERE deleted_at IS NULL
       GROUP BY pricing_plan`
    );

    // MRR quick calculation — exclude demo madrasahs
    const [[{ mrr }]] = await pool.query(`
      SELECT COALESCE(SUM(CASE
        WHEN pricing_plan = 'standard' AND subscription_status = 'active' THEN 12
        WHEN pricing_plan = 'plus' AND subscription_status = 'active' THEN 29
        ELSE 0
      END), 0) as mrr
      FROM madrasahs WHERE deleted_at IS NULL AND slug NOT LIKE '%-demo'
    `);

    // Active this week (at least one user logged in last 7 days)
    const [[{ activeThisWeek }]] = await pool.query(`
      SELECT COUNT(DISTINCT m.id) as activeThisWeek
      FROM madrasahs m
      JOIN users u ON u.madrasah_id = m.id
      WHERE u.last_login_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND m.deleted_at IS NULL
    `);

    await logAudit(req, 'VIEW', 'dashboard', null);

    res.json({
      totalMadrasahs,
      activeMadrasahs,
      totalUsers,
      totalStudents,
      recentRegistrations,
      planStats,
      mrr,
      activeThisWeek
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// List all madrasahs
router.get('/madrasahs', authenticateSuperAdmin, async (req, res) => {
  try {
    const { status, plan, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        m.*,
        (SELECT COUNT(*) FROM users WHERE madrasah_id = m.id) as user_count,
        (SELECT COUNT(*) FROM students WHERE madrasah_id = m.id) as student_count
      FROM madrasahs m
      WHERE 1=1
    `;
    const params = [];

    if (status === 'active') {
      query += ' AND m.is_active = TRUE';
    } else if (status === 'suspended') {
      query += ' AND m.is_active = FALSE';
    } else if (status === 'inactive') {
      query += ' AND m.is_active = FALSE';
    }

    if (plan) {
      query += ' AND m.pricing_plan = ?';
      params.push(plan);
    }

    if (search) {
      query += ' AND (m.name LIKE ? OR m.slug LIKE ? OR m.email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [madrasahs] = await pool.query(query, params);

    // Get total count
    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) as total FROM madrasahs'
    );

    res.json({
      madrasahs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List madrasahs error:', error);
    res.status(500).json({ error: 'Failed to fetch madrasahs' });
  }
});

// Get single madrasah details
router.get('/madrasahs/:id', authenticateSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [madrasahs] = await pool.query(
      'SELECT * FROM madrasahs WHERE id = ?',
      [id]
    );

    if (madrasahs.length === 0) {
      return res.status(404).json({ error: 'Madrasah not found' });
    }

    // Get users with last login info
    const [users] = await pool.query(
      'SELECT id, first_name, last_name, email, role, last_login_at, created_at FROM users WHERE madrasah_id = ? AND deleted_at IS NULL',
      [id]
    );

    // Get student count
    const [[{ studentCount }]] = await pool.query(
      'SELECT COUNT(*) as studentCount FROM students WHERE madrasah_id = ? AND deleted_at IS NULL',
      [id]
    );

    // Get recent activity
    const [recentActivity] = await pool.query(
      `SELECT * FROM audit_logs
       WHERE madrasah_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [id]
    );

    // Get usage stats
    const [[usageStats]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM attendance WHERE madrasah_id = ? AND deleted_at IS NULL) as totalAttendance,
        (SELECT COUNT(*) FROM exam_performance WHERE madrasah_id = ? AND deleted_at IS NULL) as totalExams,
        (SELECT COUNT(*) FROM classes WHERE madrasah_id = ? AND deleted_at IS NULL) as totalClasses,
        (SELECT COUNT(*) FROM sessions WHERE madrasah_id = ? AND deleted_at IS NULL) as totalSessions,
        (SELECT MAX(a.date) FROM attendance a WHERE a.madrasah_id = ? AND a.deleted_at IS NULL) as lastAttendanceDate,
        (SELECT MAX(u.last_login_at) FROM users u WHERE u.madrasah_id = ? AND u.deleted_at IS NULL) as lastActiveAt,
        (SELECT COUNT(*) FROM attendance WHERE madrasah_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND deleted_at IS NULL) as attendance30d,
        (SELECT COUNT(*) FROM exam_performance WHERE madrasah_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND deleted_at IS NULL) as exams30d,
        (SELECT COUNT(DISTINCT ct.user_id) FROM class_teachers ct JOIN classes c ON ct.class_id = c.id WHERE c.madrasah_id = ? AND c.deleted_at IS NULL) as assignedTeachers,
        (SELECT COUNT(*) FROM semesters sem JOIN sessions ses ON sem.session_id = ses.id WHERE ses.madrasah_id = ? AND sem.deleted_at IS NULL) as totalSemesters,
        (SELECT COUNT(DISTINCT date) FROM attendance WHERE madrasah_id = ? AND deleted_at IS NULL) as attendanceDays
    `, [id, id, id, id, id, id, id, id, id, id, id]);

    await logAudit(req, 'VIEW', 'madrasah', id, {}, parseInt(id));

    res.json({
      madrasah: madrasahs[0],
      users,
      studentCount,
      recentActivity,
      usageStats
    });
  } catch (error) {
    console.error('Get madrasah error:', error);
    res.status(500).json({ error: 'Failed to fetch madrasah' });
  }
});

// Suspend madrasah
router.post('/madrasahs/:id/suspend', authenticateSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await pool.query(
      'UPDATE madrasahs SET is_active = FALSE WHERE id = ?',
      [id]
    );

    await logAudit(req, 'SUSPEND', 'madrasah', id, { reason }, parseInt(id));

    res.json({ message: 'Madrasah suspended successfully' });
  } catch (error) {
    console.error('Suspend madrasah error:', error);
    res.status(500).json({ error: 'Failed to suspend madrasah' });
  }
});

// Reactivate madrasah
router.post('/madrasahs/:id/reactivate', authenticateSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      'UPDATE madrasahs SET is_active = TRUE WHERE id = ?',
      [id]
    );

    await logAudit(req, 'REACTIVATE', 'madrasah', id, {}, parseInt(id));

    res.json({ message: 'Madrasah reactivated successfully' });
  } catch (error) {
    console.error('Reactivate madrasah error:', error);
    res.status(500).json({ error: 'Failed to reactivate madrasah' });
  }
});

// Update madrasah plan
router.patch('/madrasahs/:id/plan', authenticateSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { plan, subscriptionStatus } = req.body;

    const validPlans = ['trial', 'standard', 'plus', 'enterprise'];

    if (!validPlans.includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be one of: trial, standard, plus, enterprise' });
    }

    // Update pricing_plan and optionally subscription_status
    // Enterprise plans are managed via SLA - auto-set to active, clear Stripe fields
    let query = 'UPDATE madrasahs SET pricing_plan = ?';
    const params = [plan];

    if (plan === 'enterprise') {
      query += ', subscription_status = ?, stripe_customer_id = NULL, stripe_subscription_id = NULL';
      params.push(subscriptionStatus || 'active');
    } else if (subscriptionStatus) {
      query += ', subscription_status = ?';
      params.push(subscriptionStatus);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await pool.query(query, params);

    await logAudit(req, 'UPDATE_PLAN', 'madrasah', id, { plan, subscriptionStatus }, parseInt(id));

    res.json({ message: 'Plan updated successfully' });
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// Get audit logs
router.get('/audit-logs', authenticateSuperAdmin, async (req, res) => {
  try {
    const { madrasahId, userType, action, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (madrasahId) {
      query += ' AND madrasah_id = ?';
      params.push(madrasahId);
    }

    if (userType) {
      query += ' AND user_type = ?';
      params.push(userType);
    }

    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [logs] = await pool.query(query, params);

    res.json({ logs });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get security events (login attempts, lockouts, etc.)
router.get('/security-events', authenticateSuperAdmin, async (req, res) => {
  try {
    const { madrasahId, eventType, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT se.*, u.email as user_email, u.first_name, u.last_name, m.name as madrasah_name
      FROM security_events se
      LEFT JOIN users u ON se.user_id = u.id
      LEFT JOIN madrasahs m ON se.madrasah_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (madrasahId) {
      query += ' AND se.madrasah_id = ?';
      params.push(madrasahId);
    }

    if (eventType) {
      query += ' AND se.event_type = ?';
      params.push(eventType);
    }

    query += ' ORDER BY se.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [events] = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM security_events WHERE 1=1';
    const countParams = [];
    if (madrasahId) {
      countQuery += ' AND madrasah_id = ?';
      countParams.push(madrasahId);
    }
    if (eventType) {
      countQuery += ' AND event_type = ?';
      countParams.push(eventType);
    }
    const [[{ total }]] = await pool.query(countQuery, countParams);

    res.json({
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    // If security_events table doesn't exist yet, return empty
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.json({ events: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 } });
    }
    console.error('Get security events error:', error);
    res.status(500).json({ error: 'Failed to fetch security events' });
  }
});

// Get recent registrations for review
router.get('/registrations/recent', authenticateSuperAdmin, async (req, res) => {
  try {
    const { days = 7, verified } = req.query;

    let query = `
      SELECT
        m.id,
        m.name,
        m.slug,
        m.institution_type,
        m.website,
        m.phone,
        m.city,
        m.region,
        m.country,
        m.verification_status,
        m.created_at,
        u.first_name as admin_first_name,
        u.last_name as admin_last_name,
        u.email as admin_email,
        u.email_verified as admin_email_verified
      FROM madrasahs m
      LEFT JOIN users u ON u.madrasah_id = m.id AND u.role = 'admin'
      WHERE m.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      AND m.deleted_at IS NULL
    `;
    const params = [parseInt(days)];

    if (verified === 'true') {
      query += ' AND m.verification_status = "verified"';
    } else if (verified === 'false') {
      query += ' AND (m.verification_status IS NULL OR m.verification_status != "verified")';
    }

    query += ' ORDER BY m.created_at DESC';

    const [registrations] = await pool.query(query, params);

    res.json({ registrations });
  } catch (error) {
    console.error('Get recent registrations error:', error);
    res.status(500).json({ error: 'Failed to fetch recent registrations' });
  }
});

// Update madrasah verification status
router.patch('/madrasahs/:id/verify', authenticateSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['unverified', 'pending', 'verified', 'flagged', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid verification status' });
    }

    // Try full update first, fallback to basic if columns don't exist
    try {
      await pool.query(
        'UPDATE madrasahs SET verification_status = ?, verification_notes = ?, verified_at = ?, verified_by = ? WHERE id = ?',
        [status, notes || null, status === 'verified' ? new Date() : null, req.superAdmin.id, id]
      );
    } catch (dbError) {
      if (dbError.code === 'ER_BAD_FIELD_ERROR') {
        // Columns don't exist yet, just update verification_status
        await pool.query(
          'UPDATE madrasahs SET verification_status = ? WHERE id = ?',
          [status, id]
        );
      } else {
        throw dbError;
      }
    }

    await logAudit(req, 'VERIFY', 'madrasah', id, { status, notes }, parseInt(id));

    res.json({ message: 'Verification status updated' });
  } catch (error) {
    console.error('Update verification error:', error.message, error.code);
    res.status(500).json({ error: 'Failed to update verification status', details: error.message });
  }
});

// Get platform settings
router.get('/settings', authenticateSuperAdmin, async (req, res) => {
  try {
    const [settings] = await pool.query('SELECT * FROM platform_settings');
    res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update platform setting
router.patch('/settings/:key', authenticateSuperAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    await pool.query(
      'UPDATE platform_settings SET setting_value = ?, updated_by = ? WHERE setting_key = ?',
      [value, req.superAdmin.id, key]
    );

    await logAudit(req, 'UPDATE_SETTING', 'platform_settings', null, { key, value });

    res.json({ message: 'Setting updated successfully' });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// =====================================================
// Engagement & Revenue Endpoints
// =====================================================

// Get engagement metrics — per-madrasah activity & usage stats
router.get('/engagement', authenticateSuperAdmin, async (req, res) => {
  try {
    // Per-madrasah engagement: last login, activity count (7d), attendance count (30d), exam count (30d)
    const [engagement] = await pool.query(`
      SELECT
        m.id,
        m.name,
        m.slug,
        m.pricing_plan,
        m.created_at,
        (SELECT MAX(u.last_login_at) FROM users u WHERE u.madrasah_id = m.id AND u.deleted_at IS NULL) as last_login,
        (SELECT COUNT(*) FROM audit_logs al WHERE al.madrasah_id = m.id AND al.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as activity_7d,
        (SELECT COUNT(*) FROM attendance a WHERE a.madrasah_id = m.id AND a.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND a.deleted_at IS NULL) as attendance_30d,
        (SELECT COUNT(*) FROM exam_performance ep WHERE ep.madrasah_id = m.id AND ep.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND ep.deleted_at IS NULL) as exams_30d,
        (SELECT COUNT(*) FROM students s WHERE s.madrasah_id = m.id AND s.deleted_at IS NULL) as student_count,
        (SELECT COUNT(*) FROM users u WHERE u.madrasah_id = m.id AND u.deleted_at IS NULL) as user_count
      FROM madrasahs m
      WHERE m.deleted_at IS NULL
      ORDER BY last_login DESC
    `);

    // Summary metrics
    const [[summary]] = await pool.query(`
      SELECT
        (SELECT COUNT(DISTINCT m.id) FROM madrasahs m
         JOIN users u ON u.madrasah_id = m.id
         WHERE u.last_login_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND m.deleted_at IS NULL) as activeThisWeek,
        (SELECT COUNT(DISTINCT m.id) FROM madrasahs m
         JOIN users u ON u.madrasah_id = m.id
         WHERE u.last_login_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND m.deleted_at IS NULL) as activeThisMonth,
        (SELECT COUNT(*) FROM (
           SELECT m.id
           FROM madrasahs m
           LEFT JOIN users u ON u.madrasah_id = m.id AND u.deleted_at IS NULL
           WHERE m.deleted_at IS NULL AND m.is_active = TRUE
           GROUP BY m.id
           HAVING MAX(u.last_login_at) IS NULL OR MAX(u.last_login_at) < DATE_SUB(NOW(), INTERVAL 30 DAY)
         ) dormant) as dormantCount,
        (SELECT COUNT(*) FROM attendance WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND deleted_at IS NULL) as attendanceThisWeek,
        (SELECT COUNT(*) FROM exam_performance WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND deleted_at IS NULL) as examsThisWeek
    `);

    res.json({ engagement, summary });
  } catch (error) {
    console.error('Engagement metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch engagement metrics' });
  }
});

// Get revenue overview — MRR, plan distribution, growth
router.get('/revenue', authenticateSuperAdmin, async (req, res) => {
  try {
    // Plan distribution with counts
    const [planDistribution] = await pool.query(`
      SELECT
        pricing_plan,
        COUNT(*) as count,
        subscription_status
      FROM madrasahs
      WHERE deleted_at IS NULL
      GROUP BY pricing_plan, subscription_status
      ORDER BY pricing_plan
    `);

    // Calculate MRR (Monthly Recurring Revenue) — exclude demo madrasahs
    const [[mrr]] = await pool.query(`
      SELECT
        COALESCE(SUM(CASE
          WHEN pricing_plan = 'standard' AND subscription_status = 'active' THEN 12
          WHEN pricing_plan = 'plus' AND subscription_status = 'active' THEN 29
          ELSE 0
        END), 0) as mrr,
        COUNT(CASE WHEN subscription_status = 'active' AND pricing_plan IN ('standard', 'plus') THEN 1 END) as payingCustomers,
        COUNT(CASE WHEN pricing_plan = 'trial' OR subscription_status = 'trialing' THEN 1 END) as trialCount,
        COUNT(CASE WHEN subscription_status = 'canceled' THEN 1 END) as canceledCount,
        COUNT(CASE WHEN subscription_status = 'past_due' THEN 1 END) as pastDueCount
      FROM madrasahs
      WHERE deleted_at IS NULL AND slug NOT LIKE '%-demo'
    `);

    // Growth trend — new signups per month (last 6 months)
    const [growthTrend] = await pool.query(`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as signups
      FROM madrasahs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        AND deleted_at IS NULL
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month
    `);

    // Trial conversion rate — exclude demo madrasahs
    const [[conversion]] = await pool.query(`
      SELECT
        COUNT(CASE WHEN pricing_plan != 'trial' AND subscription_status = 'active' THEN 1 END) as converted,
        COUNT(*) as total
      FROM madrasahs
      WHERE deleted_at IS NULL AND slug NOT LIKE '%-demo'
        AND created_at < DATE_SUB(NOW(), INTERVAL 14 DAY)
    `);

    res.json({
      mrr: mrr.mrr,
      payingCustomers: mrr.payingCustomers,
      trialCount: mrr.trialCount,
      canceledCount: mrr.canceledCount,
      pastDueCount: mrr.pastDueCount,
      planDistribution,
      growthTrend,
      conversionRate: conversion.total > 0
        ? Math.round((conversion.converted / conversion.total) * 100)
        : 0
    });
  } catch (error) {
    console.error('Revenue metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue metrics' });
  }
});

// Change super admin password
router.post('/change-password', authenticateSuperAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 12) {
      return res.status(400).json({ error: 'Password must be at least 12 characters' });
    }

    const [admins] = await pool.query(
      'SELECT password FROM super_admins WHERE id = ?',
      [req.superAdmin.id]
    );

    const validPassword = await bcrypt.compare(currentPassword, admins[0].password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE super_admins SET password = ? WHERE id = ?',
      [hashedPassword, req.superAdmin.id]
    );

    await logAudit(req, 'CHANGE_PASSWORD', 'super_admin', req.superAdmin.id);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// =====================================================
// Churn Risk Alerts
// =====================================================

// Get at-risk madrasahs (no attendance in 14d, or no login in 14d, on paid plans)
router.get('/churn-risks', authenticateSuperAdmin, async (req, res) => {
  try {
    const [risks] = await pool.query(`
      SELECT
        m.id,
        m.name,
        m.slug,
        m.pricing_plan,
        m.subscription_status,
        m.created_at,
        m.email,
        (SELECT MAX(u.last_login_at) FROM users u WHERE u.madrasah_id = m.id AND u.deleted_at IS NULL) as last_login,
        (SELECT MAX(a.date) FROM attendance a WHERE a.madrasah_id = m.id AND a.deleted_at IS NULL) as last_attendance,
        (SELECT COUNT(*) FROM students s WHERE s.madrasah_id = m.id AND s.deleted_at IS NULL) as student_count,
        (SELECT COUNT(*) FROM users u WHERE u.madrasah_id = m.id AND u.deleted_at IS NULL) as user_count,
        DATEDIFF(NOW(), (SELECT MAX(u.last_login_at) FROM users u WHERE u.madrasah_id = m.id AND u.deleted_at IS NULL)) as days_since_login,
        DATEDIFF(NOW(), (SELECT MAX(a.date) FROM attendance a WHERE a.madrasah_id = m.id AND a.deleted_at IS NULL)) as days_since_attendance
      FROM madrasahs m
      WHERE m.deleted_at IS NULL
        AND m.is_active = TRUE
        AND m.slug NOT LIKE '%-demo'
        AND m.pricing_plan != 'trial'
        AND (
          m.subscription_status IN ('canceled', 'past_due', 'cancelled')
          OR (m.subscription_status = 'active' AND (
            (SELECT MAX(u.last_login_at) FROM users u WHERE u.madrasah_id = m.id AND u.deleted_at IS NULL) < DATE_SUB(NOW(), INTERVAL 7 DAY)
            OR (SELECT MAX(u.last_login_at) FROM users u WHERE u.madrasah_id = m.id AND u.deleted_at IS NULL) IS NULL
          ))
        )
      ORDER BY 
        CASE WHEN m.subscription_status IN ('canceled', 'past_due', 'cancelled') THEN 0 ELSE 1 END,
        days_since_login DESC
    `);

    // Categorize risk level
    const categorized = risks.map(r => {
      let riskLevel = 'low';
      if (r.subscription_status === 'canceled' || r.subscription_status === 'cancelled' || r.subscription_status === 'past_due') {
        riskLevel = 'critical';
      } else if (r.days_since_login > 30 || r.days_since_login === null) {
        riskLevel = 'critical';
      } else if (r.days_since_login > 14) {
        riskLevel = 'high';
      } else if (r.days_since_login > 7) {
        riskLevel = 'medium';
      }
      return { ...r, risk_level: riskLevel };
    });

    res.json({ atRisk: categorized });
  } catch (error) {
    console.error('Churn risks error:', error);
    res.status(500).json({ error: 'Failed to fetch churn risks' });
  }
});

// =====================================================
// Announcements CRUD
// =====================================================

// List announcements
router.get('/announcements', authenticateSuperAdmin, async (req, res) => {
  try {
    const [announcements] = await pool.query(`
      SELECT a.*,
        (SELECT COUNT(*) FROM announcement_dismissals ad WHERE ad.announcement_id = a.id) as dismiss_count,
        (SELECT COUNT(*) FROM madrasahs m WHERE m.deleted_at IS NULL AND m.is_active = TRUE) as total_madrasahs
      FROM announcements a
      ORDER BY a.created_at DESC
      LIMIT 50
    `);
    res.json({ announcements });
  } catch (error) {
    console.error('List announcements error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Create announcement
router.post('/announcements', authenticateSuperAdmin, async (req, res) => {
  try {
    const { title, message, type, target_plans, expires_at } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO announcements (title, message, type, target_plans, expires_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, message, type || 'info', target_plans ? JSON.stringify(target_plans) : null,
       expires_at || null, req.superAdmin.id]
    );

    await logAudit(req, 'CREATE', 'announcement', result.insertId);
    res.status(201).json({ id: result.insertId, message: 'Announcement created' });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// Update announcement
router.put('/announcements/:id', authenticateSuperAdmin, async (req, res) => {
  try {
    const { title, message, type, target_plans, is_active, expires_at } = req.body;

    await pool.query(
      `UPDATE announcements SET title = ?, message = ?, type = ?, target_plans = ?,
       is_active = ?, expires_at = ? WHERE id = ?`,
      [title, message, type, target_plans ? JSON.stringify(target_plans) : null,
       is_active !== undefined ? is_active : true, expires_at || null, req.params.id]
    );

    await logAudit(req, 'UPDATE', 'announcement', parseInt(req.params.id));
    res.json({ message: 'Announcement updated' });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// Delete announcement
router.delete('/announcements/:id', authenticateSuperAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    await logAudit(req, 'DELETE', 'announcement', parseInt(req.params.id));
    res.json({ message: 'Announcement deleted' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

// =====================================================
// Support Tickets
// =====================================================

// List all tickets (superadmin view)
router.get('/tickets', authenticateSuperAdmin, async (req, res) => {
  try {
    const { status, page = 1 } = req.query;
    const limit = 20;
    const offset = (page - 1) * limit;

    let query = `
      SELECT t.*, m.name as madrasah_name, m.slug as madrasah_slug,
        u.first_name, u.last_name, u.email as user_email,
        (SELECT COUNT(*) FROM ticket_messages tm WHERE tm.ticket_id = t.id) as message_count,
        (SELECT tm.created_at FROM ticket_messages tm WHERE tm.ticket_id = t.id ORDER BY tm.created_at DESC LIMIT 1) as last_message_at,
        (SELECT tm.sender_type FROM ticket_messages tm WHERE tm.ticket_id = t.id ORDER BY tm.created_at DESC LIMIT 1) as last_sender
      FROM support_tickets t
      JOIN madrasahs m ON t.madrasah_id = m.id
      JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    query += ' ORDER BY FIELD(t.status, "open", "in_progress", "resolved", "closed"), t.updated_at DESC';
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [tickets] = await pool.query(query, params);

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) as total FROM support_tickets' + (status ? ' WHERE status = ?' : ''),
      status ? [status] : []
    );

    const [[{ openCount }]] = await pool.query(
      'SELECT COUNT(*) as openCount FROM support_tickets WHERE status IN ("open", "in_progress")'
    );

    res.json({
      tickets,
      openCount,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('List tickets error:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Get single ticket with messages
router.get('/tickets/:id', authenticateSuperAdmin, async (req, res) => {
  try {
    const [[ticket]] = await pool.query(`
      SELECT t.*, m.name as madrasah_name, m.slug as madrasah_slug,
        u.first_name, u.last_name, u.email as user_email
      FROM support_tickets t
      JOIN madrasahs m ON t.madrasah_id = m.id
      JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `, [req.params.id]);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const [messages] = await pool.query(
      'SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC',
      [req.params.id]
    );

    res.json({ ticket, messages });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// Reply to ticket (superadmin)
router.post('/tickets/:id/reply', authenticateSuperAdmin, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    await pool.query(
      'INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message) VALUES (?, "super_admin", ?, ?)',
      [req.params.id, req.superAdmin.id, message]
    );

    // Update ticket status to in_progress if it was open
    await pool.query(
      'UPDATE support_tickets SET status = "in_progress" WHERE id = ? AND status = "open"',
      [req.params.id]
    );

    await logAudit(req, 'REPLY', 'ticket', parseInt(req.params.id));
    res.json({ message: 'Reply sent' });
  } catch (error) {
    console.error('Reply to ticket error:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// Update ticket status
router.patch('/tickets/:id/status', authenticateSuperAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await pool.query('UPDATE support_tickets SET status = ? WHERE id = ?', [status, req.params.id]);
    await logAudit(req, 'UPDATE_STATUS', 'ticket', parseInt(req.params.id), { status });
    res.json({ message: 'Status updated' });
  } catch (error) {
    console.error('Update ticket status error:', error);
    res.status(500).json({ error: 'Failed to update ticket status' });
  }
});

// =============================================
// Email Broadcast (uses Resend Broadcasts API)
// =============================================

// Ensure broadcast tables exist
const ensureBroadcastTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_broadcasts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      subject VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      sent_count INT DEFAULT 0,
      failed_count INT DEFAULT 0,
      status VARCHAR(50) DEFAULT 'sent',
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Add status column if table was created before it existed
  try {
    await pool.query(`ALTER TABLE email_broadcasts ADD COLUMN status VARCHAR(50) DEFAULT 'sent'`);
  } catch { /* column already exists */ }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
};

// GET /superadmin/email-broadcasts - Broadcast history
router.get('/email-broadcasts', authenticateSuperAdmin, async (req, res) => {
  try {
    await ensureBroadcastTables();
    const [broadcasts] = await pool.query(
      'SELECT * FROM email_broadcasts ORDER BY created_at DESC LIMIT 50'
    );
    res.json(broadcasts);
  } catch (error) {
    console.error('Error fetching email broadcasts:', error);
    res.status(500).json({ error: 'Failed to fetch broadcasts' });
  }
});

// GET /superadmin/email-templates - Saved templates
router.get('/email-templates', authenticateSuperAdmin, async (req, res) => {
  try {
    await ensureBroadcastTables();
    const [templates] = await pool.query(
      'SELECT * FROM email_templates ORDER BY updated_at DESC'
    );
    res.json(templates);
  } catch (error) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// POST /superadmin/email-templates - Save template
router.post('/email-templates', authenticateSuperAdmin, async (req, res) => {
  try {
    await ensureBroadcastTables();
    const { name, subject, message } = req.body;
    if (!name || !subject || !message) {
      return res.status(400).json({ error: 'Name, subject, and message are required' });
    }
    const [result] = await pool.query(
      'INSERT INTO email_templates (name, subject, message, created_by) VALUES (?, ?, ?, ?)',
      [name, subject, message, req.adminId]
    );
    res.json({ id: result.insertId, name, subject, message });
  } catch (error) {
    console.error('Error saving template:', error);
    res.status(500).json({ error: 'Failed to save template' });
  }
});

// PUT /superadmin/email-templates/:id - Update template
router.put('/email-templates/:id', authenticateSuperAdmin, async (req, res) => {
  try {
    const { name, subject, message } = req.body;
    if (!name || !subject || !message) {
      return res.status(400).json({ error: 'Name, subject, and message are required' });
    }
    await pool.query(
      'UPDATE email_templates SET name = ?, subject = ?, message = ? WHERE id = ?',
      [name, subject, message, req.params.id]
    );
    res.json({ id: parseInt(req.params.id), name, subject, message });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// DELETE /superadmin/email-templates/:id - Delete template
router.delete('/email-templates/:id', authenticateSuperAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM email_templates WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// POST /superadmin/email-broadcast - Send broadcast emails individually with rate limiting
router.post('/email-broadcast', authenticateSuperAdmin, async (req, res) => {
  try {
    const { subject, message, emails, testEmail, fromEmail } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    // Validate and resolve from email
    const ALLOWED_FROM = {
      'founder@e-daarah.com': 'e-Daarah <founder@e-daarah.com>',
      'support@e-daarah.com': 'e-Daarah <support@e-daarah.com>',
      'noreply@e-daarah.com': 'e-Daarah <noreply@e-daarah.com>',
    };
    const resolvedFrom = ALLOWED_FROM[fromEmail] || ALLOWED_FROM['noreply@e-daarah.com'];

    const { sendBroadcastEmail } = await import('../services/email.service.js');

    // Test mode: send single email directly
    if (testEmail) {
      const result = await sendBroadcastEmail(testEmail, subject, message, resolvedFrom);
      return res.json({ sent: result.success ? 1 : 0, failed: result.success ? 0 : 1, total: 1, test: true, error: result.error || null });
    }

    // Broadcast mode: send individually with rate limiting
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'Email list is required for broadcast' });
    }

    // Enforce daily limit (Resend free tier: 100/day)
    if (emails.length > 100) {
      return res.status(400).json({ error: `Too many recipients (${emails.length}). Resend free tier limit is 100 emails/day.` });
    }

    let sent = 0;
    let failed = 0;
    const errors = [];

    for (const email of emails) {
      const result = await sendBroadcastEmail(email, subject, message, resolvedFrom);
      if (result.success) {
        sent++;
      } else {
        failed++;
        errors.push({ email, error: result.error });
      }
      // 150ms delay between sends = ~6.6 req/s (well under Resend's 10/s limit)
      await new Promise(r => setTimeout(r, 150));
    }

    // Log to database
    await ensureBroadcastTables();
    await pool.query(
      'INSERT INTO email_broadcasts (subject, message, sent_count, failed_count, status, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [subject, message, sent, failed, failed === emails.length ? 'failed' : 'sent', req.superAdmin?.id]
    );

    console.log(`[Broadcast] Completed: ${sent} sent, ${failed} failed out of ${emails.length}`);
    if (errors.length > 0) console.log('[Broadcast] Errors:', errors);

    res.json({ sent, failed, total: emails.length });
  } catch (error) {
    console.error('Error sending broadcast:', error);
    res.status(500).json({ error: error.message || 'Failed to send broadcast' });
  }
});

export default router;
