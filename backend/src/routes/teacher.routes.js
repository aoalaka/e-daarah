import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { requireActiveSubscription } from '../middleware/plan-limits.middleware.js';

const router = express.Router();

// All routes require authentication and teacher role
router.use(authenticateToken, requireRole('teacher'));

// Get active session and semester (scoped to madrasah)
router.get('/active-session-semester', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const [sessions] = await pool.query(
      'SELECT * FROM sessions WHERE madrasah_id = ? AND is_active = TRUE AND deleted_at IS NULL LIMIT 1',
      [madrasahId]
    );
    const [semesters] = await pool.query(
      `SELECT s.*, sess.name as session_name
       FROM semesters s
       LEFT JOIN sessions sess ON s.session_id = sess.id
       WHERE sess.madrasah_id = ? AND s.is_active = TRUE AND s.deleted_at IS NULL AND sess.deleted_at IS NULL LIMIT 1`,
      [madrasahId]
    );

    res.json({
      session: sessions[0] || null,
      semester: semesters[0] || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active session/semester' });
  }
});

// Helper: check if a date is a valid school day
async function isValidSchoolDay(madrasahId, dateStr) {
  const date = new Date(dateStr + 'T00:00:00Z');
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = dayNames[date.getUTCDay()];

  // 1. Find the active session that contains this date
  const [sessions] = await pool.query(
    `SELECT id, default_school_days FROM sessions 
     WHERE madrasah_id = ? AND deleted_at IS NULL 
     AND start_date <= ? AND end_date >= ?`,
    [madrasahId, dateStr, dateStr]
  );
  if (sessions.length === 0) {
    return { valid: false, reason: 'Date is not within any academic session' };
  }
  const session = sessions[0];

  // 2. Check if date falls within a semester
  const [semesters] = await pool.query(
    `SELECT id FROM semesters 
     WHERE session_id = ? AND deleted_at IS NULL 
     AND start_date <= ? AND end_date >= ?`,
    [session.id, dateStr, dateStr]
  );
  if (semesters.length === 0) {
    return { valid: false, reason: 'Date is not within any semester' };
  }

  // 3. Check if it's a holiday
  const [holidays] = await pool.query(
    `SELECT title FROM academic_holidays 
     WHERE madrasah_id = ? AND session_id = ? AND deleted_at IS NULL 
     AND start_date <= ? AND end_date >= ?`,
    [madrasahId, session.id, dateStr, dateStr]
  );
  if (holidays.length > 0) {
    return { valid: false, reason: `Holiday: ${holidays[0].title}` };
  }

  // 4. Check for schedule override covering this date
  const [overrides] = await pool.query(
    `SELECT school_days FROM schedule_overrides 
     WHERE madrasah_id = ? AND session_id = ? AND deleted_at IS NULL 
     AND start_date <= ? AND end_date >= ?`,
    [madrasahId, session.id, dateStr, dateStr]
  );

  let schoolDays;
  if (overrides.length > 0) {
    // Use override school days
    schoolDays = typeof overrides[0].school_days === 'string' ? JSON.parse(overrides[0].school_days) : overrides[0].school_days;
  } else {
    // Use session default school days
    schoolDays = session.default_school_days ? (typeof session.default_school_days === 'string' ? JSON.parse(session.default_school_days) : session.default_school_days) : null;
  }

  // 5. If no school days configured, allow any day (backward compat)
  if (!schoolDays || !Array.isArray(schoolDays) || schoolDays.length === 0) {
    return { valid: true };
  }

  // 6. Check if day of week is in the school days list
  if (!schoolDays.includes(dayOfWeek)) {
    return { valid: false, reason: `${dayOfWeek} is not a school day` };
  }

  return { valid: true };
}

// GET validate a date for attendance
router.get('/validate-attendance-date', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date parameter required' });

    const result = await isValidSchoolDay(madrasahId, date);
    res.json(result);
  } catch (error) {
    console.error('Validate attendance date error:', error);
    res.status(500).json({ error: 'Failed to validate date' });
  }
});

// GET school day info for the active session (for the teacher date picker)
router.get('/school-day-info', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;

    // Get active session
    const [sessions] = await pool.query(
      'SELECT id, default_school_days, start_date, end_date FROM sessions WHERE madrasah_id = ? AND is_active = TRUE AND deleted_at IS NULL LIMIT 1',
      [madrasahId]
    );
    if (sessions.length === 0) return res.json({ schoolDays: [], holidays: [], overrides: [] });

    const session = sessions[0];
    const schoolDays = session.default_school_days ? (typeof session.default_school_days === 'string' ? JSON.parse(session.default_school_days) : session.default_school_days) : [];

    // Get holidays for active session
    const [holidays] = await pool.query(
      'SELECT id, title, start_date, end_date FROM academic_holidays WHERE madrasah_id = ? AND session_id = ? AND deleted_at IS NULL ORDER BY start_date',
      [madrasahId, session.id]
    );

    // Get schedule overrides for active session
    const [overrides] = await pool.query(
      'SELECT id, title, start_date, end_date, school_days FROM schedule_overrides WHERE madrasah_id = ? AND session_id = ? AND deleted_at IS NULL ORDER BY start_date',
      [madrasahId, session.id]
    );

    res.json({ schoolDays, holidays, overrides });
  } catch (error) {
    console.error('Get school day info error:', error);
    res.status(500).json({ error: 'Failed to fetch school day info' });
  }
});

// Get all sessions (scoped to madrasah)
router.get('/sessions', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const [sessions] = await pool.query(
      `SELECT * FROM sessions 
       WHERE madrasah_id = ? AND deleted_at IS NULL
       ORDER BY start_date DESC`,
      [madrasahId]
    );
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Get all semesters (scoped to madrasah)
router.get('/semesters', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const [semesters] = await pool.query(
      `SELECT s.*, sess.name as session_name
       FROM semesters s
       LEFT JOIN sessions sess ON s.session_id = sess.id
       WHERE sess.madrasah_id = ? AND s.deleted_at IS NULL AND sess.deleted_at IS NULL
       ORDER BY s.start_date DESC`,
      [madrasahId]
    );
    res.json(semesters);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch semesters' });
  }
});

