import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { isValidEmail, isValidPhone, isValidName, isValidStaffId, isValidStudentId, isRequired, isValidPassword } from '../utils/validation.js';
import { sendEmailVerification, sendWelcomeEmail } from '../services/email.service.js';
import crypto from 'crypto';
import { PLAN_LIMITS } from '../middleware/plan-limits.middleware.js';
import {
  isAccountLocked,
  recordFailedLogin,
  recordSuccessfulLogin,
  createSession,
  invalidateSession,
  getSessionInfo
} from '../services/security.service.js';

const router = express.Router();

// Register new madrasah (multi-tenant)
router.post('/register-madrasah', async (req, res) => {
  console.log('Madrasah registration request:', req.body);
  
  try {
    const { madrasahName, slug, institutionType, website, phoneCountryCode, phone, street, city, region, country, adminFirstName, adminLastName, adminEmail, adminPassword } = req.body;

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
        'INSERT INTO madrasahs (name, slug, institution_type, website, phone, street, city, region, country, is_active, trial_ends_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)',
        [madrasahName, slug, institutionType || null, website || null, fullPhone, street, city, region, country, trialEndsAt]
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
      'SELECT id, name, slug, logo_url FROM madrasahs WHERE slug = ? AND is_active = TRUE AND deleted_at IS NULL',
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

// Demo login - instant access to demo madrasahs (no password needed)
router.post('/demo-login', async (req, res) => {
  try {
    const { slug, role } = req.body;

    // Only allow demo slugs
    const allowedSlugs = ['standard-demo', 'plus-demo', 'enterprise-demo'];
    if (!allowedSlugs.includes(slug)) {
      return res.status(400).json({ error: 'Invalid demo madrasah' });
    }

    if (!role || !['admin', 'teacher'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Find the demo user
    const [users] = await pool.query(
      `SELECT u.id, u.madrasah_id, u.first_name, u.last_name, u.email, u.role, u.staff_id,
              m.slug as madrasah_slug, m.name as madrasah_name
       FROM users u
       JOIN madrasahs m ON u.madrasah_id = m.id
       WHERE m.slug = ? AND u.role = ? AND u.deleted_at IS NULL AND m.deleted_at IS NULL
       ORDER BY u.id ASC LIMIT 1`,
      [slug, role]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Demo account not found' });
    }

    const user = users[0];

    // Generate JWT (shorter expiry for demos - 4 hours)
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        madrasahId: user.madrasah_id,
        madrasahSlug: user.madrasah_slug,
        staffId: user.staff_id || null,
        isDemo: true
      },
      process.env.JWT_SECRET,
      { expiresIn: '4h' }
    );

    // Create server-side session (required for session validation)
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('user-agent');
    await createSession(user.id, token, ipAddress, userAgent);

    res.json({
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        staffId: user.staff_id || null,
        emailVerified: true,
        madrasah_name: user.madrasah_name,
        isDemo: true
      },
      madrasah: {
        id: user.madrasah_id,
        slug: user.madrasah_slug,
        name: user.madrasah_name
      }
    });
  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({ error: 'Demo login failed' });
  }
});

// Search madrasahs by name (for login finder)
router.get('/madrasahs/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json([]);
    }

    const searchTerm = `%${q.trim()}%`;
    const [madrasahs] = await pool.query(
      'SELECT id, name, slug, logo_url FROM madrasahs WHERE (name LIKE ? OR slug LIKE ?) AND is_active = TRUE AND deleted_at IS NULL ORDER BY name LIMIT 5',
      [searchTerm, searchTerm]
    );

    res.json(madrasahs);
  } catch (error) {
    console.error('Error searching madrasahs:', error);
    res.status(500).json({ error: 'Failed to search madrasahs' });
  }
});

