import { useState, useEffect } from 'react';
import { Link, useSearchParams, useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { authService } from '../services/auth.service';
import './VerifyEmail.css';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const { madrasahSlug } = useParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');

  // Check if user is already logged in
  const isLoggedIn = authService.isAuthenticated();
  const user = authService.getCurrentUser();

  useEffect(() => {
    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    try {
      const response = await api.post('/auth/verify-email', { token });
      setStatus('success');
      setMessage(response.data.message || 'Your email has been verified successfully!');

      // Update local user data to reflect verified status
      if (isLoggedIn && user) {
        const updatedUser = { ...user, emailVerified: true };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.error || 'Verification failed. The link may have expired.');
    }
  };

  // Get the appropriate redirect path based on user role
  const getDashboardPath = () => {
    if (!isLoggedIn || !user) return null;
    return user.role === 'admin'
      ? `/${madrasahSlug}/admin`
      : `/${madrasahSlug}/teacher`;
  };

  const handleContinue = () => {
    const dashboardPath = getDashboardPath();
    if (dashboardPath) {
      navigate(dashboardPath);
    } else {
      navigate(`/${madrasahSlug}/login`);
    }
  };

  if (status === 'verifying') {
    return (
      <div className="verify-email-container">
        <div className="verify-email-card">
          <div className="loading-spinner"></div>
          <h2>Verifying your email...</h2>
          <p>Please wait while we verify your email address.</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="verify-email-container">
        <div className="verify-email-card">
          <div className="success-icon">✓</div>
          <h2>Email Verified!</h2>
          <p className="success-message">{message}</p>
          <p className="sub-message">You can now access all features of your account.</p>
          <button onClick={handleContinue} className="action-button primary">
            {isLoggedIn ? 'Go to Dashboard' : 'Go to Login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="verify-email-container">
      <div className="verify-email-card">
        <div className="error-icon">!</div>
        <h2>Verification Failed</h2>
        <p className="error-message">{message}</p>
        <div className="verify-actions">
          <Link to={`/${madrasahSlug}/login`} className="action-button primary">
            Go to Login
          </Link>
          <p className="help-text">
            If your link expired, you can request a new verification email from your dashboard after logging in.
          </p>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;