// Get teacher's classes (scoped to madrasah)
router.get('/my-classes', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const [classes] = await pool.query(
      `SELECT c.* FROM classes c
       INNER JOIN class_teachers ct ON c.id = ct.class_id
       WHERE ct.user_id = ? AND c.madrasah_id = ? AND c.deleted_at IS NULL`,
      [req.user.id, madrasahId]
    );
    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// Teacher overview — today's status, stats, alerts
router.get('/overview', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const userId = req.user.id;
    // Use client's local date if provided, otherwise fall back to server date
    const today = req.query.date || new Date().toISOString().split('T')[0];

    // Get active semester
    const [activeSemesters] = await pool.query(`
      SELECT sem.id FROM semesters sem
      JOIN sessions sess ON sem.session_id = sess.id
      WHERE sess.madrasah_id = ? AND sem.is_active = 1
        AND sem.deleted_at IS NULL AND sess.deleted_at IS NULL
      LIMIT 1
    `, [madrasahId]);
    const activeSemesterId = activeSemesters[0]?.id || null;

    // Per-class today's attendance status
    const [classes] = await pool.query(`
      SELECT c.id, c.name,
        (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.deleted_at IS NULL) as student_count,
        (SELECT COUNT(*) FROM attendance a WHERE a.class_id = c.id AND a.date = ? AND a.madrasah_id = ?) as attendance_count,
        (SELECT SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) FROM attendance a WHERE a.class_id = c.id AND a.date = ? AND a.madrasah_id = ?) as present_count
      FROM classes c
      INNER JOIN class_teachers ct ON c.id = ct.class_id
      WHERE ct.user_id = ? AND c.madrasah_id = ? AND c.deleted_at IS NULL
    `, [today, madrasahId, today, madrasahId, userId, madrasahId]);

    const classData = classes.map(c => ({
      id: c.id,
      name: c.name,
      student_count: c.student_count || 0,
      attendance_taken_today: c.attendance_count > 0,
      present_count: c.present_count || 0,
      absent_count: c.attendance_count > 0 ? c.attendance_count - (c.present_count || 0) : 0
    }));

    // Frequent absences this month across teacher's classes
    const [frequentAbsences] = await pool.query(`
      SELECT s.first_name, s.last_name, c.name as class_name, COUNT(*) as absence_count
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      JOIN class_teachers ct ON ct.class_id = c.id
      WHERE ct.user_id = ? AND a.present = 0
        AND a.date >= DATE_FORMAT(NOW(), '%Y-%m-01')
        AND a.madrasah_id = ?
        AND s.deleted_at IS NULL
      GROUP BY s.id
      HAVING absence_count >= 3
      ORDER BY absence_count DESC
      LIMIT 5
    `, [userId, madrasahId]);

    // Quick stats
    const totalStudents = classData.reduce((sum, c) => sum + c.student_count, 0);

    let attendanceRate = null;
    let examsRecorded = 0;

    if (activeSemesterId) {
      const [attRate] = await pool.query(`
        SELECT ROUND(AVG(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) * 100, 1) as rate
        FROM attendance a
        JOIN class_teachers ct ON ct.class_id = a.class_id
        WHERE ct.user_id = ? AND a.semester_id = ? AND a.madrasah_id = ?
      `, [userId, activeSemesterId, madrasahId]);
      attendanceRate = attRate[0]?.rate != null ? parseFloat(attRate[0].rate) : null;

      const [examCount] = await pool.query(`
        SELECT COUNT(*) as count
        FROM exam_performance ep
        JOIN students s ON ep.student_id = s.id
        JOIN class_teachers ct ON ct.class_id = s.class_id
        WHERE ct.user_id = ? AND ep.semester_id = ? AND ep.madrasah_id = ?
      `, [userId, activeSemesterId, madrasahId]);
      examsRecorded = examCount[0]?.count || 0;
    }

    // Weekly attendance rate + last week for comparison
    const [thisWeek] = await pool.query(`
      SELECT
        COUNT(*) as total_count,
        ROUND(AVG(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) * 100, 1) as rate
      FROM attendance a
      JOIN class_teachers ct ON ct.class_id = a.class_id
      WHERE ct.user_id = ? AND a.madrasah_id = ?
        AND YEARWEEK(a.date, 1) = YEARWEEK(NOW(), 1)
    `, [userId, madrasahId]);
    const [lastWeek] = await pool.query(`
      SELECT
        COUNT(*) as total_count,
        ROUND(AVG(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) * 100, 1) as rate
      FROM attendance a
      JOIN class_teachers ct ON ct.class_id = a.class_id
      WHERE ct.user_id = ? AND a.madrasah_id = ?
        AND YEARWEEK(a.date, 1) = YEARWEEK(NOW(), 1) - 1
    `, [userId, madrasahId]);

    const thisWeekRate = (thisWeek[0]?.total_count || 0) > 0 ? parseFloat(thisWeek[0].rate) || 0 : null;
    const lastWeekRate = (lastWeek[0]?.total_count || 0) > 0 ? parseFloat(lastWeek[0].rate) || 0 : null;

    res.json({
      classes: classData,
      frequentAbsences,
      stats: {
        total_students: totalStudents,
        attendance_rate: attendanceRate,
        exams_recorded: examsRecorded,
        this_week_rate: thisWeekRate,
        last_week_rate: lastWeekRate
      }
    });
  } catch (error) {
    console.error('Teacher overview error:', error);
    res.status(500).json({ error: 'Failed to fetch overview data' });
  }
});

