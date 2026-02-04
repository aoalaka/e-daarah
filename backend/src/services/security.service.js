import pool from '../config/database.js';
import crypto from 'crypto';

// Security configuration
const SECURITY_CONFIG = {
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 15,
  sessionTimeoutMinutes: 30,
  sessionMaxAgeHours: 24
};

// Track if security tables exist (checked once on first use)
let securityTablesChecked = false;
let securityTablesExist = false;

/**
 * Check if security tables/columns exist in database
 * Caches result to avoid repeated queries
 */
const checkSecurityTables = async () => {
  if (securityTablesChecked) {
    return securityTablesExist;
  }

  try {
    // Try to query the locked_until column - if it fails, migration not applied
    await pool.query('SELECT locked_until FROM users LIMIT 1');
    securityTablesExist = true;
  } catch (error) {
    console.log('[Security] Security columns not found - migration 005 not applied. Security features disabled.');
    securityTablesExist = false;
  }

  securityTablesChecked = true;
  return securityTablesExist;
};

/**
 * Log a security event for audit purposes
 */
export const logSecurityEvent = async (eventType, { userId, madrasahId, ipAddress, userAgent, details }) => {
  try {
    if (!await checkSecurityTables()) return;

    await pool.query(
      `INSERT INTO security_events (user_id, madrasah_id, event_type, ip_address, user_agent, details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId || null,
        madrasahId || null,
        eventType,
        ipAddress || null,
        userAgent ? userAgent.substring(0, 255) : null,
        details ? JSON.stringify(details) : null
      ]
    );
  } catch (error) {
    // Don't throw - logging should not break the main flow
    console.error('[Security] Failed to log security event:', error.message);
  }
};

/**
 * Check if a user account is currently locked
 */
export const isAccountLocked = async (userId) => {
  try {
    if (!await checkSecurityTables()) {
      return { locked: false };
    }

    const [[user]] = await pool.query(
      'SELECT locked_until FROM users WHERE id = ?',
      [userId]
    );

    if (!user || !user.locked_until) {
      return { locked: false };
    }

    const lockedUntil = new Date(user.locked_until);
    const now = new Date();

    if (lockedUntil > now) {
      const remainingMinutes = Math.ceil((lockedUntil - now) / (1000 * 60));
      return {
        locked: true,
        lockedUntil: lockedUntil,
        remainingMinutes
      };
    }

    // Lock has expired, clear it
    await pool.query(
      'UPDATE users SET locked_until = NULL, failed_login_attempts = 0 WHERE id = ?',
      [userId]
    );

    return { locked: false };
  } catch (error) {
    console.error('[Security] Error checking account lock:', error.message);
    return { locked: false };
  }
};

/**
 * Record a failed login attempt
 * Returns lockout status if threshold exceeded
 */
export const recordFailedLogin = async (userId, ipAddress, userAgent) => {
  try {
    if (!await checkSecurityTables()) {
      return { locked: false, attemptsRemaining: null };
    }

    // Increment failed attempts
    await pool.query(
      'UPDATE users SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1 WHERE id = ?',
      [userId]
    );

    // Get current attempt count
    const [[user]] = await pool.query(
      'SELECT failed_login_attempts, madrasah_id FROM users WHERE id = ?',
      [userId]
    );

    const attempts = user?.failed_login_attempts || 0;

    // Log the failed attempt
    await logSecurityEvent('login_failed', {
      userId,
      madrasahId: user?.madrasah_id,
      ipAddress,
      userAgent,
      details: { attemptNumber: attempts }
    });

    // Check if we need to lock the account
    if (attempts >= SECURITY_CONFIG.maxFailedAttempts) {
      const lockedUntil = new Date(Date.now() + SECURITY_CONFIG.lockoutDurationMinutes * 60 * 1000);

      await pool.query(
        'UPDATE users SET locked_until = ? WHERE id = ?',
        [lockedUntil, userId]
      );

      // Log the lockout
      await logSecurityEvent('account_locked', {
        userId,
        madrasahId: user?.madrasah_id,
        ipAddress,
        userAgent,
        details: {
          failedAttempts: attempts,
          lockedUntilMinutes: SECURITY_CONFIG.lockoutDurationMinutes
        }
      });

      return {
        locked: true,
        lockedUntil,
        remainingMinutes: SECURITY_CONFIG.lockoutDurationMinutes
      };
    }

    return {
      locked: false,
      attemptsRemaining: SECURITY_CONFIG.maxFailedAttempts - attempts
    };
  } catch (error) {
    console.error('[Security] Error recording failed login:', error.message);
    return { locked: false, attemptsRemaining: null };
  }
};

/**
 * Record a successful login and reset failed attempts
 */
export const recordSuccessfulLogin = async (userId, ipAddress, userAgent) => {
  try {
    if (!await checkSecurityTables()) return;

    // Get madrasah ID for logging
    const [[user]] = await pool.query(
      'SELECT madrasah_id FROM users WHERE id = ?',
      [userId]
    );

    // Reset failed attempts and update last login
    await pool.query(
      `UPDATE users SET
        failed_login_attempts = 0,
        locked_until = NULL,
        last_login_at = NOW(),
        last_login_ip = ?
       WHERE id = ?`,
      [ipAddress, userId]
    );

    // Log successful login
    await logSecurityEvent('login_success', {
      userId,
      madrasahId: user?.madrasah_id,
      ipAddress,
      userAgent
    });
  } catch (error) {
    console.error('[Security] Error recording successful login:', error.message);
  }
};

/**
 * Create a new session and return the session ID
 */
export const createSession = async (userId, token, ipAddress, userAgent) => {
  try {
    if (!await checkSecurityTables()) return null;

    // Hash the token for storage
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Calculate expiry
    const expiresAt = new Date(Date.now() + SECURITY_CONFIG.sessionMaxAgeHours * 60 * 60 * 1000);

    // Insert session
    const [result] = await pool.query(
      `INSERT INTO active_sessions (user_id, token_hash, ip_address, user_agent, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, tokenHash, ipAddress, userAgent?.substring(0, 255), expiresAt]
    );

    return result.insertId;
  } catch (error) {
    console.error('[Security] Error creating session:', error.message);
    return null;
  }
};

