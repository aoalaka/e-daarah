import pool from '../config/database.js';

/**
 * Activity logging middleware for admin/teacher actions.
 * Intercepts successful write operations (POST/PUT/PATCH/DELETE) and logs them to audit_logs.
 * Applied to admin and teacher route groups to capture madrasah-level activity.
 */

// Map route patterns to human-readable action/resource names
const ROUTE_MAP = [
  // Admin actions
  { method: 'POST',   pattern: /\/sessions$/,                      action: 'CREATE', resource: 'session' },
  { method: 'PUT',    pattern: /\/sessions\/(\d+)$/,               action: 'UPDATE', resource: 'session' },
  { method: 'DELETE', pattern: /\/sessions\/(\d+)$/,               action: 'DELETE', resource: 'session' },
  { method: 'POST',   pattern: /\/semesters$/,                     action: 'CREATE', resource: 'semester' },
  { method: 'PUT',    pattern: /\/semesters\/(\d+)$/,              action: 'UPDATE', resource: 'semester' },
  { method: 'DELETE', pattern: /\/semesters\/(\d+)$/,              action: 'DELETE', resource: 'semester' },
  { method: 'POST',   pattern: /\/classes$/,                       action: 'CREATE', resource: 'class' },
  { method: 'PUT',    pattern: /\/classes\/(\d+)$/,                action: 'UPDATE', resource: 'class' },
  { method: 'DELETE', pattern: /\/classes\/(\d+)$/,                action: 'DELETE', resource: 'class' },
  { method: 'POST',   pattern: /\/classes\/(\d+)\/teachers$/,     action: 'ASSIGN_TEACHER', resource: 'class' },
  { method: 'DELETE', pattern: /\/classes\/(\d+)\/teachers\/\d+$/, action: 'REMOVE_TEACHER', resource: 'class' },
  { method: 'POST',   pattern: /\/teachers$/,                      action: 'CREATE', resource: 'teacher' },
  { method: 'PUT',    pattern: /\/teachers\/(\d+)$/,               action: 'UPDATE', resource: 'teacher' },
  { method: 'DELETE', pattern: /\/teachers\/(\d+)$/,               action: 'DELETE', resource: 'teacher' },
  { method: 'POST',   pattern: /\/students$/,                      action: 'CREATE', resource: 'student' },
  { method: 'PUT',    pattern: /\/students\/(\d+)$/,               action: 'UPDATE', resource: 'student' },
  { method: 'DELETE', pattern: /\/students\/(\d+)$/,               action: 'DELETE', resource: 'student' },
  { method: 'PUT',    pattern: /\/students\/(\d+)\/comment$/,      action: 'UPDATE_COMMENT', resource: 'student' },
  { method: 'POST',   pattern: /\/students\/(\d+)\/regenerate-access-code$/, action: 'REGENERATE_ACCESS_CODE', resource: 'student' },
  { method: 'PUT',    pattern: /\/settings$/,                      action: 'UPDATE', resource: 'settings' },

  // Teacher actions
  { method: 'POST',   pattern: /\/classes\/(\d+)\/attendance\/bulk$/, action: 'RECORD_ATTENDANCE', resource: 'attendance' },
  { method: 'POST',   pattern: /\/classes\/(\d+)\/attendance$/,      action: 'RECORD_ATTENDANCE', resource: 'attendance' },
  { method: 'POST',   pattern: /\/classes\/(\d+)\/exam-performance\/bulk$/, action: 'RECORD_EXAM', resource: 'exam_performance' },
  { method: 'PUT',    pattern: /\/exam-performance\/batch$/,         action: 'UPDATE_EXAM', resource: 'exam_performance' },
  { method: 'DELETE', pattern: /\/exam-performance\/batch$/,         action: 'DELETE_EXAM', resource: 'exam_performance' },
  { method: 'PUT',    pattern: /\/exam-performance\/(\d+)$/,         action: 'UPDATE_EXAM', resource: 'exam_performance' },
  { method: 'DELETE', pattern: /\/exam-performance\/(\d+)$/,         action: 'DELETE_EXAM', resource: 'exam_performance' },
  { method: 'POST',   pattern: /\/classes\/(\d+)\/students$/,       action: 'ADD_STUDENT', resource: 'class' },
];

/**
 * Match the request to a known route and extract action metadata.
 */
function matchRoute(method, path) {
  for (const route of ROUTE_MAP) {
    if (route.method !== method) continue;
    const match = path.match(route.pattern);
    if (match) {
      return {
        action: route.action,
        resource: route.resource,
        resourceId: match[1] ? parseInt(match[1]) : null
      };
    }
  }
  return null;
}

/**
 * Activity logging middleware.
 * Should be applied BEFORE route handlers (it hooks into res.json).
 */
export function activityLogger(req, res, next) {
  // Only log write operations
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  // Store the original res.json
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    // Only log on success (2xx status)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Extract the route-relative path (strip /api/admin or /api/teacher prefix)
      const basePath = req.baseUrl; // e.g., /api/admin or /api/teacher
      const routePath = req.originalUrl.replace(basePath, '').split('?')[0];

      const routeMatch = matchRoute(req.method, routePath);

      if (routeMatch) {
        const userType = req.user?.role || 'admin';
        const userId = req.user?.id;
        const madrasahId = req.madrasahId || req.user?.madrasahId;

        // Build details object with safe data (no passwords/tokens)
        const details = {};
        if (req.body) {
          const safeKeys = ['name', 'first_name', 'last_name', 'email', 'staff_id', 'student_id',
            'date', 'semester_id', 'class_id', 'subject', 'start_date', 'end_date', 'is_active',
            'score', 'max_score', 'present'];
          for (const key of safeKeys) {
            if (req.body[key] !== undefined) {
              details[key] = req.body[key];
            }
          }
        }

        // Extract resource ID from response body if not in URL
        let resourceId = routeMatch.resourceId;
        if (!resourceId && body?.id) {
          resourceId = body.id;
        } else if (!resourceId && body?.insertId) {
          resourceId = body.insertId;
        }

        // Fire and forget — don't block the response
        pool.query(
          `INSERT INTO audit_logs (request_id, user_type, user_id, madrasah_id, action, resource, resource_id, details, ip_address, user_agent)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.requestId,
            userType,
            userId,
            madrasahId,
            routeMatch.action,
            routeMatch.resource,
            resourceId,
            JSON.stringify(details),
            req.ip,
            req.get('user-agent')?.substring(0, 255)
          ]
        ).catch(err => {
          console.error('Activity log failed:', err.message);
        });
      }
    }

    return originalJson(body);
  };

  next();
}