// Get students in a class (scoped to madrasah)
router.get('/classes/:classId/students', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;

    // Verify teacher teaches this class in this madrasah
    const [access] = await pool.query(
      `SELECT ct.* FROM class_teachers ct
       INNER JOIN classes c ON ct.class_id = c.id
       WHERE ct.class_id = ? AND ct.user_id = ? AND c.madrasah_id = ?`,
      [classId, req.user.id, madrasahId]
    );

    if (access.length === 0) {
      return res.status(403).json({ error: 'Not authorized for this class' });
    }

    const [students] = await pool.query(
      `SELECT id, first_name, last_name, student_id
       FROM students
       WHERE class_id = ? AND madrasah_id = ? AND deleted_at IS NULL
       ORDER BY last_name, first_name`,
      [classId, madrasahId]
    );

    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Get attendance for a specific date and class (scoped to madrasah)
router.get('/classes/:classId/attendance/:date', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId, date } = req.params;
    const { semester_id } = req.query;

    // Verify access
    const [access] = await pool.query(
      `SELECT ct.* FROM class_teachers ct
       INNER JOIN classes c ON ct.class_id = c.id
       WHERE ct.class_id = ? AND ct.user_id = ? AND c.madrasah_id = ?`,
      [classId, req.user.id, madrasahId]
    );

    if (access.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const [attendance] = await pool.query(
      `SELECT a.*, s.first_name, s.last_name, s.student_id
       FROM attendance a
       INNER JOIN students s ON a.student_id = s.id
       WHERE a.class_id = ? AND a.date = ? AND a.semester_id = ? AND a.madrasah_id = ?`,
      [classId, date, semester_id, madrasahId]
    );

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// Record or update attendance (scoped to madrasah)
router.post('/classes/:classId/attendance', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;
    const { student_id, semester_id, date, present, dressing_grade, behavior_grade, punctuality_grade, notes, timezone } = req.body;

    // Validate date is not in the future using client's timezone
    const clientTimezone = timezone || 'UTC';
    const now = new Date();
    const todayInClientTz = new Date(now.toLocaleString('en-US', { timeZone: clientTimezone }));
    const todayStr = todayInClientTz.toISOString().split('T')[0]; // YYYY-MM-DD
    if (date > todayStr) {
      return res.status(400).json({ error: 'Cannot record attendance for future dates' });
    }

    // Validate the date is a valid school day
    const schoolDayCheck = await isValidSchoolDay(madrasahId, date);
    if (!schoolDayCheck.valid) {
      return res.status(400).json({ error: schoolDayCheck.reason });
    }

    // Fetch madrasah grading settings
    const [madrasahSettings] = await pool.query(
      'SELECT enable_dressing_grade, enable_behavior_grade, enable_punctuality_grade FROM madrasahs WHERE id = ?',
      [madrasahId]
    );
    const enableDressing = madrasahSettings[0]?.enable_dressing_grade !== 0;
    const enableBehavior = madrasahSettings[0]?.enable_behavior_grade !== 0;
    const enablePunctuality = madrasahSettings[0]?.enable_punctuality_grade !== 0;

    // Validate required fields for present students
    if (present === true || present === 1) {
      if (enableDressing && (!dressing_grade || dressing_grade === '')) {
        return res.status(400).json({ error: 'Dressing grade is required for present students' });
      }
      if (enableBehavior && (!behavior_grade || behavior_grade === '')) {
        return res.status(400).json({ error: 'Behavior grade is required for present students' });
      }
      if (enablePunctuality && (!punctuality_grade || punctuality_grade === '')) {
        return res.status(400).json({ error: 'Punctuality grade is required for present students' });
      }
    }

    // Verify access
    const [access] = await pool.query(
      `SELECT ct.* FROM class_teachers ct
       INNER JOIN classes c ON ct.class_id = c.id
       WHERE ct.class_id = ? AND ct.user_id = ? AND c.madrasah_id = ?`,
      [classId, req.user.id, madrasahId]
    );

    if (access.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Verify student belongs to this madrasah
    const [studentCheck] = await pool.query(
      'SELECT id FROM students WHERE id = ? AND madrasah_id = ?',
      [student_id, madrasahId]
    );
    if (studentCheck.length === 0) {
      return res.status(400).json({ error: 'Student not found' });
    }

    // Insert or update attendance
    await pool.query(
      `INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, user_id, date, present, dressing_grade, behavior_grade, punctuality_grade, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         present = VALUES(present),
         dressing_grade = VALUES(dressing_grade),
         behavior_grade = VALUES(behavior_grade),
         punctuality_grade = VALUES(punctuality_grade),
         notes = VALUES(notes),
         updated_at = CURRENT_TIMESTAMP`,
      [madrasahId, student_id, classId, semester_id, req.user.id, date, present, dressing_grade, behavior_grade, punctuality_grade, notes]
    );

    res.json({ message: 'Attendance recorded successfully' });
  } catch (error) {
    console.error('Attendance error:', error);
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

// Bulk record attendance (scoped to madrasah)
router.post('/classes/:classId/attendance/bulk', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;
    const { semester_id, date, records, timezone } = req.body;

    // Validate date is not in the future using client's timezone
    const clientTimezone = timezone || 'UTC';
    const now = new Date();
    const todayInClientTz = new Date(now.toLocaleString('en-US', { timeZone: clientTimezone }));
    const todayStr = todayInClientTz.toISOString().split('T')[0]; // YYYY-MM-DD
    if (date > todayStr) {
      return res.status(400).json({ error: 'Cannot record attendance for future dates' });
    }

    // Validate the date is a valid school day
    const bulkSchoolDayCheck = await isValidSchoolDay(madrasahId, date);
    if (!bulkSchoolDayCheck.valid) {
      return res.status(400).json({ error: bulkSchoolDayCheck.reason });
    }

    // Validate that records exist
    if (!records || records.length === 0) {
      return res.status(400).json({ error: 'No attendance records provided' });
    }

    // Get all students in the class to ensure attendance is marked for everyone
    const [classStudents] = await pool.query(
      'SELECT id FROM students WHERE class_id = ? AND madrasah_id = ?',
      [classId, madrasahId]
    );

    // Validate that ALL students have attendance marked
    if (records.length !== classStudents.length) {
      return res.status(400).json({ error: 'Attendance must be marked for all students in the class' });
    }

    // Validate each record has present/absent status
    const recordsWithoutStatus = records.filter(record => 
      record.present !== true && record.present !== false && record.present !== 0 && record.present !== 1
    );
    if (recordsWithoutStatus.length > 0) {
      return res.status(400).json({ error: 'All students must be marked as either present or absent' });
    }

    // Fetch madrasah grading settings
    const [madrasahSettings] = await pool.query(
      'SELECT enable_dressing_grade, enable_behavior_grade, enable_punctuality_grade FROM madrasahs WHERE id = ?',
      [madrasahId]
    );
    const enableDressing = madrasahSettings[0]?.enable_dressing_grade !== 0;
    const enableBehavior = madrasahSettings[0]?.enable_behavior_grade !== 0;
    const enablePunctuality = madrasahSettings[0]?.enable_punctuality_grade !== 0;

    // Validate required fields for present students
    for (const record of records) {
      if (record.present === true || record.present === 1) {
        if (enableDressing && (!record.dressing_grade || record.dressing_grade === '')) {
          return res.status(400).json({ error: 'Dressing grade is required for all present students' });
        }
        if (enableBehavior && (!record.behavior_grade || record.behavior_grade === '')) {
          return res.status(400).json({ error: 'Behavior grade is required for all present students' });
        }
        if (enablePunctuality && (!record.punctuality_grade || record.punctuality_grade === '')) {
          return res.status(400).json({ error: 'Punctuality grade is required for all present students' });
        }
      }
    }

    // Validate required fields for absent students
    const validAbsenceReasons = ['Sick', 'Parent Request', 'School Not Notified', 'Other'];
    for (const record of records) {
      if (record.present === false || record.present === 0) {
        if (!record.absence_reason || record.absence_reason === '') {
          return res.status(400).json({ error: 'Absence reason is required for all absent students' });
        }
        if (!validAbsenceReasons.includes(record.absence_reason)) {
          return res.status(400).json({ error: 'Invalid absence reason provided' });
        }
        // If absence reason is 'Other', notes must be provided
        if (record.absence_reason === 'Other' && (!record.notes || record.notes.trim() === '')) {
          return res.status(400).json({ error: 'Notes are required when absence reason is "Other"' });
        }
      }
    }

    // Verify access
    const [access] = await pool.query(
      `SELECT ct.* FROM class_teachers ct
       INNER JOIN classes c ON ct.class_id = c.id
       WHERE ct.class_id = ? AND ct.user_id = ? AND c.madrasah_id = ?`,
      [classId, req.user.id, madrasahId]
    );

    if (access.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Insert/update all records
    for (const record of records) {
      await pool.query(
        `INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, user_id, date, present, absence_reason, dressing_grade, behavior_grade, punctuality_grade, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           present = VALUES(present),
           absence_reason = VALUES(absence_reason),
           dressing_grade = VALUES(dressing_grade),
           behavior_grade = VALUES(behavior_grade),
           punctuality_grade = VALUES(punctuality_grade),
           notes = VALUES(notes),
           updated_at = CURRENT_TIMESTAMP`,
        [
          madrasahId,
          record.student_id,
          classId,
          semester_id,
          req.user.id,
          date,
          record.present,
          record.absence_reason || null,
          record.dressing_grade || null,
          record.behavior_grade || null,
          record.punctuality_grade || null,
          record.notes || ''
        ]
      );
    }

    res.json({ message: 'Attendance recorded for all students' });
  } catch (error) {
    console.error('Bulk attendance error:', error);
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

// Get attendance history for a class (scoped to madrasah)
router.get('/classes/:classId/attendance-history', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;
    const { semester_id } = req.query;

    // Verify access
    const [access] = await pool.query(
      `SELECT ct.* FROM class_teachers ct
       INNER JOIN classes c ON ct.class_id = c.id
       WHERE ct.class_id = ? AND ct.user_id = ? AND c.madrasah_id = ?`,
      [classId, req.user.id, madrasahId]
    );

    if (access.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    let query = `
      SELECT a.*, s.first_name, s.last_name, s.student_id,
             sem.name as semester_name, sess.name as session_name
      FROM attendance a
      INNER JOIN students s ON a.student_id = s.id
      LEFT JOIN semesters sem ON a.semester_id = sem.id
      LEFT JOIN sessions sess ON sem.session_id = sess.id
      WHERE a.class_id = ? AND a.madrasah_id = ?
    `;
    const params = [classId, madrasahId];

    if (semester_id) {
      query += ' AND a.semester_id = ?';
      params.push(semester_id);
    }

    query += ' ORDER BY a.date DESC, s.last_name, s.first_name';

    const [attendance] = await pool.query(query, params);
    res.json(attendance);
  } catch (error) {
    console.error('Attendance history error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance history' });
  }
});

// Add student to class (scoped to madrasah)
router.post('/classes/:classId/students', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;
    const { first_name, last_name, student_id, gender } = req.body;

    // Verify teacher teaches this class
    const [access] = await pool.query(
      `SELECT ct.* FROM class_teachers ct
       INNER JOIN classes c ON ct.class_id = c.id
       WHERE ct.class_id = ? AND ct.user_id = ? AND c.madrasah_id = ?`,
      [classId, req.user.id, madrasahId]
    );

    if (access.length === 0) {
      return res.status(403).json({ error: 'Not authorized for this class' });
    }

    const [result] = await pool.query(
      'INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id) VALUES (?, ?, ?, ?, ?, ?)',
      [madrasahId, first_name, last_name, student_id, gender, classId]
    );
    res.status(201).json({ id: result.insertId, first_name, last_name, student_id });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Student ID already exists in this madrasah' });
    }
    res.status(500).json({ error: 'Failed to add student' });
  }
});

// Get exam performance for a class (scoped to madrasah)
router.get('/classes/:classId/exam-performance', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;
    const { semesterId, subject } = req.query;

    // Verify access
    const [access] = await pool.query(
      `SELECT ct.* FROM class_teachers ct
       INNER JOIN classes c ON ct.class_id = c.id
       WHERE ct.class_id = ? AND ct.user_id = ? AND c.madrasah_id = ?`,
      [classId, req.user.id, madrasahId]
    );

    if (access.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    let query = `
      SELECT ep.*, s.first_name, s.last_name, s.student_id,
             sem.name as semester_name, sess.name as session_name
      FROM exam_performance ep
      INNER JOIN students s ON ep.student_id = s.id
      LEFT JOIN semesters sem ON ep.semester_id = sem.id
      LEFT JOIN sessions sess ON sem.session_id = sess.id
      WHERE s.class_id = ? AND s.madrasah_id = ?`;

    const params = [classId, madrasahId];

    if (semesterId) {
      query += ' AND ep.semester_id = ?';
      params.push(semesterId);
    }

    if (subject) {
      query += ' AND ep.subject = ?';
      params.push(subject);
    }

    query += ' ORDER BY ep.exam_date DESC, s.last_name';

    const [performance] = await pool.query(query, params);

    res.json(performance);
  } catch (error) {
    console.error('Fetch exam performance error:', error);
    res.status(500).json({ error: 'Failed to fetch exam performance' });
  }
});

