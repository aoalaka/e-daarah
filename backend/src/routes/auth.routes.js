import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { isValidEmail, isValidPhone, isValidName, isValidStaffId, isValidStudentId, isRequired, isValidPassword, normalizePhone } from '../utils/validation.js';
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

    // Create server-side session and record login
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('user-agent');
    await createSession(user.id, token, ipAddress, userAgent);
    await recordSuccessfulLogin(user.id, ipAddress, userAgent);

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

// Helper: resolve madrasah and check parent portal access
async function resolveParentMadrasah(madrasahSlug) {
  const [madrasahs] = await pool.query(
    'SELECT id, slug, pricing_plan, subscription_status FROM madrasahs WHERE slug = ? AND is_active = TRUE',
    [madrasahSlug]
  );
  if (madrasahs.length === 0) return null;
  const m = madrasahs[0];
  const hasParentPortal = m.pricing_plan === 'plus' || m.pricing_plan === 'enterprise' ||
    (m.pricing_plan === 'trial' && m.subscription_status === 'trialing');
  return { ...m, hasParentPortal };
}

// Helper: find all children linked to a parent by phone
async function findChildrenByPhone(madrasahId, phone, phoneCountryCode) {
  const normalized = normalizePhone(phone, phoneCountryCode);
  const ccDigits = phoneCountryCode ? phoneCountryCode.replace(/\D/g, '') : '';
  // Normalize DB-side phone: strip non-digits, strip country code prefix if present, strip leading zeros
  const [children] = await pool.query(
    `SELECT s.id, s.first_name, s.last_name, s.student_id, s.class_id, c.name as class_name
     FROM students s LEFT JOIN classes c ON s.class_id = c.id
     WHERE s.madrasah_id = ?
       AND TRIM(LEADING '0' FROM
         CASE
           WHEN REGEXP_REPLACE(s.parent_guardian_phone, '[^0-9]', '') LIKE CONCAT(?, '%')
           THEN SUBSTRING(REGEXP_REPLACE(s.parent_guardian_phone, '[^0-9]', ''), LENGTH(?) + 1)
           ELSE REGEXP_REPLACE(s.parent_guardian_phone, '[^0-9]', '')
         END
       ) = ?
       AND s.parent_guardian_phone_country_code = ?
       AND s.deleted_at IS NULL
     ORDER BY s.first_name`,
    [madrasahId, ccDigits, ccDigits, normalized, phoneCountryCode]
  );
  return children;
}

