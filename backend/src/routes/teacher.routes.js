import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication and teacher role
router.use(authenticateToken, requireRole('teacher'));

// Get active session and semester (scoped to madrasah)
router.get('/active-session-semester', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const [sessions] = await pool.query(
      'SELECT * FROM sessions WHERE madrasah_id = ? AND is_active = TRUE LIMIT 1',
      [madrasahId]
    );
    const [semesters] = await pool.query(
      `SELECT s.*, sess.name as session_name
       FROM semesters s
       LEFT JOIN sessions sess ON s.session_id = sess.id
       WHERE sess.madrasah_id = ? AND s.is_active = TRUE LIMIT 1`,
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

// Get all semesters (scoped to madrasah)
router.get('/semesters', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const [semesters] = await pool.query(
      `SELECT s.*, sess.name as session_name
       FROM semesters s
       LEFT JOIN sessions sess ON s.session_id = sess.id
       WHERE sess.madrasah_id = ?
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
       WHERE ct.user_id = ? AND c.madrasah_id = ?`,
      [req.user.id, madrasahId]
    );
    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch classes' });
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
       WHERE class_id = ? AND madrasah_id = ?
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
router.post('/classes/:classId/attendance', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;
    const { student_id, semester_id, date, present, dressing_grade, behavior_grade, notes } = req.body;

    // Validate date is not too far in the future (allow 1 day buffer for timezone differences)
    const attendanceDate = new Date(date + 'T00:00:00Z'); // Parse as UTC
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);
    if (attendanceDate > tomorrow) {
      return res.status(400).json({ error: 'Cannot record attendance for future dates' });
    }

    // Validate required fields for present students
    if (present === true || present === 1) {
      if (!dressing_grade || dressing_grade === '') {
        return res.status(400).json({ error: 'Dressing grade is required for present students' });
      }
      if (!behavior_grade || behavior_grade === '') {
        return res.status(400).json({ error: 'Behavior grade is required for present students' });
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
      `INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, user_id, date, present, dressing_grade, behavior_grade, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         present = VALUES(present),
         dressing_grade = VALUES(dressing_grade),
         behavior_grade = VALUES(behavior_grade),
         notes = VALUES(notes),
         updated_at = CURRENT_TIMESTAMP`,
      [madrasahId, student_id, classId, semester_id, req.user.id, date, present, dressing_grade, behavior_grade, notes]
    );

    res.json({ message: 'Attendance recorded successfully' });
  } catch (error) {
    console.error('Attendance error:', error);
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

// Bulk record attendance (scoped to madrasah)
router.post('/classes/:classId/attendance/bulk', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;
    const { semester_id, date, records } = req.body;

    // Validate date is not too far in the future (allow 1 day buffer for timezone differences)
    const attendanceDate = new Date(date + 'T00:00:00Z'); // Parse as UTC
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);
    if (attendanceDate > tomorrow) {
      return res.status(400).json({ error: 'Cannot record attendance for future dates' });
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

    // Validate required fields for present students
    for (const record of records) {
      if (record.present === true || record.present === 1) {
        if (!record.dressing_grade || record.dressing_grade === '') {
          return res.status(400).json({ error: 'Dressing grade is required for all present students' });
        }
        if (!record.behavior_grade || record.behavior_grade === '') {
          return res.status(400).json({ error: 'Behavior grade is required for all present students' });
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
        `INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, user_id, date, present, absence_reason, dressing_grade, behavior_grade, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           present = VALUES(present),
           absence_reason = VALUES(absence_reason),
           dressing_grade = VALUES(dressing_grade),
           behavior_grade = VALUES(behavior_grade),
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
router.post('/classes/:classId/students', async (req, res) => {
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
router.post('/classes/:classId/exam-performance/bulk', async (req, res) => {
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

export default router;
