// Email service for password reset functionality
// Currently using console logging for development
// To enable actual email sending, install nodemailer: npm install nodemailer
// Then uncomment the nodemailer implementation at the bottom of this file

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} resetToken - Password reset token
 * @param {string} role - User role (admin/teacher)
 * @returns {Promise}
 */
export const sendPasswordResetEmail = async (email, resetToken, role) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&role=${role}`;
  
  // Log to console (for development)
  console.log('\n=== PASSWORD RESET EMAIL ===');
  console.log(`To: ${email}`);
  console.log(`Role: ${role}`);
  console.log(`Reset URL: ${resetUrl}`);
  console.log(`Token expires in: 1 hour`);
  console.log('============================\n');
  
  return { success: true, messageId: 'console-log' };
};

/**
 * Send password change confirmation email
 * @param {string} email - Recipient email
 * @param {string} role - User role (admin/teacher)
 * @returns {Promise}
 */
export const sendPasswordChangeConfirmation = async (email, role) => {
  // Log to console (for development)
  console.log('\n=== PASSWORD CHANGE CONFIRMATION ===');
  console.log(`To: ${email}`);
  console.log(`Role: ${role}`);
  console.log('Password was successfully changed.');
  console.log('====================================\n');
  
  return { success: true };
};

/* 
// Uncomment this section to enable actual email sending via nodemailer
// First run: npm install nodemailer

import nodemailer from 'nodemailer';

const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    return nodemailer.createTransporter({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.ETHEREAL_USER || 'test@ethereal.email',
        pass: process.env.ETHEREAL_PASS || 'test',
      },
    });
  }
};

export const sendPasswordResetEmail = async (email, resetToken, role) => {
  const transporter = createTransporter();
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&role=${role}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@madrasah.com',
    to: email,
    subject: 'Password Reset Request - Madrasah Admin',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4a5568; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f7fafc; }
          .button { display: inline-block; padding: 12px 30px; background-color: #4299e1; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { color: #e53e3e; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>We received a request to reset your password for your Madrasah Admin ${role} account.</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link: ${resetUrl}</p>
            <p class="warning">This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    if (process.env.NODE_ENV !== 'production') {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send password reset email');
  }
};

export const sendPasswordChangeConfirmation = async (email, role) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@madrasah.com',
    to: email,
    subject: 'Password Changed Successfully - Madrasah Admin',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #48bb78; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f7fafc; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Changed Successfully</h1>
          </div>
          <div class="content">
            <p>Your password for your Madrasah Admin ${role} account has been successfully changed.</p>
            <p>If you did not make this change, please contact support immediately.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false };
  }
};
*/
