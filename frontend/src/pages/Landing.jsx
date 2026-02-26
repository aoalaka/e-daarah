import { useNavigate, Link } from 'react-router-dom';
import SEO from '../components/SEO';
import './Landing.css';

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      <SEO
        title="e-Daarah — School Management for Madrasahs & Islamic Schools"
        description="Simple admin system for madrasahs, Islamic schools, and weekend programs. Track attendance, record exams, grade conduct, and keep parents informed."
      />
      {/* Header */}
      <header className="landing-header">
        <Link to="/" className="logo">
          <img src="/e-daarah-whitebg-logo.png" alt="e-Daarah" className="logo-img" />
          <span className="logo-text">e-Daarah</span>
        </Link>
        <nav className="header-nav">
          <Link to="/pricing" className="nav-link">Pricing</Link>
          <Link to="/demo" className="nav-link">Demo</Link>
          <Link to="/register" className="nav-link primary">Get Started</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="hero">
        <p className="hero-arabic">نظام إدارة المدارس الدينية</p>
        <h1 className="hero-title">Run Your Madrasah with Clarity</h1>
        <p className="hero-subtitle">
          The simple admin system for madrasahs, weekend schools, and community learning centers.
          Track attendance, record exams, manage fees, and keep parents informed.
        </p>

        <div className="hero-actions">
          <button onClick={() => navigate('/register')} className="btn primary">
            Start Free Trial
          </button>
          <button onClick={() => navigate('/demo')} className="btn secondary">
            View Demo
          </button>
        </div>

        <p className="hero-signin">Already have an account? <Link to="/signin">Sign in</Link></p>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <h2 className="section-title">Get Started in Minutes</h2>
        <div className="steps">
          <div className="step">
            <span className="step-number">1</span>
            <h3>Register Your School</h3>
            <p>Create your madrasah profile, add classes, and invite teachers.</p>
          </div>
          <div className="step">
            <span className="step-number">2</span>
            <h3>Set Up Your Schedule</h3>
            <p>Configure school days, holidays, and semester dates.</p>
          </div>
          <div className="step">
            <span className="step-number">3</span>
            <h3>Start Teaching</h3>
            <p>Take attendance, track Qur'an progress, and record exams from day one.</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <h2 className="section-title">Everything Your School Needs</h2>

        <div className="hero-features">
          <div className="hero-feature">
            <h3>Daily Attendance</h3>
            <p>Mark attendance, grade dressing, behavior, and punctuality — all in one step. Bulk-save for the whole class.</p>
          </div>
          <div className="hero-feature">
            <h3>Qur'an Progress Tracking</h3>
            <p>Track hifdh, tilawah, and revision progress per student. Record surahs, ayahs, grades, and pass/fail status.</p>
          </div>
          <div className="hero-feature">
            <h3>Parent Portal</h3>
            <p>Parents log in to view their child's attendance rate, conduct grades, exam results, and teacher comments.</p>
          </div>
        </div>

        <div className="feature-list">
          <div className="feature">
            <h3>Academic Planner</h3>
            <p>Set flexible school days, manage holidays and closures, and schedule temporary overrides like Ramadan timetables.</p>
          </div>
          <div className="feature">
            <h3>Exam Recording</h3>
            <p>Record scores for any subject with tie-aware ranking. View class-wide and per-student performance reports.</p>
          </div>
          <div className="feature">
            <h3>Student Promotion</h3>
            <p>Promote or retain students between classes at the end of each session with a simple bulk tool.</p>
          </div>
          <div className="feature">
            <h3>Fee Tracking</h3>
            <p>Create fee templates, assign them to classes or students, and record payments. Track balances and collection status in any currency.</p>
          </div>
          <div className="feature">
            <h3>Role-Based Access</h3>
            <p>Admins, teachers, and parents each get their own secure portal with appropriate permissions.</p>
          </div>
          <div className="feature">
            <h3>Reports &amp; Exports</h3>
            <p>Generate detailed student reports, class performance summaries, and export data as CSV or PDF.</p>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="social-proof">
        <p className="proof-label">Trusted by madrasahs in New Zealand and beyond</p>
        <div className="proof-logos">
          <div className="proof-item">
            <span className="proof-name">Tauranga Masjid Madrasah</span>
            <span className="proof-status">Pilot Partner</span>
          </div>
          <div className="proof-divider"></div>
          <div className="proof-item">
            <span className="proof-name">MMA Madrasah</span>
            <span className="proof-status">Palmerston North, NZ</span>
          </div>
          <div className="proof-divider"></div>
          <div className="proof-item">
            <span className="proof-name">Al-Modrasatu Ath-Thaqafiyyah</span>
            <span className="proof-status">Ibadan, Nigeria</span>
          </div>
        </div>
        <p className="proof-cta">Interested in a demo for your madrasah? <a href="mailto:support@e-daarah.com?subject=Demo%20Request">Get in touch</a></p>
      </section>

      {/* Pricing Teaser */}
      <section id="pricing" className="pricing">
        <h2 className="section-title">Simple, Transparent Pricing</h2>
        <p className="pricing-teaser-text">
          Start with a 14-day free trial. No credit card needed.
        </p>
        <div className="pricing-teaser">
          <div className="pricing-teaser-card">
            <span className="teaser-plan">Standard</span>
            <span className="teaser-price">$12<span>/mo</span></span>
            <span className="teaser-desc">Up to 100 students</span>
          </div>
          <div className="pricing-teaser-card featured">
            <span className="teaser-plan">Plus</span>
            <span className="teaser-price">$29<span>/mo</span></span>
            <span className="teaser-desc">Up to 500 students</span>
          </div>
          <div className="pricing-teaser-card">
            <span className="teaser-plan">Enterprise</span>
            <span className="teaser-price">Custom</span>
            <span className="teaser-desc">Unlimited</span>
          </div>
        </div>
        <div className="pricing-teaser-actions">
          <Link to="/register" className="btn primary">Start Free Trial</Link>
          <Link to="/pricing" className="pricing-link">See full plan details →</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src="/e-daarah-whitebg-logo.png" alt="e-Daarah" className="footer-logo-img" />
              <span className="footer-logo-text">e-Daarah</span>
            </div>
            <p className="footer-tagline">{'نظام إدارة المدارس الدينية'}</p>
            <p className="footer-sub">Designed for madrasahs. Ready for any school.</p>
          </div>
          <div className="footer-links">
            <Link to="/signin">Sign In</Link>
            <Link to="/demo">Demo</Link>
            <Link to="/register">Register</Link>
            <Link to="/help">Help</Link>
          </div>
          <div className="footer-links">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <a href="mailto:support@e-daarah.com">Contact</a>
          </div>
        </div>
        <p className="copyright">© 2026 e-Daarah</p>
      </footer>
    </div>
  );
}

export default Landing;