// Record bulk exam performance (scoped to madrasah)
router.post('/classes/:classId/exam-performance/bulk', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;
    const { session_id, semester_id, subject, exam_date, max_score, students } = req.body;

    // Verify access
    const [access] = await pool.query(
      `SELECT ct.* FROM class_teachers ct
       INNER JOIN classes c ON ct.class_id = c.id
       WHERE ct.class_id = ? AND ct.user_id = ? AND c.madrasah_id = ?`,
      [classId, req.user.id, madrasahId]
    );

    if (access.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Validate required fields
    if (!session_id || !semester_id || !subject || !exam_date || !max_score || !students || !Array.isArray(students)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate max_score
    const maxScoreNum = parseFloat(max_score);
    if (isNaN(maxScoreNum) || maxScoreNum <= 0 || maxScoreNum > 1000) {
      return res.status(400).json({ error: 'Max score must be between 1 and 1000' });
    }

    // Validate exam_date (not in future)
    const examDate = new Date(exam_date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (examDate > today) {
      return res.status(400).json({ error: 'Exam date cannot be in the future' });
    }

    // Validate students array
    if (students.length === 0) {
      return res.status(400).json({ error: 'At least one student is required' });
    }

    // Validate each student's data
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const { student_id, score, is_absent, absence_reason } = student;

      if (!student_id) {
        return res.status(400).json({ error: `Student ID missing for student at index ${i}` });
      }

      if (!is_absent) {
        // Validate score if student is not absent
        if (score === null || score === undefined || score === '') {
          return res.status(400).json({ error: `Score required for ${student.student_name || 'student ' + (i + 1)}` });
        }
        const scoreNum = parseFloat(score);
        if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > maxScoreNum) {
          return res.status(400).json({ error: `Invalid score for ${student.student_name || 'student ' + (i + 1)}. Must be between 0 and ${maxScoreNum}` });
        }
      } else {
        // Validate absence_reason if student is absent
        if (!absence_reason) {
          return res.status(400).json({ error: `Absence reason required for ${student.student_name || 'student ' + (i + 1)}` });
        }
        const validReasons = ['Sick', 'Parent Request', 'School Not Notified', 'Other'];
        if (!validReasons.includes(absence_reason)) {
          return res.status(400).json({ error: `Invalid absence reason for ${student.student_name || 'student ' + (i + 1)}` });
        }
      }
    }

    // Insert exam records for all students
    for (const student of students) {
      const { student_id, score, is_absent, absence_reason, notes } = student;

      await pool.query(
        `INSERT INTO exam_performance
         (madrasah_id, student_id, semester_id, user_id, subject, exam_date, max_score, score, is_absent, absence_reason, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          madrasahId,
          student_id,
          semester_id,
          req.user.id,
          subject,
          exam_date,
          max_score,
          is_absent ? null : (score || 0),
          is_absent || false,
          is_absent ? absence_reason : null,
          notes || null
        ]
      );
    }

    res.json({ message: 'Exam performance recorded successfully for all students' });
  } catch (error) {
    console.error('Bulk exam performance error:', error);
    res.status(500).json({ error: 'Failed to record exam performance' });
  }
});

// Update exam batch (multiple records) - MUST come before /:id route
router.put('/exam-performance/batch', requireActiveSubscription, async (req, res) => {
  console.log('==================== BATCH UPDATE START ====================');
  console.error('==================== BATCH UPDATE START ====================');
  
  try {
    const madrasahId = req.madrasahId;
    const { record_ids, semester_id, subject, exam_date, max_score } = req.body;

    const debugData = { 
      record_ids, 
      record_ids_type: typeof record_ids,
      record_ids_isArray: Array.isArray(record_ids),
      record_ids_length: record_ids?.length,
      semester_id, 
      subject, 
      exam_date, 
      max_score, 
      madrasahId, 
      userId: req.user?.id 
    };
    
    console.log('[BATCH UPDATE] Request received:', JSON.stringify(debugData));
    console.error('[BATCH UPDATE] Request received:', JSON.stringify(debugData));

    if (!record_ids || !Array.isArray(record_ids) || record_ids.length === 0) {
      console.log('[BATCH UPDATE] Invalid record_ids - returning 400');
      console.error('[BATCH UPDATE] Invalid record_ids - returning 400');
      return res.status(400).json({ error: 'Record IDs are required' });
    }

    // Verify all records belong to this teacher and madrasah
    const placeholders = record_ids.map(() => '?').join(',');
    const query = `SELECT id FROM exam_performance WHERE id IN (${placeholders}) AND user_id = ? AND madrasah_id = ?`;
    const params = [...record_ids, req.user.id, madrasahId];
    
    console.log('[BATCH UPDATE] Verification query:', query);
    console.error('[BATCH UPDATE] Verification query:', query);
    console.log('[BATCH UPDATE] Query params:', JSON.stringify(params));
    console.error('[BATCH UPDATE] Query params:', JSON.stringify(params));
    
    const [records] = await pool.query(query, params);

    console.log('[BATCH UPDATE] Found records:', records.length, 'Expected:', record_ids.length);
    console.error('[BATCH UPDATE] Found records:', records.length, 'Expected:', record_ids.length);
    console.log('[BATCH UPDATE] Record IDs from query:', JSON.stringify(records.map(r => r.id)));
    console.error('[BATCH UPDATE] Record IDs from query:', JSON.stringify(records.map(r => r.id)));
    console.log('[BATCH UPDATE] Expected IDs:', JSON.stringify(record_ids));
    console.error('[BATCH UPDATE] Expected IDs:', JSON.stringify(record_ids));

    if (records.length !== record_ids.length) {
      console.log('[BATCH UPDATE] Authorization failed - record count mismatch - returning 403');
      console.error('[BATCH UPDATE] Authorization failed - record count mismatch - returning 403');
      return res.status(403).json({ error: `Not authorized to edit some records. Found ${records.length} of ${record_ids.length} records.` });
    }

    // Validate inputs
    if (semester_id) {
      const [semester] = await pool.query(
        'SELECT id FROM semesters WHERE id = ? AND deleted_at IS NULL',
        [semester_id]
      );
      if (semester.length === 0) {
        return res.status(400).json({ error: 'Invalid semester' });
      }
    }

    if (max_score) {
      const maxScoreNum = parseFloat(max_score);
      if (isNaN(maxScoreNum) || maxScoreNum <= 0 || maxScoreNum > 1000) {
        return res.status(400).json({ error: 'Max score must be between 1 and 1000' });
      }
    }

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];

    if (semester_id) {
      updates.push('semester_id = ?');
      values.push(semester_id);
    }
    if (subject) {
      updates.push('subject = ?');
      values.push(subject);
    }
    if (exam_date) {
      updates.push('exam_date = ?');
      values.push(exam_date);
    }
    if (max_score) {
      updates.push('max_score = ?');
      values.push(max_score);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');

    // Build the update query with proper IN clause
    const updatePlaceholders = record_ids.map(() => '?').join(',');
    await pool.query(
      `UPDATE exam_performance SET ${updates.join(', ')} WHERE id IN (${updatePlaceholders})`,
      [...values, ...record_ids]
    );

    res.json({ message: 'Exam batch updated successfully' });
  } catch (error) {
    console.error('Update exam batch error:', error);
    res.status(500).json({ error: 'Failed to update exam batch' });
  }
});

// Delete exam batch (multiple records) - MUST come before /:id route
router.delete('/exam-performance/batch', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { record_ids } = req.body;

    if (!record_ids || !Array.isArray(record_ids) || record_ids.length === 0) {
      return res.status(400).json({ error: 'Record IDs are required' });
    }

    // Verify all records belong to this teacher and madrasah
    const placeholders = record_ids.map(() => '?').join(',');
    const [records] = await pool.query(
      `SELECT id FROM exam_performance 
       WHERE id IN (${placeholders}) AND user_id = ? AND madrasah_id = ?`,
      [...record_ids, req.user.id, madrasahId]
    );

    if (records.length !== record_ids.length) {
      return res.status(403).json({ error: 'Not authorized to delete some records' });
    }

    // Delete all records
    const deletePlaceholders = record_ids.map(() => '?').join(',');
    await pool.query(`DELETE FROM exam_performance WHERE id IN (${deletePlaceholders})`, record_ids);

    res.json({ message: `${record_ids.length} exam records deleted successfully` });
  } catch (error) {
    console.error('Delete exam batch error:', error);
    res.status(500).json({ error: 'Failed to delete exam batch' });
  }
});

// Update individual exam performance record (scoped to madrasah)
router.put('/exam-performance/:id', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    const { score, is_absent, absence_reason, notes } = req.body;

    // Verify access - teacher can only edit their own records in their madrasah
    const [record] = await pool.query(
      `SELECT ep.*, ep.max_score 
       FROM exam_performance ep
       WHERE ep.id = ? AND ep.user_id = ? AND ep.madrasah_id = ?`,
      [id, req.user.id, madrasahId]
    );

    if (record.length === 0) {
      return res.status(403).json({ error: 'Not authorized to edit this record' });
    }

    const maxScore = record[0].max_score;

    // Validate data
    if (!is_absent) {
      if (score === null || score === undefined || score === '') {
        return res.status(400).json({ error: 'Score is required when student is not absent' });
      }
      const scoreNum = parseFloat(score);
      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > maxScore) {
        return res.status(400).json({ error: `Score must be between 0 and ${maxScore}` });
      }
    } else {
      if (!absence_reason) {
        return res.status(400).json({ error: 'Absence reason is required' });
      }
    }

    // Update record
    await pool.query(
      `UPDATE exam_performance 
       SET score = ?, is_absent = ?, absence_reason = ?, notes = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        is_absent ? null : (score || 0),
        is_absent || false,
        is_absent ? absence_reason : null,
        notes || null,
        id
      ]
    );

    res.json({ message: 'Exam performance updated successfully' });
  } catch (error) {
    console.error('Update exam performance error:', error);
    res.status(500).json({ error: 'Failed to update exam performance' });
  }
});

