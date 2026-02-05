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
router.post('/classes/:classId/attendance', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;
    const { student_id, semester_id, date, present, dressing_grade, behavior_grade, notes, timezone } = req.body;

    // Validate date is not in the future using client's timezone
    const clientTimezone = timezone || 'UTC';
    const now = new Date();
    const todayInClientTz = new Date(now.toLocaleString('en-US', { timeZone: clientTimezone }));
    const todayStr = todayInClientTz.toISOString().split('T')[0]; // YYYY-MM-DD
    if (date > todayStr) {
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
    const { semester_id, date, records, timezone } = req.body;

    // Validate date is not in the future using client's timezone
    const clientTimezone = timezone || 'UTC';
    const now = new Date();
    const todayInClientTz = new Date(now.toLocaleString('en-US', { timeZone: clientTimezone }));
    const todayStr = todayInClientTz.toISOString().split('T')[0]; // YYYY-MM-DD
    if (date > todayStr) {
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

// Update individual exam performance record (scoped to madrasah)
router.put('/exam-performance/:id', async (req, res) => {
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
router.delete('/exam-performance/:id', async (req, res) => {
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

// Update exam batch (multiple records) - scoped to madrasah
router.put('/exam-performance/batch', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { record_ids, semester_id, subject, exam_date, max_score } = req.body;

    if (!record_ids || !Array.isArray(record_ids) || record_ids.length === 0) {
      return res.status(400).json({ error: 'Record IDs are required' });
    }

    // Verify all records belong to this teacher and madrasah
    const [records] = await pool.query(
      `SELECT id FROM exam_performance 
       WHERE id IN (?) AND user_id = ? AND madrasah_id = ?`,
      [record_ids, req.user.id, madrasahId]
    );

    if (records.length !== record_ids.length) {
      return res.status(403).json({ error: 'Not authorized to edit some records' });
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
    values.push(record_ids);

    await pool.query(
      `UPDATE exam_performance SET ${updates.join(', ')} WHERE id IN (?)`,
      values
    );

    res.json({ message: 'Exam batch updated successfully' });
  } catch (error) {
    console.error('Update exam batch error:', error);
    res.status(500).json({ error: 'Failed to update exam batch' });
  }
});

// Delete exam batch (multiple records) - scoped to madrasah
router.delete('/exam-performance/batch', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { record_ids } = req.body;

    if (!record_ids || !Array.isArray(record_ids) || record_ids.length === 0) {
      return res.status(400).json({ error: 'Record IDs are required' });
    }

    // Verify all records belong to this teacher and madrasah
    const [records] = await pool.query(
      `SELECT id FROM exam_performance 
       WHERE id IN (?) AND user_id = ? AND madrasah_id = ?`,
      [record_ids, req.user.id, madrasahId]
    );

    if (records.length !== record_ids.length) {
      return res.status(403).json({ error: 'Not authorized to delete some records' });
    }

    // Delete all records
    await pool.query('DELETE FROM exam_performance WHERE id IN (?)', [record_ids]);

    res.json({ message: `${record_ids.length} exam records deleted successfully` });
  } catch (error) {
    console.error('Delete exam batch error:', error);
    res.status(500).json({ error: 'Failed to delete exam batch' });
  }
});

// Get student reports/summary for a class (scoped to madrasah)
router.get('/classes/:classId/student-reports', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;
    const { sessionId, semesterId } = req.query;

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

    query += ` GROUP BY s.id ORDER BY overall_percentage DESC`;

    const [reports] = await pool.query(query, queryParams);

    // Format the results
    const formattedReports = reports.map(report => ({
      ...report,
      overall_percentage: report.overall_percentage ? parseFloat(report.overall_percentage).toFixed(2) : '0.00',
      total_score: report.total_score ? parseFloat(report.total_score).toFixed(2) : '0.00',
      total_max_score: report.total_max_score ? parseFloat(report.total_max_score).toFixed(2) : '0.00',
      subject_count: parseInt(report.subject_count) || 0,
      total_exams: parseInt(report.total_exams) || 0,
      exams_taken: parseInt(report.exams_taken) || 0,
      exams_absent: parseInt(report.exams_absent) || 0
    }));

    res.json(formattedReports);
  } catch (error) {
    console.error('Get student reports error:', error);
    res.status(500).json({ error: 'Failed to fetch student reports' });
  }
});

export default router;
