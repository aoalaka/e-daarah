# Forgot Password Feature - Implementation Guide

## Overview
Complete forgot password / password reset functionality for admins and teachers in the Madrasah Admin system.

## Features Implemented

### 1. Database Schema
**Migration File**: `database/migrations/002_add_password_reset.sql`

Added to both `admins` and `teachers` tables:
- `reset_token` VARCHAR(255) - Stores hashed reset token
- `reset_token_expires` DATETIME - Token expiration timestamp
- Indexes on `reset_token` for performance

### 2. Backend API Endpoints

**File**: `backend/src/routes/password.routes.js`

#### POST `/api/password/forgot-password`
Request password reset email
```json
{
  "email": "user@example.com",
  "role": "admin" | "teacher"
}
```

Response:
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

**Security Notes**:
- Always returns success message (prevents email enumeration attacks)
- Generates cryptographically secure token using `crypto.randomBytes(32)`
- Stores SHA-256 hashed token in database
- Token expires in 1 hour

#### POST `/api/password/reset-password`
Reset password with valid token
```json
{
  "token": "abc123...",
  "role": "admin" | "teacher",
  "newPassword": "NewSecure@Pass123"
}
```

Response:
```json
{
  "message": "Password has been reset successfully. You can now login with your new password."
}
```

**Validation**:
- Token must be valid and not expired
- Password minimum 8 characters
- Must contain: uppercase, lowercase, number, special character (@$!%*?&#)

#### GET `/api/password/validate-token?token=xxx&role=xxx`
Check if reset token is valid (before showing reset form)

Response:
```json
{
  "valid": true
}
```

### 3. Email Service

**File**: `backend/src/services/email.service.js`

**Functions**:
- `sendPasswordResetEmail(email, resetToken, role)` - Sends HTML email with reset link
- `sendPasswordChangeConfirmation(email, role)` - Sends confirmation after password change

**Email Configuration**:
- Production: Real SMTP server (Gmail, SendGrid, etc.)
- Development: Ethereal Email (test account) or console logging
- HTML templates with professional styling

**Environment Variables** (in `.env`):
```env
# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:3000

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@madrasah.com

# Development testing
ETHEREAL_USER=
ETHEREAL_PASS=
```

### 4. Frontend Components

#### ForgotPassword Component
**File**: `frontend/src/pages/ForgotPassword.jsx`

**Route**: `/:madrasahSlug/forgot-password`

**Features**:
- Email input field
- Role selection (admin/teacher)
- Success/error message display
- Link back to login

#### ResetPassword Component
**File**: `frontend/src/pages/ResetPassword.jsx`

**Route**: `/:madrasahSlug/reset-password?token=xxx&role=xxx`

**Features**:
- Token validation on page load
- New password input with strength indicator
- Confirm password validation
- Real-time password requirements checklist:
  - ✓ At least 8 characters
  - ✓ One uppercase letter
  - ✓ One lowercase letter
  - ✓ One number
  - ✓ One special character
- Auto-redirect to login after successful reset
- Expired/invalid token handling

### 5. Login Page Update

**File**: `frontend/src/pages/Login.jsx`

Added "Forgot password?" link below login button

### 6. Routing

**File**: `frontend/src/App.jsx`

Added routes:
```jsx
<Route path="forgot-password" element={<ForgotPassword />} />
<Route path="reset-password" element={<ResetPassword />} />
```

## Setup Instructions

### 1. Run Database Migration
```bash
# Option 1: Run migration script directly
docker exec madrasah-mysql mysql -uroot -proot_password madrasah_admin < database/migrations/002_add_password_reset.sql

# Option 2: Apply manually via SQL client
# Execute contents of 002_add_password_reset.sql
```

### 2. Install Dependencies
```bash
cd backend
npm install nodemailer
```

### 3. Configure Email Service

#### For Development (Ethereal Email)
1. Visit https://ethereal.email
2. Create test account
3. Add credentials to `backend/.env`:
```env
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
ETHEREAL_USER=your-test@ethereal.email
ETHEREAL_PASS=your-test-password
```

#### For Production (Gmail Example)
1. Enable 2-factor authentication on Gmail
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Add to `backend/.env`:
```env
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
EMAIL_FROM=noreply@yourdomain.com
```

### 4. Rebuild and Deploy

**Docker**:
```bash
docker-compose build backend frontend
docker-compose up -d
```

**Local Development**:
```bash
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run dev
```

## User Flow

### Forgot Password Flow
1. User clicks "Forgot password?" on login page
2. Selects role (admin/teacher) and enters email
3. System:
   - Generates secure reset token
   - Stores hashed token in database with 1-hour expiration
   - Sends email with reset link
4. User receives email with link: `/reset-password?token=xxx&role=xxx`
5. User clicks link and is redirected to reset password page
6. User enters new password (validated in real-time)
7. Upon submission:
   - Token validated (not expired)
   - Password updated
   - Confirmation email sent
   - User redirected to login

### Security Features
- **Token Security**: 32-byte cryptographically secure tokens, hashed with SHA-256
- **Time Limitation**: Tokens expire after 1 hour
- **Single Use**: Token cleared from database after successful reset
- **Email Enumeration Prevention**: Same response whether email exists or not
- **Password Strength**: Enforced minimum requirements
- **Rate Limiting**: Consider adding rate limiting to prevent abuse (not yet implemented)

## Testing

### Test Forgot Password
1. Go to `http://localhost:3000/demo/forgot-password`
2. Select role and enter: `admin@demo.com` or `teacher1@demo.com`
3. Check console logs (dev mode) or email inbox (production)
4. Copy reset link from email

### Test Reset Password
1. Click reset link or manually visit: `http://localhost:3000/demo/reset-password?token=xxx&role=admin`
2. Enter new password meeting requirements
3. Submit and verify redirect to login
4. Login with new password

### Test Invalid Token
1. Visit reset password page with invalid/expired token
2. Should show error message with option to request new link

## Email Templates

### Password Reset Email
- **Subject**: "Password Reset Request - Madrasah Admin"
- **Content**: HTML formatted with reset button and link
- **Expiration**: Shows 1-hour expiration warning
- **Security Note**: Mentions to ignore if not requested

### Password Change Confirmation
- **Subject**: "Password Changed Successfully - Madrasah Admin"
- **Content**: Confirms password was changed
- **Security Alert**: Advises to contact support if unauthorized

## Troubleshooting

### Email Not Sending
- Check SMTP credentials in `.env`
- Verify SMTP_PORT (587 for TLS, 465 for SSL)
- Check console logs for nodemailer errors
- For Gmail: Ensure App Password is used (not regular password)

### Token Invalid/Expired
- Tokens expire after 1 hour
- Token cleared after successful reset
- Check database: `SELECT reset_token, reset_token_expires FROM admins/teachers`

### Frontend Not Loading
- Ensure routes added to App.jsx
- Check browser console for import errors
- Verify CSS files exist

## Future Enhancements

1. **Rate Limiting**: Prevent abuse by limiting requests per IP/email
2. **2FA Integration**: Optional two-factor authentication
3. **Password History**: Prevent reusing recent passwords
4. **Email Queue**: Use Redis/Bull for reliable email delivery
5. **Audit Logging**: Log password reset attempts
6. **Notification Preferences**: Allow users to opt-in/out of confirmation emails

## Files Modified/Created

**Backend**:
- ✅ `backend/src/routes/password.routes.js` (NEW)
- ✅ `backend/src/services/email.service.js` (NEW)
- ✅ `backend/src/server.js` (UPDATED - added password routes)
- ✅ `backend/.env.example` (UPDATED - added email config)

**Frontend**:
- ✅ `frontend/src/pages/ForgotPassword.jsx` (NEW)
- ✅ `frontend/src/pages/ForgotPassword.css` (NEW)
- ✅ `frontend/src/pages/ResetPassword.jsx` (NEW)
- ✅ `frontend/src/pages/ResetPassword.css` (NEW)
- ✅ `frontend/src/App.jsx` (UPDATED - added routes)
- ✅ `frontend/src/pages/Login.jsx` (UPDATED - added link)
- ✅ `frontend/src/pages/Login.css` (UPDATED - added styles)

**Database**:
- ✅ `database/migrations/002_add_password_reset.sql` (NEW)

**Documentation**:
- ✅ `FORGOT_PASSWORD_IMPLEMENTATION.md` (THIS FILE)

---
**Last Updated**: February 2, 2026  
**Status**: ✅ Fully Implemented - Ready for Testing
