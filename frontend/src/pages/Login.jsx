import { useState } from 'react';
import { useNavigate, Link, useParams, useLocation } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { useMadrasah } from '../contexts/MadrasahContext';
import { getAccountLockInfo } from '../utils/errorHandler';
import './Login.css';

function Login() {
  const { madrasahSlug } = useParams();
  const { madrasah } = useMadrasah();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('teacher');
  const [error, setError] = useState(location.state?.message || '');
  const [lockInfo, setLockInfo] = useState(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLockInfo(null);
    setAttemptsRemaining(null);
    setLoading(true);

    try {
      await authService.login(madrasahSlug, email, password, role);
      navigate(role === 'admin' ? `/${madrasahSlug}/admin` : `/${madrasahSlug}/teacher`);
    } catch (err) {
      const lockStatus = getAccountLockInfo(err);
      if (lockStatus.locked) {
        setLockInfo(lockStatus);
        setError('');
      } else {
        setError(err.response?.data?.error || 'Invalid email or password');
        // Show remaining attempts if provided
        if (err.response?.data?.attemptsRemaining !== undefined) {
          setAttemptsRemaining(err.response.data.attemptsRemaining);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>{madrasah?.name || 'Madrasah Admin'}</h1>
          <p>Sign in to your account</p>
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

        {madrasahSlug === 'demo' && (
          <div className="demo-hint">
            <strong>Demo Credentials:</strong>
            <div style={{ marginTop: '8px', fontSize: '0.9em' }}>
              {role === 'admin' ? (
                <div>
                  <div>Email: <code>admin@demo.com</code></div>
                  <div>Password: <code>demo123</code></div>
                </div>
              ) : (
                <div>
                  <div>Email: <code>teacher1@demo.com</code></div>
                  <div>Password: <code>demo123</code></div>
                </div>
              )}
            </div>
          </div>
        )}

        {lockInfo && (
          <div className="error-message lockout-message">
            <strong>Account Temporarily Locked</strong>
            <p>{lockInfo.message}</p>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {attemptsRemaining !== null && attemptsRemaining <= 2 && (
          <div className="warning-message">
            Warning: {attemptsRemaining} login attempt{attemptsRemaining !== 1 ? 's' : ''} remaining before account lockout.
          </div>
        )}

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

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                autoComplete="current-password"
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
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="forgot-password-link">
          <Link to={`/${madrasahSlug}/forgot-password`}>Forgot password?</Link>
        </div>

        {role === 'teacher' && (
          <div className="login-footer">
            New teacher? <Link to={`/${madrasahSlug}/register-teacher`}>Create account</Link>
          </div>
        )}

        <div className="login-links">
          <Link to={`/${madrasahSlug}/parent-login`}>Parent Login</Link>
          <span className="divider">|</span>
          <Link to="/">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