// Delete exam performance record (scoped to madrasah)
router.delete('/exam-performance/:id', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;

    // Verify access - teacher can only delete their own records in their madrasah
    const [record] = await pool.query(
      `SELECT ep.id 
       FROM exam_performance ep
       WHERE ep.id = ? AND ep.user_id = ? AND ep.madrasah_id = ?`,
      [id, req.user.id, madrasahId]
    );

    if (record.length === 0) {
      return res.status(403).json({ error: 'Not authorized to delete this record' });
    }

    // Delete record
    await pool.query('DELETE FROM exam_performance WHERE id = ?', [id]);

    res.json({ message: 'Exam performance deleted successfully' });
  } catch (error) {
    console.error('Delete exam performance error:', error);
    res.status(500).json({ error: 'Failed to delete exam performance' });
  }
});

// Get student reports/summary for a class (scoped to madrasah)
router.get('/classes/:classId/student-reports', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;
    const { sessionId, semesterId, subject } = req.query;

    // Verify access
    const [access] = await pool.query(
      `SELECT ct.* FROM class_teachers ct
       INNER JOIN classes c ON ct.class_id = c.id
       WHERE ct.class_id = ? AND ct.user_id = ? AND c.madrasah_id = ?`,
      [classId, req.user.id, madrasahId]
    );

    if (access.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Build query with filters
    let query = `
      SELECT 
        s.id,
        s.student_id,
        s.first_name,
        s.last_name,
        COUNT(DISTINCT ep.subject) as subject_count,
        COUNT(ep.id) as total_exams,
        SUM(CASE WHEN ep.is_absent = FALSE THEN 1 ELSE 0 END) as exams_taken,
        SUM(CASE WHEN ep.is_absent = TRUE THEN 1 ELSE 0 END) as exams_absent,
        SUM(CASE WHEN ep.is_absent = FALSE THEN ep.score ELSE 0 END) as total_score,
        SUM(ep.max_score) as total_max_score,
        GROUP_CONCAT(DISTINCT ep.subject ORDER BY ep.subject SEPARATOR ', ') as subjects,
        CASE 
          WHEN SUM(ep.max_score) > 0 THEN (SUM(CASE WHEN ep.is_absent = FALSE THEN ep.score ELSE 0 END) / SUM(ep.max_score)) * 100
          ELSE 0
        END as overall_percentage
      FROM students s
      LEFT JOIN exam_performance ep ON s.id = ep.student_id AND ep.madrasah_id = ?
      LEFT JOIN semesters sem ON ep.semester_id = sem.id
      WHERE s.class_id = ? AND s.deleted_at IS NULL
    `;
    
    const queryParams = [madrasahId, classId];

    if (sessionId) {
      query += ` AND sem.session_id = ?`;
      queryParams.push(sessionId);
    }

    if (semesterId) {
      query += ` AND ep.semester_id = ?`;
      queryParams.push(semesterId);
    }

    if (subject) {
      query += ` AND ep.subject = ?`;
      queryParams.push(subject);
    }

    query += ` GROUP BY s.id ORDER BY overall_percentage DESC`;

    const [reports] = await pool.query(query, queryParams);

    // Format the results and add rank (handle ties properly)
    let currentRank = 1;
    let previousPercentage = null;
    let studentsAtCurrentRank = 0;
    
    const formattedReports = reports.map((report, index) => {
      const percentage = report.overall_percentage ? parseFloat(report.overall_percentage).toFixed(2) : '0.00';
      
      // If this is a different percentage than the previous student, update rank
      if (previousPercentage !== null && percentage !== previousPercentage) {
        currentRank += studentsAtCurrentRank;
        studentsAtCurrentRank = 0;
      }
      
      studentsAtCurrentRank++;
      previousPercentage = percentage;
      
      return {
        ...report,
        rank: currentRank, // Same rank for students with same percentage
        overall_percentage: percentage,
        total_score: report.total_score ? parseFloat(report.total_score).toFixed(2) : '0.00',
        total_max_score: report.total_max_score ? parseFloat(report.total_max_score).toFixed(2) : '0.00',
        subject_count: parseInt(report.subject_count) || 0,
        total_exams: parseInt(report.total_exams) || 0,
        exams_taken: parseInt(report.exams_taken) || 0,
        exams_absent: parseInt(report.exams_absent) || 0
      };
    });

    res.json(formattedReports);
  } catch (error) {
    console.error('Get student reports error:', error);
    res.status(500).json({ error: 'Failed to fetch student reports' });
  }
});

