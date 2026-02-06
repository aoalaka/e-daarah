import { useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { useMadrasah } from '../contexts/MadrasahContext';
import './Login.css';

function ParentLogin() {
  const { madrasahSlug } = useParams();
  const { madrasah } = useMadrasah();
  const [studentId, setStudentId] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.parentLogin(madrasahSlug, studentId, accessCode);
      navigate(`/${madrasahSlug}/parent`);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid student ID or access code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>{madrasah?.name || 'Parent Portal'}</h1>
          <p>View your child's report</p>
        </div>

        {madrasahSlug === 'demo' && (
          <div className="demo-hint">
            <strong>Demo Credentials:</strong>
            <div style={{ marginTop: '8px', fontSize: '0.9em' }}>
              <div>Student ID: <code>100001</code></div>
              <div>Access Code: <code>123456</code></div>
              <div style={{ marginTop: '4px', fontSize: '0.85em', opacity: 0.8 }}>
                (All demo students use access code 123456)
              </div>
            </div>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="studentId">Student ID</label>
            <input
              id="studentId"
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="e.g., 001"
              required
              autoComplete="username"
            />
          </div>

          <div className="field">
            <label htmlFor="accessCode">Access Code</label>
            <input
              id="accessCode"
              type="text"
              inputMode="numeric"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit code from your school"
              maxLength="6"
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'View Report'}
          </button>
        </form>

        <div className="login-links">
          <Link to={`/${madrasahSlug}/login`}>Teacher/Admin Login</Link>
          <span className="divider">|</span>
          <Link to="/">Back to Home</Link>
        </div>

        <div className="demo-info">
          <h4>How to Login</h4>
          <div className="credentials">
            <div className="cred">
              <div className="cred-label">Student ID</div>
              <div className="cred-value">Provided by the school</div>
            </div>
            <div className="cred">
              <div className="cred-label">Access Code</div>
              <div className="cred-value">6-digit code from the school</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ParentLogin;
