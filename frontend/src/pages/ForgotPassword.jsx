import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import { useMadrasah } from '../contexts/MadrasahContext';
import './Login.css';

function ForgotPassword() {
  useEffect(() => { document.title = 'Forgot Password — e-Daarah'; }, []);
  const { madrasahSlug } = useParams();
  const { madrasah } = useMadrasah();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('teacher');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/password/forgot-password', { email, role, madrasahSlug });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <h1>Check your email</h1>
            <p>We've sent a password reset link to {email}</p>
          </div>

          <div className="success-box">
            <p>Click the link in the email to reset your password. If you don't see it, check your spam folder.</p>
          </div>

          <div className="login-links" style={{ marginTop: 'var(--lg)' }}>
            <Link to={`/${madrasahSlug}/login`}>← Back to Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>{madrasah?.name || 'Reset Password'}</h1>
          <p>Enter your email to receive a reset link</p>
        </div>

        <div className="role-toggle">
          <button
            type="button"
            className={role === 'teacher' ? 'active' : ''}
            onClick={() => setRole('teacher')}
          >
            Teacher
          </button>
          <button
            type="button"
            className={role === 'admin' ? 'active' : ''}
            onClick={() => setRole('admin')}
          >
            Admin
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="login-links" style={{ marginTop: 'var(--lg)' }}>
          <Link to={`/${madrasahSlug}/login`}>← Back to Login</Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
