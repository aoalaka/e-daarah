import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import api from '../services/api';
import './Login.css';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const { madrasahSlug } = useParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const role = searchParams.get('role');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    validateToken();
  }, [token, role]);

  const validateToken = async () => {
    if (!token || !role) {
      setError('Invalid reset link');
      setValidating(false);
      return;
    }

    try {
      const response = await api.get(`/password/validate-token?token=${token}&role=${role}`);
      setTokenValid(response.data.valid);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired reset link');
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/;
    if (!passwordRegex.test(newPassword)) {
      setError('Password must contain uppercase, lowercase, number, and special character');
      return;
    }

    setLoading(true);
    try {
      await api.post('/password/reset-password', { token, role, newPassword });
      setSuccess(true);
      setTimeout(() => {
        navigate(madrasahSlug ? `/${madrasahSlug}/login` : '/');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (validating) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <h1>Validating...</h1>
            <p>Please wait while we verify your reset link</p>
          </div>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!tokenValid) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <h1>Invalid Link</h1>
            <p>{error || 'This reset link is invalid or has expired'}</p>
          </div>

          <div className="login-links" style={{ marginTop: 'var(--lg)' }}>
            <Link to={madrasahSlug ? `/${madrasahSlug}/forgot-password` : '/'}>
              Request New Reset Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <h1>Password Reset</h1>
            <p>Your password has been successfully reset</p>
          </div>

          <div className="success-box">
            <p>Redirecting to login page...</p>
          </div>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>Set New Password</h1>
          <p>Enter your new password below</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="newPassword">New Password</label>
            <div className="password-input-wrapper">
              <input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="field-hint">
              Must contain uppercase, lowercase, number, and special character
            </p>
          </div>

          <div className="field">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="password-input-wrapper">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="field-error">Passwords do not match</p>
            )}
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="login-links" style={{ marginTop: 'var(--lg)' }}>
          <Link to={madrasahSlug ? `/${madrasahSlug}/login` : '/'}>← Back to Login</Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