/**
 * Validate session and update last activity
 * Returns session if valid, null if invalid/expired
 */
export const validateSession = async (token) => {
  try {
    if (!await checkSecurityTables()) return null;

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const [[session]] = await pool.query(
      `SELECT id, user_id, last_activity, expires_at
       FROM active_sessions
       WHERE token_hash = ?`,
      [tokenHash]
    );

    if (!session) {
      return null;
    }

    const now = new Date();

    // Check if session expired
    if (new Date(session.expires_at) < now) {
      await pool.query('DELETE FROM active_sessions WHERE id = ?', [session.id]);
      return null;
    }

    // Check for inactivity timeout
    const lastActivity = new Date(session.last_activity);
    const inactivityMs = now - lastActivity;
    const timeoutMs = SECURITY_CONFIG.sessionTimeoutMinutes * 60 * 1000;

    if (inactivityMs > timeoutMs) {
      await pool.query('DELETE FROM active_sessions WHERE id = ?', [session.id]);
      return { expired: true, reason: 'inactivity' };
    }

    // Update last activity
    await pool.query(
      'UPDATE active_sessions SET last_activity = NOW() WHERE id = ?',
      [session.id]
    );

    return {
      valid: true,
      userId: session.user_id,
      lastActivity: now,
      expiresAt: session.expires_at
    };
  } catch (error) {
    console.error('[Security] Error validating session:', error.message);
    return null;
  }
};

/**
 * Invalidate a session (logout)
 */
export const invalidateSession = async (token) => {
  try {
    if (!await checkSecurityTables()) return true;

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await pool.query('DELETE FROM active_sessions WHERE token_hash = ?', [tokenHash]);
    return true;
  } catch (error) {
    console.error('[Security] Error invalidating session:', error.message);
    return false;
  }
};

/**
 * Invalidate all sessions for a user (password change, security concern)
 */
export const invalidateAllUserSessions = async (userId) => {
  try {
    if (!await checkSecurityTables()) return 0;

    const [result] = await pool.query(
      'DELETE FROM active_sessions WHERE user_id = ?',
      [userId]
    );
    return result.affectedRows;
  } catch (error) {
    console.error('[Security] Error invalidating user sessions:', error.message);
    return 0;
  }
};

/**
 * Clean up expired sessions (call periodically)
 */
export const cleanupExpiredSessions = async () => {
  try {
    if (!await checkSecurityTables()) return 0;

    const [result] = await pool.query(
      'DELETE FROM active_sessions WHERE expires_at < NOW()'
    );
    if (result.affectedRows > 0) {
      console.log(`[Security] Cleaned up ${result.affectedRows} expired sessions`);
    }
    return result.affectedRows;
  } catch (error) {
    console.error('[Security] Error cleaning up sessions:', error.message);
    return 0;
  }
};

/**
 * Get session info for activity tracking (frontend use)
 */
export const getSessionInfo = async (token) => {
  try {
    if (!await checkSecurityTables()) return null;

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const [[session]] = await pool.query(
      `SELECT last_activity, expires_at FROM active_sessions WHERE token_hash = ?`,
      [tokenHash]
    );

    if (!session) {
      return null;
    }

    const now = new Date();
    const lastActivity = new Date(session.last_activity);
    const expiresAt = new Date(session.expires_at);

    const inactivityMs = now - lastActivity;
    const timeoutMs = SECURITY_CONFIG.sessionTimeoutMinutes * 60 * 1000;
    const remainingInactivityMs = Math.max(0, timeoutMs - inactivityMs);

    return {
      lastActivity,
      expiresAt,
      sessionTimeoutMinutes: SECURITY_CONFIG.sessionTimeoutMinutes,
      remainingInactivitySeconds: Math.floor(remainingInactivityMs / 1000),
      willExpireFromInactivity: remainingInactivityMs < 5 * 60 * 1000 // Warning at 5 min
    };
  } catch (error) {
    console.error('[Security] Error getting session info:', error.message);
    return null;
  }
};

export { SECURITY_CONFIG };

export default {
  logSecurityEvent,
  isAccountLocked,
  recordFailedLogin,
  recordSuccessfulLogin,
  createSession,
  validateSession,
  invalidateSession,
  invalidateAllUserSessions,
  cleanupExpiredSessions,
  getSessionInfo,
  SECURITY_CONFIG
};
