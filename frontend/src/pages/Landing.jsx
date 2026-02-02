import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import './Landing.css';

function Landing() {
  const navigate = useNavigate();
  const [madrasahUrl, setMadrasahUrl] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const features = [
    { number: '01', title: 'Attendance', description: 'Track daily attendance with behavior and dressing grades' },
    { number: '02', title: 'Reports', description: 'Comprehensive student performance reports for parents' },
    { number: '03', title: 'Exams', description: 'Record and analyze Quran and Islamic studies performance' },
    { number: '04', title: 'Analytics', description: 'Identify students who need extra attention' }
  ];

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
      <div className="landing-container">
        {/* Header */}
        <header className="landing-header">
          <Link to="/" className="logo">e-daarah</Link>
          <nav className="header-nav">
            <Link to="/register" className="header-link">Register Madrasah</Link>
            <Link to="/demo/login" className="header-link primary">Demo</Link>
          </nav>
        </header>

        {/* Hero */}
        <section className="hero">
          <h1 className="hero-title">Madrasah Management</h1>
          <p className="hero-subtitle">
            Built for madrasahs. Completely free.
          </p>

          {/* Value Props */}
          <div className="value-props">
            <div className="value-prop">
              <span className="value-label">Simple</span>
              <span className="value-desc">No complexity, just what you need</span>
            </div>
            <div className="value-prop">
              <span className="value-label">Efficient</span>
              <span className="value-desc">Save time on administration</span>
            </div>
            <div className="value-prop">
              <span className="value-label">Free</span>
              <span className="value-desc">Always free for every madrasah</span>
            </div>
          </div>

          {/* Madrasah Finder */}
          <div className="madrasah-finder">
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
              <button type="submit" className="finder-btn" disabled={searching}>
                {searching ? 'Finding...' : 'Go'}
              </button>
            </form>
            {error && <p className="finder-error">{error}</p>}
          </div>

          <div className="hero-actions">
            <button onClick={() => navigate('/register')} className="hero-btn primary">
              Register Your Madrasah
            </button>
            <button onClick={() => navigate('/demo/login')} className="hero-btn secondary">
              Try Demo
            </button>
          </div>
        </section>

        {/* How it Works */}
        <section className="portals">
          <p className="section-label">How It Works</p>
          <h2 className="section-title">Get Started in 3 Steps</h2>
          <div className="portals-grid">
            <div className="portal-card" onClick={() => navigate('/register')}>
              <div className="portal-marker">1</div>
              <div className="portal-content">
                <h3 className="portal-title">Register Your Madrasah</h3>
                <p className="portal-description">Create an account for your madrasah in minutes</p>
              </div>
              <span className="portal-arrow">→</span>
            </div>
            <div className="portal-card">
              <div className="portal-marker">2</div>
              <div className="portal-content">
                <h3 className="portal-title">Set Up Classes</h3>
                <p className="portal-description">Add teachers, classes, and enroll students</p>
              </div>
            </div>
            <div className="portal-card">
              <div className="portal-marker">3</div>
              <div className="portal-content">
                <h3 className="portal-title">Start Tracking</h3>
                <p className="portal-description">Record attendance, grades, and generate reports</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="features">
          <p className="section-label">Features</p>
          <h2 className="section-title">Everything Your Madrasah Needs</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature">
                <div className="feature-number">{feature.number}</div>
                <h4>{feature.title}</h4>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <p className="footer-text">2026 e-daarah</p>
          <div className="footer-links">
            <Link to="/register" className="footer-link">Register</Link>
            <Link to="/demo/login" className="footer-link">Demo</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Landing;
