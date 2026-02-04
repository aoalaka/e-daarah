// Email service using Resend
// Docs: https://resend.com/docs

import { Resend } from 'resend';

// Initialize Resend client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Email configuration
const FROM_EMAIL = process.env.EMAIL_FROM || 'e-daarah <noreply@e-daarah.com>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const APP_NAME = 'e-daarah';

// Check if email is enabled
const isEmailEnabled = () => {
  if (!resend) {
    console.log('[Email] Resend not configured - RESEND_API_KEY not set');
    return false;
  }
  return true;
};

/**
 * Base email template wrapper
 */
const emailWrapper = (content, preheader = '') => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${APP_NAME}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden;">${preheader}</div>` : ''}
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 560px; border-collapse: collapse;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <span style="font-size: 24px; font-weight: 700; color: #1a1a1a; letter-spacing: -0.5px;">${APP_NAME}</span>
            </td>
          </tr>
          <!-- Content Card -->
          <tr>
            <td style="background: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 24px;">
              <p style="margin: 0; font-size: 13px; color: #888888;">
                &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #aaaaaa;">
                Madrasah Administration Made Simple
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Send email verification
 */
export const sendEmailVerification = async (email, verificationToken, madrasahSlug) => {
  const verifyUrl = `${FRONTEND_URL}/${madrasahSlug}/verify-email?token=${verificationToken}`;

  if (!isEmailEnabled()) {
    console.log('\n=== EMAIL VERIFICATION (Console) ===');
    console.log(`To: ${email}`);
    console.log(`Verify URL: ${verifyUrl}`);
    console.log('====================================\n');
    return { success: true, messageId: 'console-log' };
  }

  const content = `
    <td style="padding: 40px;">
      <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">
        Verify your email
      </h1>
      <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #4a4a4a;">
        Thanks for signing up! Please verify your email address to get full access to your ${APP_NAME} account.
      </p>
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center">
            <a href="${verifyUrl}" style="display: inline-block; padding: 14px 32px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 500; border-radius: 6px;">
              Verify Email Address
            </a>
          </td>
        </tr>
      </table>
      <p style="margin: 24px 0 0 0; font-size: 13px; color: #888888;">
        This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
      </p>
      <hr style="margin: 24px 0; border: none; border-top: 1px solid #eeeeee;">
      <p style="margin: 0; font-size: 12px; color: #aaaaaa;">
        Button not working? Copy and paste this link:<br>
        <a href="${verifyUrl}" style="color: #666666; word-break: break-all;">${verifyUrl}</a>
      </p>
    </td>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Verify your email - ${APP_NAME}`,
      html: emailWrapper(content, 'Please verify your email address to activate your account'),
    });

    if (error) {
      console.error('[Email] Verification email error:', error);
      throw new Error(error.message);
    }

    console.log(`[Email] Verification sent to ${email}, ID: ${data.id}`);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('[Email] Failed to send verification:', error);
    throw error;
  }
};

/**
 * Send welcome email after verification
 */
export const sendWelcomeEmail = async (email, firstName, madrasahName, madrasahSlug = '', role = 'admin') => {
  // Build the login URL based on role
  const loginUrl = madrasahSlug ? `${FRONTEND_URL}/${madrasahSlug}/login` : FRONTEND_URL;

  // Customize content based on role
  const isTeacher = role === 'teacher';
  const quickStartItems = isTeacher
    ? `<li>View your assigned classes</li>
       <li>Take daily attendance</li>
       <li>Record exam scores and grades</li>
       <li>Track student progress</li>`
    : `<li>Set up your academic sessions and semesters</li>
       <li>Create classes and assign teachers</li>
       <li>Add students (individually or bulk upload)</li>
       <li>Start tracking attendance and exam performance</li>`;

  if (!isEmailEnabled()) {
    console.log('\n=== WELCOME EMAIL (Console) ===');
    console.log(`To: ${email}`);
    console.log(`Welcome ${firstName} to ${madrasahName}!`);
    console.log(`Role: ${role}`);
    console.log(`Login URL: ${loginUrl}`);
    console.log('===============================\n');
    return { success: true };
  }

  const content = `
    <td style="padding: 40px;">
      <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">
        Welcome to ${APP_NAME}! 🎉
      </h1>
      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #4a4a4a;">
        Hi ${firstName},
      </p>
      <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #4a4a4a;">
        Your email has been verified and you now have full access to <strong>${madrasahName}</strong> on ${APP_NAME}.
      </p>
      <div style="background: #f9fafb; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
          Quick Start Guide:
        </h3>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #4a4a4a;">
          ${quickStartItems}
        </ul>
      </div>
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center">
            <a href="${loginUrl}" style="display: inline-block; padding: 14px 32px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 500; border-radius: 6px;">
              Go to Login
            </a>
          </td>
        </tr>
      </table>
      <p style="margin: 24px 0 0 0; font-size: 13px; color: #888888;">
        Need help? Reply to this email and we'll be happy to assist.
      </p>
    </td>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Welcome to ${APP_NAME}! Your account is ready`,
      html: emailWrapper(content, `Welcome ${firstName}! Your ${madrasahName} account is now active.`),
    });

    if (error) {
      console.error('[Email] Welcome email error:', error);
      return { success: false };
    }

    console.log(`[Email] Welcome sent to ${email}, ID: ${data.id}`);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('[Email] Failed to send welcome:', error);
    return { success: false };
  }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email, resetToken, role) => {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}&role=${role}`;

  if (!isEmailEnabled()) {
    console.log('\n=== PASSWORD RESET EMAIL (Console) ===');
    console.log(`To: ${email}`);
    console.log(`Role: ${role}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log('======================================\n');
    return { success: true, messageId: 'console-log' };
  }

  const content = `
    <td style="padding: 40px;">
      <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">
        Reset your password
      </h1>
      <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #4a4a4a;">
        We received a request to reset your password for your ${APP_NAME} ${role} account. Click the button below to create a new password.
      </p>
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center">
            <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 500; border-radius: 6px;">
              Reset Password
            </a>
          </td>
        </tr>
      </table>
      <p style="margin: 24px 0 0 0; font-size: 13px; color: #e53e3e; font-weight: 500;">
        ⚠️ This link expires in 1 hour.
      </p>
      <p style="margin: 12px 0 0 0; font-size: 13px; color: #888888;">
        If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
      </p>
      <hr style="margin: 24px 0; border: none; border-top: 1px solid #eeeeee;">
      <p style="margin: 0; font-size: 12px; color: #aaaaaa;">
        Button not working? Copy and paste this link:<br>
        <a href="${resetUrl}" style="color: #666666; word-break: break-all;">${resetUrl}</a>
      </p>
    </td>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Reset your password - ${APP_NAME}`,
      html: emailWrapper(content, 'Reset your password - this link expires in 1 hour'),
    });

    if (error) {
      console.error('[Email] Password reset email error:', error);
      throw new Error(error.message);
    }

    console.log(`[Email] Password reset sent to ${email}, ID: ${data.id}`);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('[Email] Failed to send password reset:', error);
    throw error;
  }
};