// Parent registration (first-time setup with phone + PIN)
router.post('/parent-register', async (req, res) => {
  try {
    const { phone, phoneCountryCode, pin, name, madrasahSlug } = req.body;

    if (!phone || !phoneCountryCode || !pin || !madrasahSlug) {
      return res.status(400).json({ error: 'Phone number, country code, PIN, and madrasah are required' });
    }
    if (!/^\d{6}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be exactly 6 digits' });
    }

    // Normalize phone: strip non-digits, country code prefix, and leading zeros
    const normalizedPhone = normalizePhone(phone, phoneCountryCode);
    if (!normalizedPhone) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    const madrasah = await resolveParentMadrasah(madrasahSlug);
    if (!madrasah) return res.status(404).json({ error: 'School not found' });
    if (!madrasah.hasParentPortal) return res.status(403).json({ error: 'Parent portal is not available on this plan. Please contact your school administrator.' });

    const madrasahId = madrasah.id;

    // Verify at least one student exists with this phone in the madrasah
    const children = await findChildrenByPhone(madrasahId, normalizedPhone, phoneCountryCode);
    if (children.length === 0) {
      return res.status(404).json({ error: 'No students found with this phone number. Please check with your school that your phone number is on file.' });
    }

    // Check if parent already registered (also normalize stored phone for lookup)
    const [existing] = await pool.query(
      'SELECT id FROM parent_users WHERE madrasah_id = ? AND phone = ? AND phone_country_code = ?',
      [madrasahId, normalizedPhone, phoneCountryCode]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this phone number already exists. Please sign in instead.' });
    }

    const pinHash = await bcrypt.hash(pin, 10);
    const [result] = await pool.query(
      'INSERT INTO parent_users (madrasah_id, phone, phone_country_code, pin_hash, name) VALUES (?, ?, ?, ?, ?)',
      [madrasahId, normalizedPhone, phoneCountryCode, pinHash, name || null]
    );

    const parentId = result.insertId;
    const studentIds = children.map(c => c.id);

    const token = jwt.sign(
      { parentId, role: 'parent', madrasahId, madrasahSlug, studentIds },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      parent: { id: parentId, name: name || null, phone },
      children: children.map(c => ({ id: c.id, firstName: c.first_name, lastName: c.last_name, studentId: c.student_id, classId: c.class_id, className: c.class_name })),
      madrasah: { id: madrasahId, slug: madrasahSlug }
    });
  } catch (error) {
    console.error('Parent register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Parent login (phone + PIN, with backward compat for student ID + access code)
router.post('/parent-login', async (req, res) => {
  try {
    const { phone, phoneCountryCode, pin, studentId, accessCode, madrasahSlug } = req.body;

    if (!madrasahSlug) {
      return res.status(400).json({ error: 'Madrasah is required' });
    }

    const madrasah = await resolveParentMadrasah(madrasahSlug);
    if (!madrasah) return res.status(404).json({ error: 'School not found' });
    if (!madrasah.hasParentPortal) return res.status(403).json({ error: 'Parent portal is not available on this plan. Please contact your school administrator.' });

    const madrasahId = madrasah.id;

    // ── Legacy flow: student ID + access code ──
    if (studentId && accessCode) {
      if (!isValidStudentId(studentId)) {
        return res.status(400).json({ error: 'Student ID must be exactly 6 digits' });
      }
      const [students] = await pool.query(
        'SELECT id, first_name, last_name, student_id, class_id, madrasah_id, parent_access_code FROM students WHERE student_id = ? AND madrasah_id = ? AND deleted_at IS NULL',
        [studentId, madrasahId]
      );
      if (students.length === 0) return res.status(401).json({ error: 'Invalid student ID or access code' });
      const student = students[0];
      if (!student.parent_access_code) return res.status(401).json({ error: 'Parent access has not been set up for this student.' });
      const isCodeValid = await bcrypt.compare(accessCode, student.parent_access_code);
      if (!isCodeValid) return res.status(401).json({ error: 'Invalid student ID or access code' });

      const token = jwt.sign(
        { studentId: student.id, role: 'parent', madrasahId, madrasahSlug, studentIds: [student.id] },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      return res.json({
        token,
        parent: null,
        children: [{ id: student.id, firstName: student.first_name, lastName: student.last_name, studentId: student.student_id, classId: student.class_id, className: null }],
        madrasah: { id: madrasahId, slug: madrasahSlug }
      });
    }

    // ── New flow: phone + PIN ──
    if (!phone || !phoneCountryCode || !pin) {
      return res.status(400).json({ error: 'Phone number, country code, and PIN are required' });
    }

    // Normalize phone: strip non-digits, country code prefix, and leading zeros
    const normalizedPhone = normalizePhone(phone, phoneCountryCode);

    const [parents] = await pool.query(
      'SELECT id, name, phone, phone_country_code, pin_hash FROM parent_users WHERE madrasah_id = ? AND phone = ? AND phone_country_code = ?',
      [madrasahId, normalizedPhone, phoneCountryCode]
    );

    if (parents.length === 0) {
      return res.status(401).json({ error: 'No account found with this phone number. Please register first.' });
    }

    const parent = parents[0];
    const isPinValid = await bcrypt.compare(pin, parent.pin_hash);
    if (!isPinValid) return res.status(401).json({ error: 'Invalid PIN' });

    const children = await findChildrenByPhone(madrasahId, phone, phoneCountryCode);
    const studentIds = children.map(c => c.id);

    const token = jwt.sign(
      { parentId: parent.id, role: 'parent', madrasahId, madrasahSlug, studentIds },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      parent: { id: parent.id, name: parent.name, phone: parent.phone },
      children: children.map(c => ({ id: c.id, firstName: c.first_name, lastName: c.last_name, studentId: c.student_id, classId: c.class_id, className: c.class_name })),
      madrasah: { id: madrasahId, slug: madrasahSlug }
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
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const madrasahId = req.user.madrasahId;
    const { semester_id, session_id } = req.query;

    // Support both old (single studentId in token) and new (student_id query param) flows
    let studentId = req.query.student_id ? parseInt(req.query.student_id) : req.user.studentId;

    // If multi-child JWT, validate the requested student is in the parent's children
    if (req.user.studentIds && req.query.student_id) {
      if (!req.user.studentIds.includes(studentId)) {
        return res.status(403).json({ error: 'Access denied to this student' });
      }
    }

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
      'SELECT name, logo_url, enable_dressing_grade, enable_behavior_grade, enable_punctuality_grade, enable_quran_tracking, enable_fee_tracking, currency FROM madrasahs WHERE id = ?',
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
    const punctualityGrades = attendance.filter(a => a.punctuality_grade).map(a => gradeToNumber(a.punctuality_grade));

    const avgDressing = dressingGrades.length > 0
      ? dressingGrades.reduce((a, b) => a + b, 0) / dressingGrades.length
      : null;
    const avgBehavior = behaviorGrades.length > 0
      ? behaviorGrades.reduce((a, b) => a + b, 0) / behaviorGrades.length
      : null;
    const avgPunctuality = punctualityGrades.length > 0
      ? punctualityGrades.reduce((a, b) => a + b, 0) / punctualityGrades.length
      : null;

    // Calculate rankings (class-scoped, filtered by session/semester)
    const rankings = { attendance: {}, exam: {}, dressing: {}, behavior: {}, punctuality: {} };

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

      // Punctuality ranking (class-scoped, total = students present)
      let punctRankQuery = `
        SELECT s.id,
          AVG(CASE a.punctuality_grade
            WHEN 'Excellent' THEN 4 WHEN 'Good' THEN 3 WHEN 'Fair' THEN 2 WHEN 'Poor' THEN 1 ELSE NULL END) as avg_punctuality
        FROM students s
        LEFT JOIN attendance a ON s.id = a.student_id AND a.madrasah_id = ?
        LEFT JOIN semesters sem ON a.semester_id = sem.id
        WHERE s.madrasah_id = ? AND s.class_id = ? AND s.deleted_at IS NULL`;
      const punctRankParams = [madrasahId, madrasahId, student.class_id];

      if (semester_id) {
        punctRankQuery += ' AND a.semester_id = ?';
        punctRankParams.push(semester_id);
      } else if (session_id) {
        punctRankQuery += ' AND sem.session_id = ?';
        punctRankParams.push(session_id);
      }

      punctRankQuery += ' GROUP BY s.id HAVING avg_punctuality IS NOT NULL ORDER BY avg_punctuality DESC';
      const [punctRankings] = await pool.query(punctRankQuery, punctRankParams);

      currentRank = 1; prevPercentage = null; studentsAtRank = 0;
      punctRankings.forEach((r) => {
        const avg = parseFloat(r.avg_punctuality || 0).toFixed(2);
        if (prevPercentage !== null && avg !== prevPercentage) {
          currentRank += studentsAtRank;
          studentsAtRank = 0;
        }
        studentsAtRank++;
        prevPercentage = avg;
        if (r.id === studentId) {
          rankings.punctuality = { rank: currentRank, total_students: punctRankings.length };
        }
      });
    }

    // Quran progress
    let quranQuery = `
      SELECT qp.*, u.first_name as teacher_first_name, u.last_name as teacher_last_name
      FROM quran_progress qp
      LEFT JOIN users u ON qp.user_id = u.id
      WHERE qp.student_id = ? AND qp.madrasah_id = ? AND qp.deleted_at IS NULL
    `;
    const quranParams = [studentId, student.madrasah_id];
    if (semester_id) {
      quranQuery += ' AND qp.semester_id = ?';
      quranParams.push(semester_id);
    } else if (session_id) {
      quranQuery += ' AND qp.semester_id IN (SELECT id FROM semesters WHERE session_id = ? AND deleted_at IS NULL)';
      quranParams.push(session_id);
    }
    quranQuery += ' ORDER BY qp.date DESC';
    const [quranProgress] = await pool.query(quranQuery, quranParams);

    // Quran position
    const [quranPosition] = await pool.query(
      'SELECT * FROM quran_student_position WHERE student_id = ? AND madrasah_id = ?',
      [studentId, student.madrasah_id]
    );

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
        avgBehavior,
        avgPunctuality
      },
      exams,
      rankings,
      classPosition: {
        position: rankings.exam?.rank || null,
        totalStudents: rankings.exam?.total_students || null
      },
      quranProgress,
      quranPosition: quranPosition[0] || null
    });
  } catch (error) {
    console.error('Error fetching parent report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// Get parent's linked children
router.get('/parent/children', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'Access denied' });

    const madrasahId = req.user.madrasahId;

    // For new phone-based parents, look up by parentId
    if (req.user.parentId) {
      const [parent] = await pool.query('SELECT phone, phone_country_code FROM parent_users WHERE id = ? AND madrasah_id = ?', [req.user.parentId, madrasahId]);
      if (parent.length === 0) return res.status(404).json({ error: 'Parent not found' });
      const children = await findChildrenByPhone(madrasahId, parent[0].phone, parent[0].phone_country_code);
      return res.json(children.map(c => ({ id: c.id, firstName: c.first_name, lastName: c.last_name, studentId: c.student_id, classId: c.class_id, className: c.class_name })));
    }

    // Legacy: single studentId in token
    if (req.user.studentId) {
      const [students] = await pool.query(
        'SELECT s.id, s.first_name, s.last_name, s.student_id, s.class_id, c.name as class_name FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.id = ? AND s.madrasah_id = ? AND s.deleted_at IS NULL',
        [req.user.studentId, madrasahId]
      );
      return res.json(students.map(s => ({ id: s.id, firstName: s.first_name, lastName: s.last_name, studentId: s.student_id, classId: s.class_id, className: s.class_name })));
    }

    res.json([]);
  } catch (error) {
    console.error('Error fetching parent children:', error);
    res.status(500).json({ error: 'Failed to fetch children' });
  }
});

// Get parent fee summary for all linked children
router.get('/parent/fees', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'Access denied' });

    const madrasahId = req.user.madrasahId;

    // Get the madrasah's currency and fee tracking setting
    const [madrasahRow] = await pool.query('SELECT enable_fee_tracking, currency FROM madrasahs WHERE id = ?', [madrasahId]);
    const madrasahInfo = madrasahRow[0] || {};
    if (!madrasahInfo.enable_fee_tracking) {
      return res.json({ currency: madrasahInfo.currency || 'USD', children: [], grandTotal: 0, grandPaid: 0, grandBalance: 0 });
    }

    // Get linked children
    let children = [];
    if (req.user.parentId) {
      const [parent] = await pool.query('SELECT phone, phone_country_code FROM parent_users WHERE id = ? AND madrasah_id = ?', [req.user.parentId, madrasahId]);
      if (parent.length > 0) children = await findChildrenByPhone(madrasahId, parent[0].phone, parent[0].phone_country_code);
    } else if (req.user.studentId) {
      const [students] = await pool.query(
        'SELECT s.id, s.first_name, s.last_name, s.student_id, s.class_id, c.name as class_name FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.id = ? AND s.madrasah_id = ? AND s.deleted_at IS NULL',
        [req.user.studentId, madrasahId]
      );
      children = students;
    }

    if (children.length === 0) {
      return res.json({ currency: madrasahInfo.currency || 'USD', children: [], grandTotal: 0, grandPaid: 0, grandBalance: 0 });
    }

    // Get active session for period calculations
    const [activeSessions] = await pool.query(
      `SELECT sess.id, sess.start_date as session_start, sess.end_date as session_end,
       sem.id as semester_id, sem.start_date as semester_start, sem.end_date as semester_end
       FROM sessions sess
       LEFT JOIN semesters sem ON sem.session_id = sess.id AND sem.is_active = 1 AND sem.deleted_at IS NULL
       WHERE sess.madrasah_id = ? AND sess.is_active = 1 AND sess.deleted_at IS NULL
       LIMIT 1`,
      [madrasahId]
    );
    const activeSession = activeSessions[0] || null;
    const now = new Date();

    let semesterCount = 1;
    if (activeSession) {
      const [semCountResult] = await pool.query(
        'SELECT COUNT(*) as cnt FROM semesters WHERE session_id = ? AND deleted_at IS NULL AND start_date <= ?',
        [activeSession.id, now.toISOString().split('T')[0]]
      );
      semesterCount = Math.max(semCountResult[0].cnt, 1);
    }

    const computePeriods = (frequency) => {
      if (!activeSession) return 1;
      const semStart = activeSession.semester_start ? new Date(activeSession.semester_start) : new Date(activeSession.session_start);
      const sessStart = new Date(activeSession.session_start);
      const diffMs = now - semStart;
      const diffDays = Math.max(Math.floor(diffMs / 86400000), 0);
      switch (frequency) {
        case 'session': return 1;
        case 'semester': return semesterCount;
        case 'monthly': {
          const months = (now.getFullYear() - sessStart.getFullYear()) * 12 + (now.getMonth() - sessStart.getMonth());
          return Math.max(months, 1);
        }
        case 'weekly': return Math.max(Math.ceil(diffDays / 7), 1);
        case 'daily': return Math.max(diffDays, 1);
        default: return 1;
      }
    };

    // Get all active fee assignments for this madrasah
    const [assignments] = await pool.query(
      `SELECT fa.id, fa.fee_template_id, fa.class_id, fa.student_id, ft.name as template_name, ft.frequency
       FROM fee_assignments fa
       JOIN fee_templates ft ON ft.id = fa.fee_template_id AND ft.deleted_at IS NULL
       WHERE fa.madrasah_id = ? AND fa.deleted_at IS NULL`,
      [madrasahId]
    );

    // Get template item totals
    const templateIds = [...new Set(assignments.map(a => a.fee_template_id))];
    let itemsByTemplate = {};
    if (templateIds.length > 0) {
      const [items] = await pool.query(
        'SELECT fee_template_id, SUM(amount) as total FROM fee_template_items WHERE fee_template_id IN (?) AND deleted_at IS NULL GROUP BY fee_template_id',
        [templateIds]
      );
      for (const i of items) itemsByTemplate[i.fee_template_id] = parseFloat(i.total);
    }

    // Get payments for all children
    const childIds = children.map(c => c.id);
    let paymentsByStudentTemplate = {};
    if (childIds.length > 0 && templateIds.length > 0) {
      const [payments] = await pool.query(
        `SELECT student_id, fee_template_id, SUM(amount_paid) as total_paid
         FROM fee_payments WHERE madrasah_id = ? AND deleted_at IS NULL AND student_id IN (?) AND fee_template_id IN (?)
         GROUP BY student_id, fee_template_id`,
        [madrasahId, childIds, templateIds]
      );
      for (const p of payments) {
        paymentsByStudentTemplate[`${p.student_id}_${p.fee_template_id}`] = parseFloat(p.total_paid);
      }
    }

    // Get recent payments per child
    let recentPaymentsByChild = {};
    if (childIds.length > 0) {
      const [recentPayments] = await pool.query(
        `SELECT fp.student_id, fp.amount_paid, fp.payment_date, fp.payment_method, fp.reference_note, ft.name as template_name
         FROM fee_payments fp
         JOIN fee_templates ft ON fp.fee_template_id = ft.id
         WHERE fp.madrasah_id = ? AND fp.deleted_at IS NULL AND fp.student_id IN (?)
         ORDER BY fp.payment_date DESC, fp.created_at DESC`,
        [madrasahId, childIds]
      );
      for (const p of recentPayments) {
        if (!recentPaymentsByChild[p.student_id]) recentPaymentsByChild[p.student_id] = [];
        if (recentPaymentsByChild[p.student_id].length < 10) {
          recentPaymentsByChild[p.student_id].push({
            date: p.payment_date,
            amount: parseFloat(p.amount_paid),
            templateName: p.template_name,
            method: p.payment_method,
            reference: p.reference_note
          });
        }
      }
    }

    // Build per-child fee summary
    let grandTotal = 0, grandPaid = 0;
    const childrenFees = children.map(child => {
      const studentAssignments = assignments.filter(a =>
        a.student_id === child.id || a.class_id === child.class_id
      );
      const templateMap = {};
      for (const a of studentAssignments) {
        if (!templateMap[a.fee_template_id] || a.student_id) {
          templateMap[a.fee_template_id] = a;
        }
      }

      let totalOwed = 0, totalPaid = 0;
      const fees = [];
      for (const [templateId, assignment] of Object.entries(templateMap)) {
        const perPeriod = itemsByTemplate[templateId] || 0;
        const periods = computePeriods(assignment.frequency);
        const totalFee = perPeriod * periods;
        const key = `${child.id}_${templateId}`;
        const paid = paymentsByStudentTemplate[key] || 0;
        const balance = totalFee - paid;
        const status = paid >= totalFee ? 'paid' : paid > 0 ? 'partial' : 'unpaid';

        totalOwed += totalFee;
        totalPaid += paid;
        fees.push({ templateName: assignment.template_name, frequency: assignment.frequency, totalFee, totalPaid: paid, balance, status });
      }

      grandTotal += totalOwed;
      grandPaid += totalPaid;

      return {
        studentId: child.student_id,
        studentDbId: child.id,
        studentName: `${child.first_name} ${child.last_name}`,
        className: child.class_name || '',
        fees,
        totalOwed,
        totalPaid,
        totalBalance: totalOwed - totalPaid,
        recentPayments: recentPaymentsByChild[child.id] || []
      };
    });

    res.json({
      currency: madrasahInfo.currency || 'USD',
      children: childrenFees,
      grandTotal,
      grandPaid,
      grandBalance: grandTotal - grandPaid
    });
  } catch (error) {
    console.error('Error fetching parent fees:', error);
    res.status(500).json({ error: 'Failed to fetch fee information' });
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
