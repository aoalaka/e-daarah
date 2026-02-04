import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { isValidEmail, isValidPhone, isValidName, isValidStaffId, isValidStudentId, isRequired, isValidPassword } from '../utils/validation.js';
import { sendEmailVerification, sendWelcomeEmail } from '../services/email.service.js';
import crypto from 'crypto';

const router = express.Router();

// Register new madrasah (multi-tenant)
router.post('/register-madrasah', async (req, res) => {
  console.log('Madrasah registration request:', req.body);
  
  try {
    const { madrasahName, slug, institutionType, phoneCountryCode, phone, street, city, region, country, adminFirstName, adminLastName, adminEmail, adminPassword } = req.body;

    // Validate required fields
    if (!madrasahName || !slug || !adminEmail || !adminPassword || !adminFirstName || !phone || !street || !city || !region || !country) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate institution type if provided
    const validInstitutionTypes = ['mosque_based', 'independent', 'school_affiliated', 'online', 'other'];
    if (institutionType && !validInstitutionTypes.includes(institutionType)) {
      return res.status(400).json({ error: 'Invalid institution type' });
    }
    
    // Validate admin name
    if (!isValidName(adminFirstName)) {
      return res.status(400).json({ error: 'Invalid first name format' });
    }
    
    if (adminLastName && !isValidName(adminLastName)) {
      return res.status(400).json({ error: 'Invalid last name format' });
    }
    
    // Validate email
    if (!isValidEmail(adminEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Validate password (min 8 characters)
    if (adminPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    if (!isValidPassword(adminPassword)) {
      return res.status(400).json({ error: 'Password must contain uppercase, lowercase, number, and symbol' });
    }
    
    // Validate phone (required)
    if (!phone || phone.trim() === '') {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    if (!isValidPhone(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }
    
    // Validate slug format (lowercase, alphanumeric, hyphens only)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return res.status(400).json({ error: 'Invalid slug format. Use lowercase letters, numbers, and hyphens only.' });
    }
    
    // Check if slug already exists
    const [existingMadrasah] = await pool.query(
      'SELECT id FROM madrasahs WHERE slug = ?',
      [slug]
    );
    
    if (existingMadrasah.length > 0) {
      return res.status(409).json({ error: 'Madrasah slug already exists' });
    }
    
    // Check if admin email already exists
    const [existingUser] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [adminEmail]
    );
    
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    // Combine phone with country code (no space)
    const fullPhone = `${phoneCountryCode || '+64'}${phone}`;
    
    // Calculate trial end date (14 days from now)
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Create madrasah with trial period
    let madrasahResult;
    try {
      [madrasahResult] = await pool.query(
        'INSERT INTO madrasahs (name, slug, institution_type, phone, street, city, region, country, is_active, trial_ends_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)',
        [madrasahName, slug, institutionType || null, fullPhone, street, city, region, country, trialEndsAt]
      );
    } catch (dbError) {
      // If newer columns don't exist, try basic insert
      if (dbError.code === 'ER_BAD_FIELD_ERROR') {
        [madrasahResult] = await pool.query(
          'INSERT INTO madrasahs (name, slug, phone, street, city, region, country, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)',
          [madrasahName, slug, fullPhone, street, city, region, country]
        );
      } else {
        throw dbError;
      }
    }
    
    const madrasahId = madrasahResult.insertId;
    
    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create admin user with verification token
    const [userResult] = await pool.query(
      'INSERT INTO users (madrasah_id, first_name, last_name, email, password, role, email_verification_token, email_verification_expires) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [madrasahId, adminFirstName, adminLastName || '', adminEmail, hashedPassword, 'admin', verificationToken, verificationExpires]
    );

    const userId = userResult.insertId;

    // Generate JWT token
    const token = jwt.sign(
      {
        id: userId,
        email: adminEmail,
        role: 'admin',
        madrasahId: madrasahId,
        madrasahSlug: slug
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Send verification email (async, don't block registration)
    sendEmailVerification(adminEmail, verificationToken, slug).catch(err => {
      console.error('Failed to send verification email:', err);
    });

    console.log('Madrasah registered successfully:', { madrasahId, userId, slug });

    res.status(201).json({
      token,
      user: {
        id: userId,
        firstName: adminFirstName,
        lastName: adminLastName || '',
        email: adminEmail,
        role: 'admin',
        emailVerified: false
      },
      madrasah: {
        id: madrasahId,
        name: madrasahName,
        slug: slug
      }
    });
  } catch (error) {
    console.error('Madrasah registration error:', error);
    res.status(500).json({ error: 'Failed to register madrasah' });
  }
});

// Get madrasah by slug
router.get('/madrasah/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const [madrasahs] = await pool.query(
      'SELECT id, name, slug, logo_url FROM madrasahs WHERE slug = ? AND is_active = TRUE',
      [slug]
    );
    
    if (madrasahs.length === 0) {
      return res.status(404).json({ error: 'Madrasah not found' });
    }
    
    res.json(madrasahs[0]);
  } catch (error) {
    console.error('Error fetching madrasah:', error);
    res.status(500).json({ error: 'Failed to fetch madrasah' });
  }
});

// Login endpoint (multi-tenant aware)
router.post('/login', async (req, res) => {
  console.log('Login request received');
  
  try {
    const { email, password, role } = req.body;
    
    // Validate input
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required' });
    }
    
    // Query users table with role check (include email_verified status, exclude deleted)
    const [users] = await pool.query(
      'SELECT u.id, u.madrasah_id, u.first_name, u.last_name, u.email, u.password, u.role, u.staff_id, u.email_verified, m.slug as madrasah_slug FROM users u JOIN madrasahs m ON u.madrasah_id = m.id WHERE u.email = ? AND u.role = ? AND u.deleted_at IS NULL AND m.deleted_at IS NULL',
      [email, role]
    );
    
    if (users.length === 0) {
      console.log(`No user found with email ${email} and role ${role}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = users[0];
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        madrasahId: user.madrasah_id,
        madrasahSlug: user.madrasah_slug,
        staffId: user.staff_id || null
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log(`Login successful for ${email} as ${role}`);
    
    res.json({
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        staffId: user.staff_id || null,
        emailVerified: Boolean(user.email_verified)
      },
      madrasah: {
        id: user.madrasah_id,
        slug: user.madrasah_slug
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Teacher self-registration
router.post('/register-teacher', async (req, res) => {
  console.log('Teacher registration request');
  
  try {
    const { firstName, lastName, staffId, email, password, phone, madrasahSlug } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !staffId || !email || !password || !madrasahSlug) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Validate names
    if (!isValidName(firstName)) {
      return res.status(400).json({ error: 'Invalid first name format' });
    }
    
    if (!isValidName(lastName)) {
      return res.status(400).json({ error: 'Invalid last name format' });
    }
    
    // Validate email
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Validate password
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Password must contain uppercase, lowercase, number, and symbol' });
    }
    
    // Validate phone if provided
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }
    
    // Validate staff_id format (5 digits)
    if (!isValidStaffId(staffId)) {
      return res.status(400).json({ error: 'Staff ID must be exactly 5 digits' });
    }
    
    // Get madrasah by slug
    const [madrasahs] = await pool.query(
      'SELECT id FROM madrasahs WHERE slug = ? AND is_active = TRUE',
      [madrasahSlug]
    );
    
    if (madrasahs.length === 0) {
      return res.status(404).json({ error: 'Madrasah not found' });
    }
    
    const madrasahId = madrasahs[0].id;
    
    // Check if staff_id already exists
    const [existingStaff] = await pool.query(
      'SELECT id FROM users WHERE staff_id = ?',
      [staffId]
    );
    
    if (existingStaff.length > 0) {
      return res.status(409).json({ error: 'Staff ID already exists' });
    }
    
    // Check if email already exists
    const [existingEmail] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existingEmail.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create teacher
    const [result] = await pool.query(
      'INSERT INTO users (madrasah_id, first_name, last_name, staff_id, email, password, phone, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [madrasahId, firstName, lastName, staffId, email, hashedPassword, phone || '', 'teacher']
    );
    
    console.log('Teacher registered successfully:', result.insertId);
    
    res.status(201).json({
      message: 'Teacher registered successfully',
      teacher: {
        id: result.insertId,
        firstName,
        lastName,
        staffId,
        email
      }
    });
  } catch (error) {
    console.error('Teacher registration error:', error);
    res.status(500).json({ error: 'Failed to register teacher' });
  }
});

// Parent login (using student_id, last_name, and madrasah slug for tenant isolation)
router.post('/parent-login', async (req, res) => {
  console.log('Parent login request');

  try {
    const { studentId, surname, madrasahSlug } = req.body;

    if (!studentId || !surname || !madrasahSlug) {
      return res.status(400).json({ error: 'Student ID, surname, and madrasah are required' });
    }

    // Validate student ID format
    if (!isValidStudentId(studentId)) {
      return res.status(400).json({ error: 'Student ID must be exactly 6 digits' });
    }

    // Validate surname
    if (!isValidName(surname)) {
      return res.status(400).json({ error: 'Invalid surname format' });
    }

    // Get madrasah by slug first (tenant isolation)
    const [madrasahs] = await pool.query(
      'SELECT id, slug FROM madrasahs WHERE slug = ? AND is_active = TRUE',
      [madrasahSlug]
    );

    if (madrasahs.length === 0) {
      return res.status(404).json({ error: 'Madrasah not found' });
    }

    const madrasahId = madrasahs[0].id;

    // Find student by student_id, last_name, AND madrasah_id (tenant isolated)
    const [students] = await pool.query(
      'SELECT id, first_name, last_name, student_id, class_id, madrasah_id FROM students WHERE student_id = ? AND LOWER(last_name) = LOWER(?) AND madrasah_id = ?',
      [studentId, surname, madrasahId]
    );

    if (students.length === 0) {
      return res.status(401).json({ error: 'Invalid student ID or surname' });
    }

    const student = students[0];

    // Generate JWT for parent with madrasah context
    const token = jwt.sign(
      {
        studentId: student.id,
        role: 'parent',
        madrasahId: student.madrasah_id,
        madrasahSlug: madrasahSlug
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Parent login successful for student:', student.id, 'in madrasah:', madrasahId);

    res.json({
      token,
      student: {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        studentId: student.student_id,
        classId: student.class_id
      },
      madrasah: {
        id: madrasahId,
        slug: madrasahSlug
      }
    });
  } catch (error) {
    console.error('Parent login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get parent report (authenticated with tenant isolation)
router.get('/parent/report', authenticateToken, async (req, res) => {
  console.log('Parent report - Token user:', req.user);

  try {
    // Verify parent role
    if (req.user.role !== 'parent') {
      console.log('Parent report - Invalid role:', req.user.role);
      return res.status(403).json({ error: 'Access denied' });
    }

    const studentId = req.user.studentId;
    const madrasahId = req.user.madrasahId;

    // Get student details WITH madrasah_id verification (tenant isolation)
    const [students] = await pool.query(
      'SELECT s.*, c.name as class_name FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.id = ? AND s.madrasah_id = ?',
      [studentId, madrasahId]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = students[0];

    // Get attendance records (tenant isolated)
    const [attendance] = await pool.query(
      'SELECT * FROM attendance WHERE student_id = ? AND madrasah_id = ? ORDER BY date DESC',
      [studentId, madrasahId]
    );

    // Get exam performance (tenant isolated)
    const [exams] = await pool.query(
      'SELECT * FROM exam_performance WHERE student_id = ? AND madrasah_id = ? ORDER BY exam_date DESC',
      [studentId, madrasahId]
    );

    // Calculate attendance statistics
    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => a.present).length;
    const attendanceRate = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : '0.0';

    // Calculate dressing and behavior averages
    const gradeToNumber = (grade) => {
      switch (grade) {
        case 'Excellent': return 4;
        case 'Good': return 3;
        case 'Fair': return 2;
        case 'Poor': return 1;
        default: return 0;
      }
    };

    const dressingGrades = attendance.filter(a => a.dressing_grade).map(a => gradeToNumber(a.dressing_grade));
    const behaviorGrades = attendance.filter(a => a.behavior_grade).map(a => gradeToNumber(a.behavior_grade));

    const avgDressing = dressingGrades.length > 0
      ? dressingGrades.reduce((a, b) => a + b, 0) / dressingGrades.length
      : null;
    const avgBehavior = behaviorGrades.length > 0
      ? behaviorGrades.reduce((a, b) => a + b, 0) / behaviorGrades.length
      : null;

    // Calculate class position based on average exam scores (tenant isolated)
    let classPosition = null;
    let totalStudents = null;

    if (student.class_id) {
      // Get all students in the class with their average exam scores (tenant isolated)
      const [classRankings] = await pool.query(
        `SELECT
          s.id,
          s.student_id,
          AVG(CASE WHEN ep.is_absent = 0 AND ep.score IS NOT NULL
              THEN (ep.score / ep.max_score * 100)
              ELSE NULL END) as avg_score
         FROM students s
         LEFT JOIN exam_performance ep ON s.id = ep.student_id AND ep.madrasah_id = ?
         WHERE s.class_id = ? AND s.madrasah_id = ?
         GROUP BY s.id, s.student_id
         HAVING avg_score IS NOT NULL
         ORDER BY avg_score DESC`,
        [madrasahId, student.class_id, madrasahId]
      );

      totalStudents = classRankings.length;
      const studentRank = classRankings.findIndex(r => r.id === studentId);
      if (studentRank !== -1) {
        classPosition = studentRank + 1;
      }
    }

    res.json({
      student,
      attendance: {
        records: attendance,
        totalDays,
        presentDays,
        attendanceRate
      },
      dressingBehavior: {
        avgDressing,
        avgBehavior
      },
      exams,
      classPosition: {
        position: classPosition,
        totalStudents: totalStudents
      }
    });
  } catch (error) {
    console.error('Error fetching parent report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// Send email verification
router.post('/send-verification', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const madrasahSlug = req.user.madrasahSlug;

    // Get user email
    const [users] = await pool.query(
      'SELECT email, email_verified FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (users[0].email_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save token to database
    await pool.query(
      'UPDATE users SET email_verification_token = ?, email_verification_expires = ? WHERE id = ?',
      [verificationToken, expires, userId]
    );

    // Send verification email
    await sendEmailVerification(users[0].email, verificationToken, madrasahSlug);

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    console.log('[Verify Email] Token received:', token ? `${token.substring(0, 10)}...` : 'none');

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    // Find user with this token
    const [users] = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.email_verified, u.email_verification_expires, m.name as madrasah_name
       FROM users u
       JOIN madrasahs m ON u.madrasah_id = m.id
       WHERE u.email_verification_token = ?`,
      [token]
    );

    console.log('[Verify Email] Users found:', users.length);

    if (users.length === 0) {
      // Check if token exists but expired
      const [expiredCheck] = await pool.query(
        'SELECT id, email_verification_expires FROM users WHERE email_verification_token = ?',
        [token]
      );
      if (expiredCheck.length > 0) {
        console.log('[Verify Email] Token found but may be expired:', expiredCheck[0].email_verification_expires);
      }
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const user = users[0];

    // Check if already verified
    if (user.email_verified) {
      console.log('[Verify Email] Email already verified for user:', user.id);
      return res.json({ message: 'Email already verified' });
    }

    // Check expiry
    if (new Date(user.email_verification_expires) < new Date()) {
      console.log('[Verify Email] Token expired:', user.email_verification_expires);
      return res.status(400).json({ error: 'Verification token has expired. Please request a new one.' });
    }

    // Mark email as verified (use 1 instead of TRUE for MySQL compatibility)
    const [updateResult] = await pool.query(
      'UPDATE users SET email_verified = 1, email_verification_token = NULL, email_verification_expires = NULL WHERE id = ?',
      [user.id]
    );

    console.log('[Verify Email] Update result:', updateResult.affectedRows, 'rows affected');

    // Verify the update worked
    const [verifyUpdate] = await pool.query(
      'SELECT email_verified FROM users WHERE id = ?',
      [user.id]
    );
    console.log('[Verify Email] Verification status after update:', verifyUpdate[0]?.email_verified);

    // Send welcome email (don't block on failure)
    sendWelcomeEmail(user.email, user.first_name, user.madrasah_name).catch(err => {
      console.error('[Verify Email] Failed to send welcome email:', err);
    });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('[Verify Email] Error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// Check email verification status
router.get('/verification-status', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT email_verified FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ emailVerified: users[0].email_verified });
  } catch (error) {
    console.error('Verification status error:', error);
    res.status(500).json({ error: 'Failed to check verification status' });
  }
});

export default router;