// Get madrasah plan info for teacher dashboard (scoped to madrasah)
router.get('/madrasah-info', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const [madrasahs] = await pool.query(
      `SELECT pricing_plan, subscription_status, trial_ends_at,
       enable_dressing_grade, enable_behavior_grade, enable_punctuality_grade, enable_quran_tracking
       FROM madrasahs WHERE id = ?`,
      [madrasahId]
    );

    if (madrasahs.length === 0) {
      return res.status(404).json({ error: 'Madrasah not found' });
    }

    res.json(madrasahs[0]);
  } catch (error) {
    console.error('Failed to fetch madrasah info:', error);
    res.status(500).json({ error: 'Failed to fetch madrasah info' });
  }
});

// =====================================================
// Quran Progress Tracking
// =====================================================

// Surah reference data
const SURAHS = [
  {n:1,name:'Al-Fatiha',juz:1,ayahs:7},{n:2,name:'Al-Baqarah',juz:1,ayahs:286},{n:3,name:"Ali 'Imran",juz:3,ayahs:200},
  {n:4,name:'An-Nisa',juz:4,ayahs:176},{n:5,name:"Al-Ma'idah",juz:6,ayahs:120},{n:6,name:"Al-An'am",juz:7,ayahs:165},
  {n:7,name:"Al-A'raf",juz:8,ayahs:206},{n:8,name:'Al-Anfal',juz:9,ayahs:75},{n:9,name:'At-Tawbah',juz:10,ayahs:129},
  {n:10,name:'Yunus',juz:11,ayahs:109},{n:11,name:'Hud',juz:11,ayahs:123},{n:12,name:'Yusuf',juz:12,ayahs:111},
  {n:13,name:"Ar-Ra'd",juz:13,ayahs:43},{n:14,name:'Ibrahim',juz:13,ayahs:52},{n:15,name:'Al-Hijr',juz:14,ayahs:99},
  {n:16,name:'An-Nahl',juz:14,ayahs:128},{n:17,name:"Al-Isra'",juz:15,ayahs:111},{n:18,name:'Al-Kahf',juz:15,ayahs:110},
  {n:19,name:'Maryam',juz:16,ayahs:98},{n:20,name:'Ta-Ha',juz:16,ayahs:135},{n:21,name:"Al-Anbiya'",juz:17,ayahs:112},
  {n:22,name:'Al-Hajj',juz:17,ayahs:78},{n:23,name:"Al-Mu'minun",juz:18,ayahs:118},{n:24,name:'An-Nur',juz:18,ayahs:64},
  {n:25,name:'Al-Furqan',juz:18,ayahs:77},{n:26,name:"Ash-Shu'ara'",juz:19,ayahs:227},{n:27,name:'An-Naml',juz:19,ayahs:93},
  {n:28,name:'Al-Qasas',juz:20,ayahs:88},{n:29,name:"Al-'Ankabut",juz:20,ayahs:69},{n:30,name:'Ar-Rum',juz:21,ayahs:60},
  {n:31,name:'Luqman',juz:21,ayahs:34},{n:32,name:'As-Sajdah',juz:21,ayahs:30},{n:33,name:'Al-Ahzab',juz:21,ayahs:73},
  {n:34,name:"Saba'",juz:22,ayahs:54},{n:35,name:'Fatir',juz:22,ayahs:45},{n:36,name:'Ya-Sin',juz:22,ayahs:83},
  {n:37,name:'As-Saffat',juz:23,ayahs:182},{n:38,name:'Sad',juz:23,ayahs:88},{n:39,name:'Az-Zumar',juz:23,ayahs:75},
  {n:40,name:'Ghafir',juz:24,ayahs:85},{n:41,name:'Fussilat',juz:24,ayahs:54},{n:42,name:'Ash-Shura',juz:25,ayahs:53},
  {n:43,name:'Az-Zukhruf',juz:25,ayahs:89},{n:44,name:'Ad-Dukhan',juz:25,ayahs:59},{n:45,name:'Al-Jathiyah',juz:25,ayahs:37},
  {n:46,name:'Al-Ahqaf',juz:26,ayahs:35},{n:47,name:'Muhammad',juz:26,ayahs:38},{n:48,name:'Al-Fath',juz:26,ayahs:29},
  {n:49,name:'Al-Hujurat',juz:26,ayahs:18},{n:50,name:'Qaf',juz:26,ayahs:45},{n:51,name:'Adh-Dhariyat',juz:26,ayahs:60},
  {n:52,name:'At-Tur',juz:27,ayahs:49},{n:53,name:'An-Najm',juz:27,ayahs:62},{n:54,name:'Al-Qamar',juz:27,ayahs:55},
  {n:55,name:'Ar-Rahman',juz:27,ayahs:78},{n:56,name:"Al-Waqi'ah",juz:27,ayahs:96},{n:57,name:'Al-Hadid',juz:27,ayahs:29},
  {n:58,name:'Al-Mujadilah',juz:28,ayahs:22},{n:59,name:'Al-Hashr',juz:28,ayahs:24},{n:60,name:'Al-Mumtahanah',juz:28,ayahs:13},
  {n:61,name:'As-Saff',juz:28,ayahs:14},{n:62,name:"Al-Jumu'ah",juz:28,ayahs:11},{n:63,name:'Al-Munafiqun',juz:28,ayahs:11},
  {n:64,name:'At-Taghabun',juz:28,ayahs:18},{n:65,name:'At-Talaq',juz:28,ayahs:12},{n:66,name:'At-Tahrim',juz:28,ayahs:12},
  {n:67,name:'Al-Mulk',juz:29,ayahs:30},{n:68,name:'Al-Qalam',juz:29,ayahs:52},{n:69,name:'Al-Haqqah',juz:29,ayahs:52},
  {n:70,name:"Al-Ma'arij",juz:29,ayahs:44},{n:71,name:'Nuh',juz:29,ayahs:28},{n:72,name:'Al-Jinn',juz:29,ayahs:28},
  {n:73,name:'Al-Muzzammil',juz:29,ayahs:20},{n:74,name:'Al-Muddaththir',juz:29,ayahs:56},{n:75,name:'Al-Qiyamah',juz:29,ayahs:40},
  {n:76,name:'Al-Insan',juz:29,ayahs:31},{n:77,name:'Al-Mursalat',juz:29,ayahs:50},{n:78,name:"An-Naba'",juz:30,ayahs:40},
  {n:79,name:"An-Nazi'at",juz:30,ayahs:46},{n:80,name:'Abasa',juz:30,ayahs:42},{n:81,name:'At-Takwir',juz:30,ayahs:29},
  {n:82,name:'Al-Infitar',juz:30,ayahs:19},{n:83,name:'Al-Mutaffifin',juz:30,ayahs:36},{n:84,name:'Al-Inshiqaq',juz:30,ayahs:25},
  {n:85,name:'Al-Buruj',juz:30,ayahs:22},{n:86,name:'At-Tariq',juz:30,ayahs:17},{n:87,name:"Al-A'la",juz:30,ayahs:19},
  {n:88,name:'Al-Ghashiyah',juz:30,ayahs:26},{n:89,name:'Al-Fajr',juz:30,ayahs:30},{n:90,name:'Al-Balad',juz:30,ayahs:20},
  {n:91,name:'Ash-Shams',juz:30,ayahs:15},{n:92,name:'Al-Layl',juz:30,ayahs:21},{n:93,name:'Ad-Duha',juz:30,ayahs:11},
  {n:94,name:'Ash-Sharh',juz:30,ayahs:8},{n:95,name:'At-Tin',juz:30,ayahs:8},{n:96,name:"Al-'Alaq",juz:30,ayahs:19},
  {n:97,name:'Al-Qadr',juz:30,ayahs:5},{n:98,name:'Al-Bayyinah',juz:30,ayahs:8},{n:99,name:'Az-Zalzalah',juz:30,ayahs:8},
  {n:100,name:"Al-'Adiyat",juz:30,ayahs:11},{n:101,name:"Al-Qari'ah",juz:30,ayahs:11},{n:102,name:'At-Takathur',juz:30,ayahs:8},
  {n:103,name:"Al-'Asr",juz:30,ayahs:3},{n:104,name:'Al-Humazah',juz:30,ayahs:9},{n:105,name:'Al-Fil',juz:30,ayahs:5},
  {n:106,name:'Quraysh',juz:30,ayahs:4},{n:107,name:"Al-Ma'un",juz:30,ayahs:7},{n:108,name:'Al-Kawthar',juz:30,ayahs:3},
  {n:109,name:'Al-Kafirun',juz:30,ayahs:6},{n:110,name:'An-Nasr',juz:30,ayahs:3},{n:111,name:'Al-Masad',juz:30,ayahs:5},
  {n:112,name:'Al-Ikhlas',juz:30,ayahs:4},{n:113,name:'Al-Falaq',juz:30,ayahs:5},{n:114,name:'An-Nas',juz:30,ayahs:6}
];

