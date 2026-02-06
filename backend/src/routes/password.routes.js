import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { sendPasswordResetEmail, sendPasswordChangeConfirmation } from '../services/email.service.js';

const router = express.Router();

/**
 * Request password reset
 * POST /api/password/forgot-password
 * Body: { email, role }
 */
router.post('/forgot-password', async (req, res) => {
  const { email, role, madrasahSlug } = req.body;

  // Validate input
  if (!email || !role) {
    return res.status(400).json({ error: 'Email and role are required' });
  }

  if (!['admin', 'teacher'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be admin or teacher' });
  }

  try {
    // Check if user exists with the specified role, and get their madrasah slug
    const [users] = await pool.query(
      `SELECT u.id, u.email, m.slug as madrasah_slug 
       FROM users u 
       JOIN madrasahs m ON u.madrasah_id = m.id 
       WHERE u.email = ? AND u.role = ?`,
      [email, role]
    );

    // Always return success to prevent email enumeration
    // Don't reveal if email exists or not
    if (users.length === 0) {
      return res.json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    const user = users[0];

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Store hashed token in database
    await pool.query(
      `UPDATE users 
       SET reset_token = ?, reset_token_expires = ? 
       WHERE id = ?`,
      [hashedToken, expiresAt, user.id]
    );

    // Send reset email (use unhashed token in URL)
    const slug = user.madrasah_slug || madrasahSlug;
    try {
      await sendPasswordResetEmail(user.email, resetToken, role, slug);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      // Don't reveal email sending failure to user
    }

    res.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

/**
 * Reset password with token
 * POST /api/password/reset-password
 * Body: { token, role, newPassword }
 */
router.post('/reset-password', async (req, res) => {
  const { token, role, newPassword } = req.body;

  // Validate input
  if (!token || !role || !newPassword) {
    return res.status(400).json({ error: 'Token, role, and new password are required' });
  }

  if (!['admin', 'teacher'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  // Validate password strength
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({ 
      error: 'Password must contain uppercase, lowercase, number, and special character' 
    });
  }

  try {
    // Hash the token from URL to compare with database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token and matching role
    const [users] = await pool.query(
      `SELECT id, email FROM users 
       WHERE reset_token = ? 
       AND reset_token_expires > NOW()
       AND role = ?`,
      [hashedToken, role]
    );

    if (users.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid or expired reset token. Please request a new password reset.' 
      });
    }

    const user = users[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await pool.query(
      `UPDATE users 
       SET password = ?, reset_token = NULL, reset_token_expires = NULL 
       WHERE id = ?`,
      [hashedPassword, user.id]
    );

    // Send confirmation email (non-blocking)
    sendPasswordChangeConfirmation(user.email, role).catch(err => 
      console.error('Failed to send confirmation email:', err)
    );

    res.json({ message: 'Password has been reset successfully. You can now login with your new password.' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

/**
 * Validate reset token (check if token is valid before showing reset form)
 * GET /api/password/validate-token?token=xxx&role=xxx
 */
router.get('/validate-token', async (req, res) => {
  const { token, role } = req.query;

  if (!token || !role) {
    return res.status(400).json({ error: 'Token and role are required' });
  }

  if (!['admin', 'teacher'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const [users] = await pool.query(
      `SELECT id FROM users 
       WHERE reset_token = ? 
       AND reset_token_expires > NOW()
       AND role = ?`,
      [hashedToken, role]
    );

    if (users.length === 0) {
      return res.status(400).json({ valid: false, error: 'Invalid or expired token' });
    }

    res.json({ valid: true });

  } catch (error) {
    console.error('Validate token error:', error);
    res.status(500).json({ error: 'Failed to validate token' });
  }
});

/**
 * Change password (for authenticated users)
 * POST /api/password/change-password
 * Body: { currentPassword, newPassword }
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  // Validate input
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  // Validate new password strength
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long' });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      error: 'Password must contain uppercase, lowercase, number, and special character'
    });
  }

  try {
    // Get current user's password
    const [users] = await pool.query(
      'SELECT password, email, role FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Check that new password is different from current
    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    // Send confirmation email (non-blocking)
    sendPasswordChangeConfirmation(user.email, user.role).catch(err =>
      console.error('Failed to send confirmation email:', err)
    );

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
