import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import './Landing.css';

function Landing() {
  const navigate = useNavigate();
  const [madrasahUrl, setMadrasahUrl] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const handleFindMadrasah = async (e) => {
    e.preventDefault();
    if (!madrasahUrl.trim()) return;

    setSearching(true);
    setError('');

    const slug = madrasahUrl.toLowerCase().replace(/[^a-z0-9-]/g, '');

    try {
      await api.get(`/auth/madrasah/${slug}`);
      navigate(`/${slug}/login`);
    } catch (err) {
      setError('Madrasah not found. Check the URL or register a new one.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="landing">
      {/* Header */}
      <header className="landing-header">
        <Link to="/" className="logo">e-daarah</Link>
        <nav className="header-nav">
          <Link to="/demo/login" className="nav-link">Demo</Link>
          <Link to="/register" className="nav-link primary">Get Started</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="hero">
        <p className="hero-arabic">نظام إدارة ذكي للمدارس الدينية</p>
        <h1 className="hero-title">Smart Madrasah Management</h1>
        <p className="hero-subtitle">
          Attendance, reports, and student progress tracking for Islamic schools.
        </p>

        <div className="hero-actions">
          <button onClick={() => navigate('/register')} className="btn primary">
            Start Free Trial
          </button>
          <button onClick={() => navigate('/demo/login')} className="btn secondary">
            View Demo
          </button>
        </div>
      </section>

      {/* Finder */}
      <section className="finder">
        <p className="finder-label">Already have an account?</p>
        <form onSubmit={handleFindMadrasah} className="finder-form">
          <div className="finder-input-group">
            <span className="finder-prefix">e-daarah.com/</span>
            <input
              type="text"
              value={madrasahUrl}
              onChange={(e) => setMadrasahUrl(e.target.value)}
              placeholder="your-madrasah"
              className="finder-input"
            />
          </div>
          <button type="submit" className="btn primary" disabled={searching}>
            {searching ? 'Finding...' : 'Go'}
          </button>
        </form>
        {error && <p className="finder-error">{error}</p>}
      </section>

      {/* Features */}
      <section className="features">
        <h2 className="section-title">What You Get</h2>

        <div className="feature-list">
          <div className="feature">
            <h3>Attendance Tracking</h3>
            <p>Daily attendance with behavior and dressing grades</p>
          </div>
          <div className="feature">
            <h3>Parent Reports</h3>
            <p>Parents can view their child's progress anytime</p>
          </div>
          <div className="feature">
            <h3>Exam Records</h3>
            <p>Track Quran memorization and Islamic studies</p>
          </div>
          <div className="feature">
            <h3>Multi-User Access</h3>
            <p>Separate portals for admins, teachers, and parents</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="pricing">
        <h2 className="section-title">Pricing</h2>
        <p className="section-subtitle">Start with a 14-day free trial</p>

        <div className="pricing-cards">
          <div className="pricing-card">
            <h3>Starter</h3>
            <div className="price">$29<span>/month</span></div>
            <ul>
              <li>Up to 50 students</li>
              <li>3 teacher accounts</li>
              <li>Basic reports</li>
              <li>Email support</li>
            </ul>
            <button onClick={() => navigate('/register')} className="btn secondary">
              Start Trial
            </button>
          </div>

          <div className="pricing-card featured">
            <h3>Professional</h3>
            <div className="price">$79<span>/month</span></div>
            <ul>
              <li>Up to 200 students</li>
              <li>10 teacher accounts</li>
              <li>Advanced analytics</li>
              <li>Priority support</li>
            </ul>
            <button onClick={() => navigate('/register')} className="btn primary">
              Start Trial
            </button>
          </div>

          <div className="pricing-card">
            <h3>Enterprise</h3>
            <div className="price">Custom</div>
            <ul>
              <li>Unlimited students</li>
              <li>Unlimited teachers</li>
              <li>API access</li>
              <li>Dedicated support</li>
            </ul>
            <button onClick={() => navigate('/register')} className="btn secondary">
              Contact Us
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="logo">e-daarah</span>
            <p>نظام إدارة المدارس الذكي</p>
          </div>
          <div className="footer-links">
            <Link to="/demo/login">Demo</Link>
            <Link to="/register">Register</Link>
            <a href="#pricing">Pricing</a>
          </div>
        </div>
        <p className="copyright">© 2026 e-daarah</p>
      </footer>
    </div>
  );
}

export default Landing;
