import jwt from 'jsonwebtoken';
import { validateSession } from '../services/security.service.js';

/**
 * Authenticate JWT token and optionally validate server-side session
 * Session validation is graceful - if tables don't exist yet, it continues with JWT only
 */
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Verify JWT first
  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Validate server-side session (updates last_activity)
    try {
      const sessionStatus = await validateSession(token);

      if (sessionStatus && sessionStatus.expired) {
        return res.status(401).json({
          error: 'Session expired due to inactivity',
          code: 'SESSION_TIMEOUT',
          reason: sessionStatus.reason
        });
      }
      // If session not found but JWT valid, allow (migration period)
      // Once all users have new sessions, we could enforce session existence
    } catch (sessionError) {
      // Session validation failed (table might not exist yet) - continue with JWT only
      console.log('[Auth] Session validation skipped:', sessionError.message);
    }

    req.user = user;
    req.madrasahId = user.madrasahId; // Convenient access to madrasah ID
    next();
  });
};

/**
 * Require specific role(s)
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

/**
 * Verify madrasah slug matches token (tenant isolation)
 */
export const verifyMadrasahAccess = (req, res, next) => {
  const { madrasahSlug } = req.params;

  if (madrasahSlug && req.user.madrasahSlug !== madrasahSlug) {
    return res.status(403).json({ error: 'Access denied to this madrasah' });
  }

  next();
};

/**
 * Helper to get madrasah ID from request
 */
export const getMadrasahId = (req) => {
  return req.user?.madrasahId || req.madrasahId;
};
