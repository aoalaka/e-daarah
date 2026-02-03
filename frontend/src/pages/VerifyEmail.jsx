import { useState, useEffect } from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import api from '../services/api';
import './VerifyEmail.css';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const { madrasahSlug } = useParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');

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
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.error || 'Verification failed. The link may have expired.');
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
          <Link to={`/${madrasahSlug}/login`} className="action-button primary">
            Go to Login
          </Link>
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
