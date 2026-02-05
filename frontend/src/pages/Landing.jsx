import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import './Landing.css';

function Landing() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await api.get(`/auth/madrasahs/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(response.data);
        setShowResults(true);
      } catch (err) {
        console.error('Search error:', err);
        if (err.response?.status === 429) {
          // Rate limit hit - show a friendly message
          setSearchResults([]);
        } else {
          setSearchResults([]);
        }
      } finally {
        setSearching(false);
      }
    }, 500); // Increased from 300ms to 500ms

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectMadrasah = (madrasah) => {
    setShowResults(false);
    setSearchQuery('');
    navigate(`/${madrasah.slug}/login`);
  };

  return (
    <div className="landing">
      {/* Header */}
      <header className="landing-header">
        <Link to="/" className="logo">
          <img src="/e-daarah-whitebg-logo.png" alt="e-daarah" className="logo-img" />
          <span className="logo-text">e-daarah</span>
        </Link>
        <nav className="header-nav">
          <Link to="/pricing" className="nav-link">Pricing</Link>
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
        <div className="finder-search" ref={searchRef}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder="Search your madrasah or school name..."
            className="finder-input"
          />
          {searching && <span className="finder-loading">Searching...</span>}
          {showResults && searchResults.length > 0 && (
            <ul className="finder-results">
              {searchResults.map((madrasah) => (
                <li key={madrasah.id} onClick={() => handleSelectMadrasah(madrasah)}>
                  <span className="result-name">{madrasah.name}</span>
                  <span className="result-slug">e-daarah.com/{madrasah.slug}</span>
                </li>
              ))}
            </ul>
          )}
          {showResults && searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
            <div className="finder-no-results">
              No madrasah found. <Link to="/register">Register a new one</Link>
            </div>
          )}
        </div>
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
        <p className="section-subtitle">Start with a 14-day free trial. No credit card required.</p>

        <div className="pricing-cards">
          <div className="pricing-card">
            <h3>Standard</h3>
            <div className="price">$12<span>/month</span></div>
            <ul>
              <li>Up to 75 students</li>
              <li>Up to 5 teachers</li>
              <li>Attendance tracking</li>
              <li>Parent portal</li>
              <li>Email support</li>
            </ul>
            <button onClick={() => navigate('/register')} className="btn secondary">
              Start Trial
            </button>
          </div>

          <div className="pricing-card featured">
            <h3>Plus</h3>
            <div className="price">$29<span>/month</span></div>
            <ul>
              <li>Up to 300 students</li>
              <li>Up to 20 teachers</li>
              <li>Everything in Standard</li>
              <li>CSV/Excel exports</li>
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
              <li>Custom integrations</li>
              <li>Dedicated support</li>
              <li>SLA guarantee</li>
            </ul>
            <a href="mailto:support@e-daarah.com?subject=Enterprise%20Plan%20Inquiry" className="btn secondary enterprise-btn">
              Contact Us
            </a>
          </div>
        </div>

        <p className="pricing-cta">
          <Link to="/pricing" className="pricing-link">See full plan comparison →</Link>
        </p>

        <div className="regional-discount">
          <p className="discount-text">
            <strong>50% off Plus plan for schools in Australia & New Zealand</strong>
          </p>
          <p className="discount-subtext">
            Contact us at <a href="mailto:support@e-daarah.com?subject=NZ/AU%20Plus%20Discount%20Request">support@e-daarah.com</a> for your coupon code.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src="/e-daarah-whitebg-logo.png" alt="e-daarah" className="footer-logo-img" />
              <span className="footer-logo-text">e-daarah</span>
            </div>
            <p>نظام إدارة المدارس الذكي</p>
          </div>
          <div className="footer-links">
            <Link to="/demo/login">Demo</Link>
            <Link to="/register">Register</Link>
            <a href="#pricing">Pricing</a>
            <Link to="/help">Help</Link>
          </div>
          <div className="footer-links">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <a href="mailto:support@e-daarah.com">Contact</a>
          </div>
        </div>
        <p className="copyright">© 2026 e-daarah</p>
      </footer>
    </div>
  );
}

export default Landing;
