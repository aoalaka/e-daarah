import { useState, useEffect } from 'react';
import api from '../services/api';
import './EmailVerificationBanner.css';

function EmailVerificationBanner() {
  const [emailVerified, setEmailVerified] = useState(true); // Default to true to avoid flash
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const response = await api.get('/auth/verification-status');
      setEmailVerified(response.data.emailVerified);
    } catch (error) {
      console.error('Failed to check verification status:', error);
      // If we can't check, assume verified to avoid blocking
      setEmailVerified(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setSending(true);
    try {
      await api.post('/auth/send-verification');
      setSent(true);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      alert(error.response?.data?.error || 'Failed to send verification email');
    } finally {
      setSending(false);
    }
  };

  // Don't show banner if loading, verified, dismissed, or demo account
  const userStr = localStorage.getItem('user');
  const isDemo = userStr ? JSON.parse(userStr)?.isDemo : false;
  if (loading || emailVerified || dismissed || isDemo) {
    return null;
  }

  return (
    <div className="verification-banner">
      <div className="verification-content">
        <span className="verification-icon">!</span>
        <div className="verification-text">
          <strong>Verify your email</strong>
          <span>Please check your inbox and verify your email address to unlock all features.</span>
        </div>
      </div>
      <div className="verification-actions">
        {sent ? (
          <span className="verification-sent">Email sent! Check your inbox.</span>
        ) : (
          <button
            className="verification-resend"
            onClick={handleResendVerification}
            disabled={sending}
          >
            {sending ? 'Sending...' : 'Resend Email'}
          </button>
        )}
        <button
          className="verification-dismiss"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

export default EmailVerificationBanner;
