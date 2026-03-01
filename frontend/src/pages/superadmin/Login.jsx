import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './SuperAdmin.css';

// Check if we're on the admin subdomain
const isAdminSubdomain = () => window.location.hostname.startsWith('admin.');

function SuperAdminLogin() {
  useEffect(() => { document.title = 'Admin Login — e-Daarah'; }, []);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/superadmin/login', { email, password });
      localStorage.setItem('superAdminToken', response.data.token);
      localStorage.setItem('superAdmin', JSON.stringify(response.data.user));
      // Navigate based on subdomain
      navigate(isAdminSubdomain() ? '/dashboard' : '/superadmin/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="superadmin-login">
      <div className="login-card">
        <div className="login-logo">
          <img src="/e-daarah-whitebg-logo.png" alt="e-Daarah" className="login-logo-img" />
          <span className="login-logo-text">e-Daarah</span>
        </div>
        <h1>Platform Admin</h1>
        <p className="subtitle">Management Console</p>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <a href="https://www.e-daarah.com" className="home-link">
            ← Back to e-daarah.com
          </a>
        </div>
      </div>
    </div>
  );
}

export default SuperAdminLogin;