// Login endpoint (multi-tenant aware) with account lockout protection
router.post('/login', async (req, res) => {
  console.log('Login request received');

  const ipAddress = req.ip || req.connection?.remoteAddress;
  const userAgent = req.get('user-agent');

  try {
    const { email, password, role } = req.body;

    // Validate input
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required' });
    }

    // Query users table with role check (include email_verified status, exclude deleted)
    const [users] = await pool.query(
      'SELECT u.id, u.madrasah_id, u.first_name, u.last_name, u.email, u.password, u.role, u.staff_id, u.email_verified, m.slug as madrasah_slug, m.name as madrasah_name FROM users u JOIN madrasahs m ON u.madrasah_id = m.id WHERE u.email = ? AND u.role = ? AND u.deleted_at IS NULL AND m.deleted_at IS NULL',
      [email, role]
    );

    if (users.length === 0) {
      console.log(`No user found with email ${email} and role ${role}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Check if account is locked
    const lockStatus = await isAccountLocked(user.id);
    if (lockStatus.locked) {
      console.log(`Account locked for user: ${email}, unlocks in ${lockStatus.remainingMinutes} minutes`);
      return res.status(423).json({
        error: 'Account temporarily locked',
        code: 'ACCOUNT_LOCKED',
        message: `Too many failed login attempts. Please try again in ${lockStatus.remainingMinutes} minutes.`,
        lockedUntil: lockStatus.lockedUntil
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('Invalid password for user:', email);

      // Record the failed attempt
      const failResult = await recordFailedLogin(user.id, ipAddress, userAgent);

      if (failResult.locked) {
        return res.status(423).json({
          error: 'Account temporarily locked',
          code: 'ACCOUNT_LOCKED',
          message: `Too many failed login attempts. Please try again in ${failResult.remainingMinutes} minutes.`,
          lockedUntil: failResult.lockedUntil
        });
      }

      return res.status(401).json({
        error: 'Invalid credentials',
        attemptsRemaining: failResult.attemptsRemaining
      });
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

    // Record successful login and create session
    await recordSuccessfulLogin(user.id, ipAddress, userAgent);
    await createSession(user.id, token, ipAddress, userAgent);

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
        emailVerified: Boolean(user.email_verified),
        madrasah_name: user.madrasah_name
      },
      madrasah: {
        id: user.madrasah_id,
        slug: user.madrasah_slug,
        name: user.madrasah_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout endpoint - invalidate session
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      await invalidateSession(token);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get session info (for frontend session timeout warning)
router.get('/session-info', authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const sessionInfo = await getSessionInfo(token);

    if (!sessionInfo) {
      return res.status(401).json({ error: 'Session not found' });
    }

    res.json(sessionInfo);
  } catch (error) {
    console.error('Session info error:', error);
    res.status(500).json({ error: 'Failed to get session info' });
  }
});

// Teacher self-registration (slug in body like other endpoints)
router.post('/register-teacher', async (req, res) => {
  console.log('Teacher registration request');

  try {
    const { first_name, last_name, email, password, phone, madrasahSlug } = req.body;

    // Map frontend field names to backend names
    const firstName = first_name;
    const lastName = last_name;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'First name, last name, email, and password are required' });
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

    // Get madrasah by slug with subscription info
    const [madrasahs] = await pool.query(
      'SELECT id, pricing_plan, subscription_status, trial_ends_at FROM madrasahs WHERE slug = ? AND is_active = TRUE AND deleted_at IS NULL',
      [madrasahSlug]
    );

    if (madrasahs.length === 0) {
      return res.status(404).json({ error: 'Madrasah not found' });
    }

    const madrasah = madrasahs[0];
    const madrasahId = madrasah.id;

    // Check subscription status
    const plan = madrasah.pricing_plan || 'trial';
    const status = madrasah.subscription_status || 'trialing';
    const trialEndsAt = madrasah.trial_ends_at;

    // Check if trial expired
    if (status === 'trialing' && trialEndsAt && new Date(trialEndsAt) < new Date()) {
      return res.status(403).json({
        error: 'Trial expired',
        code: 'TRIAL_EXPIRED',
        message: 'This madrasah\'s trial has expired. Please contact the administrator.'
      });
    }

    // Check if subscription is inactive
    if (status === 'canceled' || status === 'expired') {
      return res.status(403).json({
        error: 'Subscription inactive',
        code: 'SUBSCRIPTION_INACTIVE',
        message: 'This madrasah\'s subscription is not active. Please contact the administrator.'
      });
    }

    // Check teacher limit
    const [[teacherCount]] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE madrasah_id = ? AND role = "teacher" AND deleted_at IS NULL',
      [madrasahId]
    );
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.trial;
    if (teacherCount.count >= limits.maxTeachers) {
      return res.status(403).json({
        error: 'Teacher limit reached',
        code: 'TEACHER_LIMIT_REACHED',
        message: 'This madrasah has reached its teacher limit. Please contact the administrator to upgrade the plan.'
      });
    }

    // Check if email already exists
    const [existingEmail] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL',
      [email]
    );

    if (existingEmail.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Auto-generate staff ID (5 digits, unique within the madrasah)
    let staffId;
    let isUnique = false;
    while (!isUnique) {
      staffId = String(Math.floor(10000 + Math.random() * 90000)); // 5-digit number
      const [existing] = await pool.query(
        'SELECT id FROM users WHERE staff_id = ? AND madrasah_id = ?',
        [staffId, madrasahId]
      );
      if (existing.length === 0) {
        isUnique = true;
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create teacher with verification token
    const [result] = await pool.query(
      'INSERT INTO users (madrasah_id, first_name, last_name, staff_id, email, password, phone, role, email_verification_token, email_verification_expires) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [madrasahId, firstName, lastName, staffId, email, hashedPassword, phone || '', 'teacher', verificationToken, verificationExpires]
    );

    console.log('Teacher registered successfully:', result.insertId, 'Staff ID:', staffId);

    // Send verification email (async, don't block registration)
    sendEmailVerification(email, verificationToken, madrasahSlug).catch(err => {
      console.error('Failed to send teacher verification email:', err);
    });

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

// Parent login (using student_id and access code for secure authentication)
router.post('/parent-login', async (req, res) => {
  console.log('Parent login request');

  try {
    const { studentId, accessCode, madrasahSlug } = req.body;

    if (!studentId || !accessCode || !madrasahSlug) {
      return res.status(400).json({ error: 'Student ID, access code, and madrasah are required' });
    }

    // Validate student ID format
    if (!isValidStudentId(studentId)) {
      return res.status(400).json({ error: 'Student ID must be exactly 6 digits' });
    }

    // Get madrasah by slug first (tenant isolation)
    const [madrasahs] = await pool.query(
      'SELECT id, slug, pricing_plan, subscription_status FROM madrasahs WHERE slug = ? AND is_active = TRUE',
      [madrasahSlug]
    );

    if (madrasahs.length === 0) {
      return res.status(404).json({ error: 'Madrasah not found' });
    }

    const madrasah = madrasahs[0];
    const madrasahId = madrasah.id;

    // Check if madrasah plan supports parent portal (Plus/Enterprise/active Trial only)
    const hasParentPortal = madrasah.pricing_plan === 'plus' || madrasah.pricing_plan === 'enterprise' || 
      (madrasah.pricing_plan === 'trial' && madrasah.subscription_status === 'trialing');
    if (!hasParentPortal) {
      return res.status(403).json({ error: 'Parent portal is not available on this plan. Please contact your school administrator.' });
    }

    // Find student by student_id AND madrasah_id (tenant isolated)
    const [students] = await pool.query(
      'SELECT id, first_name, last_name, student_id, class_id, madrasah_id, parent_access_code FROM students WHERE student_id = ? AND madrasah_id = ? AND deleted_at IS NULL',
      [studentId, madrasahId]
    );

    if (students.length === 0) {
      return res.status(401).json({ error: 'Invalid student ID or access code' });
    }

    const student = students[0];

    // Check if access code has been set
    if (!student.parent_access_code) {
      return res.status(401).json({ error: 'Parent access has not been set up for this student. Please contact the school administrator.' });
    }

    // Verify access code against bcrypt hash
    const isCodeValid = await bcrypt.compare(accessCode, student.parent_access_code);
    if (!isCodeValid) {
      return res.status(401).json({ error: 'Invalid student ID or access code' });
    }

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

// Generate a random 6-digit numeric PIN
function generateAccessCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
    const { semester_id, session_id } = req.query;

    // Get student details WITH madrasah_id verification (tenant isolation)
    const [students] = await pool.query(
      'SELECT s.*, c.name as class_name FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.id = ? AND s.madrasah_id = ?',
      [studentId, madrasahId]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = students[0];

    // Get sessions and semesters for filters (tenant isolated)
    const [sessions] = await pool.query(
      'SELECT id, name, start_date, end_date, is_active FROM sessions WHERE madrasah_id = ? ORDER BY start_date DESC',
      [madrasahId]
    );

    const [semesters] = await pool.query(
      `SELECT sem.id, sem.name, sem.session_id, sem.is_active, ses.name as session_name
       FROM semesters sem
       JOIN sessions ses ON sem.session_id = ses.id
       WHERE ses.madrasah_id = ?
       ORDER BY ses.start_date DESC, sem.start_date ASC`,
      [madrasahId]
    );

    // Get madrasah profile for report header
    const [madrasahProfile] = await pool.query(
      'SELECT name, logo_url, enable_dressing_grade, enable_behavior_grade FROM madrasahs WHERE id = ?',
      [madrasahId]
    );

    // Build attendance query with optional session/semester filter
    let attendanceQuery = `
      SELECT a.* FROM attendance a
      LEFT JOIN semesters sem ON a.semester_id = sem.id
      WHERE a.student_id = ? AND a.madrasah_id = ?`;
    const attendanceParams = [studentId, madrasahId];

    if (semester_id) {
      attendanceQuery += ' AND a.semester_id = ?';
      attendanceParams.push(semester_id);
    } else if (session_id) {
      attendanceQuery += ' AND sem.session_id = ?';
      attendanceParams.push(session_id);
    }

    attendanceQuery += ' ORDER BY a.date DESC';
    const [attendance] = await pool.query(attendanceQuery, attendanceParams);

    // Build exam query with optional session/semester filter
    let examQuery = `
      SELECT ep.* FROM exam_performance ep
      LEFT JOIN semesters sem ON ep.semester_id = sem.id
      WHERE ep.student_id = ? AND ep.madrasah_id = ?`;
    const examParams = [studentId, madrasahId];

    if (semester_id) {
      examQuery += ' AND ep.semester_id = ?';
      examParams.push(semester_id);
    } else if (session_id) {
      examQuery += ' AND sem.session_id = ?';
      examParams.push(session_id);
    }

    examQuery += ' ORDER BY ep.exam_date DESC';
    const [exams] = await pool.query(examQuery, examParams);

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

    // Calculate rankings (class-scoped, filtered by session/semester)
    const rankings = { attendance: {}, exam: {}, dressing: {}, behavior: {} };

    if (student.class_id) {
      // Exam ranking (class-scoped, total = students in class)
      let examRankQuery = `
        SELECT s.id,
          CASE WHEN SUM(ep.max_score) > 0
            THEN (SUM(CASE WHEN ep.is_absent = FALSE THEN ep.score ELSE 0 END) / SUM(ep.max_score)) * 100
            ELSE 0 END as overall_percentage
        FROM students s
        LEFT JOIN exam_performance ep ON s.id = ep.student_id AND ep.madrasah_id = ?
        LEFT JOIN semesters sem ON ep.semester_id = sem.id
        WHERE s.madrasah_id = ? AND s.class_id = ? AND s.deleted_at IS NULL`;
      const examRankParams = [madrasahId, madrasahId, student.class_id];

      if (semester_id) {
        examRankQuery += ' AND ep.semester_id = ?';
        examRankParams.push(semester_id);
      } else if (session_id) {
        examRankQuery += ' AND sem.session_id = ?';
        examRankParams.push(session_id);
      }

      examRankQuery += ' GROUP BY s.id ORDER BY overall_percentage DESC';
      const [examRankings] = await pool.query(examRankQuery, examRankParams);

      // Tie-aware exam ranking
      let currentRank = 1;
      let prevPercentage = null;
      let studentsAtRank = 0;
      examRankings.forEach((r) => {
        const pct = parseFloat(r.overall_percentage || 0).toFixed(2);
        if (prevPercentage !== null && pct !== prevPercentage) {
          currentRank += studentsAtRank;
          studentsAtRank = 0;
        }
        studentsAtRank++;
        prevPercentage = pct;
        if (r.id === studentId && parseFloat(pct) > 0) {
          rankings.exam = { rank: currentRank, total_students: examRankings.length, percentage: parseFloat(pct) };
        }
      });

      // Attendance ranking (class-scoped, total = students in class)
      let attRankQuery = `
        SELECT s.id,
          CASE WHEN COUNT(a.id) > 0
            THEN (SUM(CASE WHEN a.present = TRUE THEN 1 ELSE 0 END) / COUNT(a.id)) * 100
            ELSE 0 END as attendance_rate
        FROM students s
        LEFT JOIN attendance a ON s.id = a.student_id AND a.madrasah_id = ?
        LEFT JOIN semesters sem ON a.semester_id = sem.id
        WHERE s.madrasah_id = ? AND s.class_id = ? AND s.deleted_at IS NULL`;
      const attRankParams = [madrasahId, madrasahId, student.class_id];

      if (semester_id) {
        attRankQuery += ' AND a.semester_id = ?';
        attRankParams.push(semester_id);
      } else if (session_id) {
        attRankQuery += ' AND sem.session_id = ?';
        attRankParams.push(session_id);
      }

      attRankQuery += ' GROUP BY s.id ORDER BY attendance_rate DESC';
      const [attRankings] = await pool.query(attRankQuery, attRankParams);

      currentRank = 1; prevPercentage = null; studentsAtRank = 0;
      attRankings.forEach((r) => {
        const rate = parseFloat(r.attendance_rate || 0).toFixed(2);
        if (prevPercentage !== null && rate !== prevPercentage) {
          currentRank += studentsAtRank;
          studentsAtRank = 0;
        }
        studentsAtRank++;
        prevPercentage = rate;
        if (r.id === studentId && parseFloat(rate) > 0) {
          rankings.attendance = { rank: currentRank, total_students: attRankings.length };
        }
      });

      // Dressing ranking (class-scoped, total = students present)
      let dressRankQuery = `
        SELECT s.id,
          AVG(CASE a.dressing_grade
            WHEN 'Excellent' THEN 4 WHEN 'Good' THEN 3 WHEN 'Fair' THEN 2 WHEN 'Poor' THEN 1 ELSE NULL END) as avg_dressing
        FROM students s
        LEFT JOIN attendance a ON s.id = a.student_id AND a.madrasah_id = ?
        LEFT JOIN semesters sem ON a.semester_id = sem.id
        WHERE s.madrasah_id = ? AND s.class_id = ? AND s.deleted_at IS NULL`;
      const dressRankParams = [madrasahId, madrasahId, student.class_id];

      if (semester_id) {
        dressRankQuery += ' AND a.semester_id = ?';
        dressRankParams.push(semester_id);
      } else if (session_id) {
        dressRankQuery += ' AND sem.session_id = ?';
        dressRankParams.push(session_id);
      }

      dressRankQuery += ' GROUP BY s.id HAVING avg_dressing IS NOT NULL ORDER BY avg_dressing DESC';
      const [dressRankings] = await pool.query(dressRankQuery, dressRankParams);

      currentRank = 1; prevPercentage = null; studentsAtRank = 0;
      dressRankings.forEach((r) => {
        const avg = parseFloat(r.avg_dressing || 0).toFixed(2);
        if (prevPercentage !== null && avg !== prevPercentage) {
          currentRank += studentsAtRank;
          studentsAtRank = 0;
        }
        studentsAtRank++;
        prevPercentage = avg;
        if (r.id === studentId) {
          rankings.dressing = { rank: currentRank, total_students: dressRankings.length };
        }
      });

      // Behavior ranking (class-scoped, total = students present)
      let behavRankQuery = `
        SELECT s.id,
          AVG(CASE a.behavior_grade
            WHEN 'Excellent' THEN 4 WHEN 'Good' THEN 3 WHEN 'Fair' THEN 2 WHEN 'Poor' THEN 1 ELSE NULL END) as avg_behavior
        FROM students s
        LEFT JOIN attendance a ON s.id = a.student_id AND a.madrasah_id = ?
        LEFT JOIN semesters sem ON a.semester_id = sem.id
        WHERE s.madrasah_id = ? AND s.class_id = ? AND s.deleted_at IS NULL`;
      const behavRankParams = [madrasahId, madrasahId, student.class_id];

      if (semester_id) {
        behavRankQuery += ' AND a.semester_id = ?';
        behavRankParams.push(semester_id);
      } else if (session_id) {
        behavRankQuery += ' AND sem.session_id = ?';
        behavRankParams.push(session_id);
      }

      behavRankQuery += ' GROUP BY s.id HAVING avg_behavior IS NOT NULL ORDER BY avg_behavior DESC';
      const [behavRankings] = await pool.query(behavRankQuery, behavRankParams);

      currentRank = 1; prevPercentage = null; studentsAtRank = 0;
      behavRankings.forEach((r) => {
        const avg = parseFloat(r.avg_behavior || 0).toFixed(2);
        if (prevPercentage !== null && avg !== prevPercentage) {
          currentRank += studentsAtRank;
          studentsAtRank = 0;
        }
        studentsAtRank++;
        prevPercentage = avg;
        if (r.id === studentId) {
          rankings.behavior = { rank: currentRank, total_students: behavRankings.length };
        }
      });
    }

    res.json({
      student,
      madrasah: madrasahProfile[0] || {},
      sessions,
      semesters,
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
      rankings,
      classPosition: {
        position: rankings.exam?.rank || null,
        totalStudents: rankings.exam?.total_students || null
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
      `SELECT u.id, u.email, u.first_name, u.role, u.email_verified, u.email_verification_expires,
              m.name as madrasah_name, m.slug as madrasah_slug
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
    sendWelcomeEmail(user.email, user.first_name, user.madrasah_name, user.madrasah_slug, user.role).catch(err => {
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
