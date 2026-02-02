import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import './ResetPassword.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const role = searchParams.get('role');

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState('');

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token || !role) {
        setError('Invalid reset link. Please request a new password reset.');
        setValidating(false);
        return;
      }

      try {
        const response = await api.get(`/password/validate-token?token=${token}&role=${role}`);
        if (response.data.valid) {
          setTokenValid(true);
        } else {
          setError('This reset link has expired. Please request a new password reset.');
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Invalid or expired reset link.');
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token, role]);

  const checkPasswordStrength = (password) => {
    if (password.length === 0) {
      return '';
    }
    if (password.length < 8) {
      return 'weak';
    }
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&#]/.test(password)) strength++;

    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'medium';
    return 'strong';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Check password strength
    if (name === 'newPassword') {
      setPasswordStrength(checkPasswordStrength(value));
    }

    // Clear messages when user types
    setMessage('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    // Validate passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/;
    if (!passwordRegex.test(formData.newPassword)) {
      setError('Password must contain uppercase, lowercase, number, and special character');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/password/reset-password', {
        token,
        role,
        newPassword: formData.newPassword,
      });
      
      setMessage(response.data.message);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while validating token
  if (validating) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="loading-spinner"></div>
          <p>Validating reset link...</p>
        </div>
      </div>
    );
  }

  // Show error if token is invalid
  if (!tokenValid) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="error-icon-large">✕</div>
          <h2>Invalid Reset Link</h2>
          <p className="error-text">{error}</p>
          <div className="reset-password-actions">
            <Link to="/forgot-password" className="action-button primary">
              Request New Reset Link
            </Link>
            <Link to="/login" className="action-button secondary">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show success message
  if (message) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="success-icon-large">✓</div>
          <h2>Password Reset Successful</h2>
          <p className="success-text">{message}</p>
          <p className="redirect-text">Redirecting to login page...</p>
        </div>
      </div>
    );
  }

  // Show reset password form
  return (
    <div className="reset-password-container">
      <div className="reset-password-card">
        <h2>Set New Password</h2>
        <p className="reset-password-description">
          Please enter your new password below.
        </p>

        {error && (
          <div className="error-message">
            <span className="error-icon">✕</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Enter new password"
              required
            />
            {passwordStrength && (
              <div className={`password-strength ${passwordStrength}`}>
                Password strength: <strong>{passwordStrength}</strong>
              </div>
            )}
            <div className="password-requirements">
              <p>Password must contain:</p>
              <ul>
                <li className={formData.newPassword.length >= 8 ? 'valid' : ''}>
                  At least 8 characters
                </li>
                <li className={/[A-Z]/.test(formData.newPassword) ? 'valid' : ''}>
                  One uppercase letter
                </li>
                <li className={/[a-z]/.test(formData.newPassword) ? 'valid' : ''}>
                  One lowercase letter
                </li>
                <li className={/\d/.test(formData.newPassword) ? 'valid' : ''}>
                  One number
                </li>
                <li className={/[@$!%*?&#]/.test(formData.newPassword) ? 'valid' : ''}>
                  One special character (@$!%*?&#)
                </li>
              </ul>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm new password"
              required
            />
            {formData.confirmPassword && (
              <div className={`password-match ${
                formData.newPassword === formData.confirmPassword ? 'valid' : 'invalid'
              }`}>
                {formData.newPassword === formData.confirmPassword 
                  ? '✓ Passwords match' 
                  : '✕ Passwords do not match'}
              </div>
            )}
          </div>

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="reset-password-footer">
          <Link to="/login" className="back-link">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