/**
 * Send password change confirmation
 */
export const sendPasswordChangeConfirmation = async (email, role) => {
  if (!isEmailEnabled()) {
    console.log('\n=== PASSWORD CHANGE CONFIRMATION (Console) ===');
    console.log(`To: ${email}`);
    console.log(`Role: ${role}`);
    console.log('===============================================\n');
    return { success: true };
  }

  const content = `
    <td style="padding: 40px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; width: 56px; height: 56px; background: #dcfce7; border-radius: 50%; line-height: 56px; font-size: 28px;">
          ✓
        </div>
      </div>
      <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #1a1a1a; text-align: center;">
        Password changed successfully
      </h1>
      <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #4a4a4a; text-align: center;">
        Your ${APP_NAME} ${role} account password has been successfully updated.
      </p>
      <div style="background: #fef3c7; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>Didn't make this change?</strong><br>
          If you didn't change your password, please contact us immediately as your account may have been compromised.
        </p>
      </div>
      <p style="margin: 0; font-size: 13px; color: #888888; text-align: center;">
        This is an automated security notification.
      </p>
    </td>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Password changed - ${APP_NAME}`,
      html: emailWrapper(content, 'Your password has been successfully changed'),
    });

    if (error) {
      console.error('[Email] Password confirmation error:', error);
      return { success: false };
    }

    console.log(`[Email] Password confirmation sent to ${email}, ID: ${data.id}`);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('[Email] Failed to send password confirmation:', error);
    return { success: false };
  }
};

/**
 * Send trial expiring reminder
 */
export const sendTrialExpiringEmail = async (email, firstName, madrasahName, daysLeft) => {
  if (!isEmailEnabled()) {
    console.log('\n=== TRIAL EXPIRING (Console) ===');
    console.log(`To: ${email}`);
    console.log(`Days left: ${daysLeft}`);
    console.log('================================\n');
    return { success: true };
  }

  const urgencyColor = daysLeft <= 1 ? '#dc2626' : daysLeft <= 3 ? '#ea580c' : '#1a1a1a';

  const content = `
    <td style="padding: 40px;">
      <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">
        Your trial ends ${daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`}
      </h1>
      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #4a4a4a;">
        Hi ${firstName},
      </p>
      <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #4a4a4a;">
        Your free trial for <strong>${madrasahName}</strong> on ${APP_NAME} is coming to an end.
      </p>
      <div style="background: #f9fafb; border-left: 4px solid ${urgencyColor}; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; color: #4a4a4a;">
          <strong style="color: ${urgencyColor};">${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining</strong><br>
          Subscribe now to keep your data and continue using all features.
        </p>
      </div>
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center">
            <a href="${FRONTEND_URL}" style="display: inline-block; padding: 14px 32px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 500; border-radius: 6px;">
              Subscribe Now
            </a>
          </td>
        </tr>
      </table>
      <p style="margin: 24px 0 0 0; font-size: 13px; color: #888888;">
        Questions? Reply to this email and we'll help you choose the right plan.
      </p>
    </td>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Your ${APP_NAME} trial ends ${daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`}`,
      html: emailWrapper(content, `Don't lose access - your trial ends ${daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`}`),
    });

    if (error) {
      console.error('[Email] Trial expiring email error:', error);
      return { success: false };
    }

    console.log(`[Email] Trial expiring sent to ${email}, ID: ${data.id}`);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('[Email] Failed to send trial expiring:', error);
    return { success: false };
  }
};