// GET Surah reference data
router.get('/quran/surahs', (req, res) => {
  res.json(SURAHS);
});

// GET student position (hifz + tilawah) for a specific student
router.get('/quran/student/:studentId/position', async (req, res) => {
  try {
    const { studentId } = req.params;
    const madrasahId = req.madrasahId;

    const [rows] = await pool.query(
      `SELECT * FROM quran_student_position WHERE student_id = ? AND madrasah_id = ?`,
      [studentId, madrasahId]
    );

    if (rows.length === 0) {
      return res.json({ isNew: true, hifz: null, tilawah: null, revision: null });
    }

    const pos = rows[0];
    res.json({
      isNew: false,
      hifz: pos.current_surah_number ? {
        surah_number: pos.current_surah_number,
        surah_name: pos.current_surah_name,
        juz: pos.current_juz,
        ayah: pos.current_ayah
      } : null,
      tilawah: pos.tilawah_surah_number ? {
        surah_number: pos.tilawah_surah_number,
        surah_name: pos.tilawah_surah_name,
        juz: pos.tilawah_juz,
        ayah: pos.tilawah_ayah
      } : null,
      revision: pos.revision_surah_number ? {
        surah_number: pos.revision_surah_number,
        surah_name: pos.revision_surah_name,
        juz: pos.revision_juz,
        ayah: pos.revision_ayah
      } : null
    });
  } catch (error) {
    console.error('Get student position error:', error);
    res.status(500).json({ error: 'Failed to fetch student position' });
  }
});

// GET recent history for a specific student
router.get('/quran/student/:studentId/history', async (req, res) => {
  try {
    const { studentId } = req.params;
    const madrasahId = req.madrasahId;
    const limit = parseInt(req.query.limit) || 10;

    const [records] = await pool.query(
      `SELECT qp.*, s.first_name, s.last_name
       FROM quran_progress qp
       JOIN students s ON qp.student_id = s.id
       WHERE qp.student_id = ? AND qp.madrasah_id = ? AND qp.deleted_at IS NULL
       ORDER BY qp.date DESC, qp.created_at DESC
       LIMIT ?`,
      [studentId, madrasahId, limit]
    );

    res.json(records);
  } catch (error) {
    console.error('Get student quran history error:', error);
    res.status(500).json({ error: 'Failed to fetch student history' });
  }
});

// GET all student positions for a class (overview)
router.get('/classes/:classId/quran-positions', async (req, res) => {
  try {
    const { classId } = req.params;
    const madrasahId = req.madrasahId;
    const teacherId = req.user.id;

    // Verify teacher is assigned
    const [assignment] = await pool.query(
      'SELECT * FROM class_teachers WHERE class_id = ? AND user_id = ?',
      [classId, teacherId]
    );
    if (assignment.length === 0) {
      return res.status(403).json({ error: 'Not assigned to this class' });
    }

    const [students] = await pool.query(`
      SELECT s.id, s.first_name, s.last_name, s.student_id as student_code,
        qsp.current_surah_number, qsp.current_surah_name, qsp.current_juz, qsp.current_ayah,
        qsp.tilawah_surah_number, qsp.tilawah_surah_name, qsp.tilawah_juz, qsp.tilawah_ayah,
        qsp.revision_surah_number, qsp.revision_surah_name, qsp.revision_juz, qsp.revision_ayah,
        qsp.total_surahs_completed, qsp.total_juz_completed, qsp.last_updated
      FROM students s
      LEFT JOIN quran_student_position qsp ON s.id = qsp.student_id AND qsp.madrasah_id = ?
      WHERE s.class_id = ? AND s.madrasah_id = ? AND s.deleted_at IS NULL
      ORDER BY s.first_name ASC
    `, [madrasahId, classId, madrasahId]);

    res.json(students);
  } catch (error) {
    console.error('Get quran positions error:', error);
    res.status(500).json({ error: 'Failed to fetch quran positions' });
  }
});

// GET Quran progress history for a class
router.get('/classes/:classId/quran-progress', async (req, res) => {
  try {
    const { classId } = req.params;
    const { semester_id, student_id } = req.query;
    const madrasahId = req.madrasahId;
    const teacherId = req.user.id;

    const [assignment] = await pool.query(
      'SELECT * FROM class_teachers WHERE class_id = ? AND user_id = ?',
      [classId, teacherId]
    );
    if (assignment.length === 0) {
      return res.status(403).json({ error: 'Not assigned to this class' });
    }

    let query = `
      SELECT qp.*, s.first_name, s.last_name, s.student_id as student_code
      FROM quran_progress qp
      JOIN students s ON qp.student_id = s.id
      WHERE qp.class_id = ? AND qp.madrasah_id = ? AND qp.deleted_at IS NULL
    `;
    const params = [classId, madrasahId];

    if (semester_id) {
      query += ' AND qp.semester_id = ?';
      params.push(semester_id);
    }
    if (student_id) {
      query += ' AND qp.student_id = ?';
      params.push(student_id);
    }

    query += ' ORDER BY qp.date DESC, qp.created_at DESC';

    const [records] = await pool.query(query, params);
    res.json(records);
  } catch (error) {
    console.error('Get quran progress error:', error);
    res.status(500).json({ error: 'Failed to fetch quran progress' });
  }
});

// POST record a Qur'an session for a student
// This is the core endpoint — teacher records what happened when a student came to recite
router.post('/quran/record', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const teacherId = req.user.id;
    const {
      student_id, class_id, semester_id, date,
      type,          // 'hifz', 'tilawah', or 'revision'
      surah_number, surah_name, juz,
      ayah_from, ayah_to,
      grade, passed, notes
    } = req.body;

    if (!student_id || !class_id || !semester_id || !date || !type || !surah_number || !surah_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify teacher is assigned to this class
    const [assignment] = await pool.query(
      'SELECT * FROM class_teachers WHERE class_id = ? AND user_id = ?',
      [class_id, teacherId]
    );
    if (assignment.length === 0) {
      return res.status(403).json({ error: 'Not assigned to this class' });
    }

    // Insert progress record
    const [result] = await pool.query(
      `INSERT INTO quran_progress (madrasah_id, student_id, class_id, semester_id, user_id, date, type, surah_number, surah_name, juz, ayah_from, ayah_to, grade, passed, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [madrasahId, student_id, class_id, semester_id, teacherId, date, type, surah_number, surah_name, juz || null, ayah_from || null, ayah_to || null, grade || 'Good', passed !== undefined ? passed : true, notes || null]
    );

    // Update student position if student passed
    if (passed !== false) {
      if (type === 'hifz') {
        // Update hifz (memorization) position
        await pool.query(`
          INSERT INTO quran_student_position (madrasah_id, student_id, current_surah_number, current_surah_name, current_juz, current_ayah)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            current_surah_number = VALUES(current_surah_number),
            current_surah_name = VALUES(current_surah_name),
            current_juz = VALUES(current_juz),
            current_ayah = VALUES(current_ayah),
            last_updated = CURRENT_TIMESTAMP
        `, [madrasahId, student_id, surah_number, surah_name, juz || null, ayah_to || null]);
      } else if (type === 'tilawah') {
        // Update tilawah (recitation) position
        await pool.query(`
          INSERT INTO quran_student_position (madrasah_id, student_id, tilawah_surah_number, tilawah_surah_name, tilawah_juz, tilawah_ayah)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            tilawah_surah_number = VALUES(tilawah_surah_number),
            tilawah_surah_name = VALUES(tilawah_surah_name),
            tilawah_juz = VALUES(tilawah_juz),
            tilawah_ayah = VALUES(tilawah_ayah),
            last_updated = CURRENT_TIMESTAMP
        `, [madrasahId, student_id, surah_number, surah_name, juz || null, ayah_to || null]);
      } else if (type === 'revision') {
        // Update revision position
        await pool.query(`
          INSERT INTO quran_student_position (madrasah_id, student_id, revision_surah_number, revision_surah_name, revision_juz, revision_ayah)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            revision_surah_number = VALUES(revision_surah_number),
            revision_surah_name = VALUES(revision_surah_name),
            revision_juz = VALUES(revision_juz),
            revision_ayah = VALUES(revision_ayah),
            last_updated = CURRENT_TIMESTAMP
        `, [madrasahId, student_id, surah_number, surah_name, juz || null, ayah_to || null]);
      }
    }

    res.status(201).json({ id: result.insertId, message: passed !== false ? 'Passed — position updated' : 'Repeat — come back next time' });
  } catch (error) {
    console.error('Record quran progress error:', error);
    res.status(500).json({ error: 'Failed to record progress' });
  }
});

// DELETE quran progress record
router.delete('/quran-progress/:id', requireActiveSubscription, async (req, res) => {
  try {
    const { id } = req.params;
    const madrasahId = req.madrasahId;

    await pool.query(
      'UPDATE quran_progress SET deleted_at = NOW() WHERE id = ? AND madrasah_id = ?',
      [id, madrasahId]
    );

    res.json({ message: 'Record deleted' });
  } catch (error) {
    console.error('Delete quran progress error:', error);
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

export default router;
