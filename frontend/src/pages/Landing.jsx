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
        <div className="hero-content">
          <span className="hero-badge">Built for Islamic Schools</span>
          <h1 className="hero-title">Run Your Madrasah<br />with Clarity</h1>
          <p className="hero-subtitle">
            The simple admin system for madrasahs, weekend schools, and community
            learning centers. Track attendance, record exams, manage fees, and keep
            parents informed — all in one place.
          </p>
          <div className="hero-actions">
            <button onClick={() => navigate('/register')} className="btn-primary">
              Start Free Trial
            </button>
            <button onClick={() => navigate('/demo')} className="btn-outline">
              View Demo
            </button>
          </div>
          <p className="hero-signin">Already have an account? <Link to="/signin">Sign in</Link></p>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <div className="section-inner">
          <h2 className="section-label">How It Works</h2>
          <h3 className="section-heading">Get started in minutes</h3>
          <div className="steps">
            <div className="step">
              <span className="step-number">1</span>
              <div className="step-connector"></div>
              <h4>Register Your School</h4>
              <p>Create your madrasah profile, add classes, and invite teachers.</p>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <div className="step-connector"></div>
              <h4>Set Up Your Schedule</h4>
              <p>Configure school days, holidays, and semester dates.</p>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <h4>Start Teaching</h4>
              <p>Take attendance, track Qur'an progress, and record exams from day one.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <div className="section-inner">
          <h2 className="section-label">Features</h2>
          <h3 className="section-heading">Everything your school needs</h3>
          <p className="section-desc">Core tools to manage your madrasah, all in one place.</p>

          <div className="feature-grid">
            <div className="feature-card highlight">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h4>Daily Attendance</h4>
              <p>Mark attendance, grade dressing, behavior, and punctuality — all in one step. Bulk-save for the whole class.</p>
            </div>
            <div className="feature-card highlight">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
              </div>
              <h4>Qur'an Progress Tracking</h4>
              <p>Track hifdh, tilawah, and revision progress per student. Record surahs, ayahs, grades, and pass/fail status.</p>
            </div>
            <div className="feature-card highlight">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h4>Parent Portal</h4>
              <p>Parents log in to view their child's attendance rate, conduct grades, exam results, and teacher comments.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <h4>Academic Planner</h4>
              <p>Set flexible school days, manage holidays and closures, and schedule temporary overrides like Ramadan timetables.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </div>
              <h4>Exam Recording</h4>
              <p>Record scores for any subject with tie-aware ranking. View class-wide and per-student performance reports.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
              </div>
              <h4>Student Promotion</h4>
              <p>Promote or retain students between classes at the end of each session with a simple bulk tool.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <h4>Fee Tracking</h4>
              <p>Create fee templates, assign them to classes or students, and record payments. Track balances in any currency.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <h4>Role-Based Access</h4>
              <p>Admins, teachers, and parents each get their own secure portal with appropriate permissions.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </div>
              <h4>Reports &amp; Exports</h4>
              <p>Generate detailed student reports, class performance summaries, and export data as CSV or PDF.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="social-proof">
        <div className="section-inner">
          <h2 className="section-label">Trusted</h2>
          <h3 className="section-heading">Used by madrasahs in New Zealand and beyond</h3>
          <div className="proof-grid">
            <div className="proof-card">
              <span className="proof-name">Tauranga Masjid Madrasah</span>
              <span className="proof-location">Tauranga, New Zealand</span>
              <span className="proof-badge">Pilot Partner</span>
            </div>
            <div className="proof-card">
              <span className="proof-name">MMA Madrasah</span>
              <span className="proof-location">Palmerston North, NZ</span>
            </div>
            <div className="proof-card">
              <span className="proof-name">Al-Modrasatu Ath-Thaqafiyyah</span>
              <span className="proof-location">Ibadan, Nigeria</span>
            </div>
          </div>
          <p className="proof-cta">Interested in a demo for your madrasah? <a href="mailto:support@e-daarah.com?subject=Demo%20Request">Get in touch</a></p>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section id="pricing" className="pricing">
        <div className="section-inner">
          <h2 className="section-label">Pricing</h2>
          <h3 className="section-heading">Simple, transparent pricing</h3>
          <p className="section-desc">14-day free trial. No credit card required. <span className="pricing-note">All prices in USD.</span></p>
          <div className="pricing-teaser">
            <div className="pricing-teaser-card">
              <span className="teaser-plan">Standard</span>
              <span className="teaser-price">$12<span>/mo</span></span>
              <span className="teaser-desc">Up to 100 students</span>
              <button onClick={() => navigate('/register')} className="btn-outline sm">Start Trial</button>
            </div>
            <div className="pricing-teaser-card featured">
              <span className="teaser-badge">Most Popular</span>
              <span className="teaser-plan">Plus</span>
              <span className="teaser-price">$29<span>/mo</span></span>
              <span className="teaser-desc">Up to 500 students</span>
              <button onClick={() => navigate('/register')} className="btn-primary sm">Start Trial</button>
            </div>
            <div className="pricing-teaser-card">
              <span className="teaser-plan">Enterprise</span>
              <span className="teaser-price">Custom</span>
              <span className="teaser-desc">Unlimited students</span>
              <a href="mailto:support@e-daarah.com?subject=Enterprise%20Plan%20Inquiry" className="btn-outline sm">Contact Us</a>
            </div>
          </div>
          <p className="pricing-link-wrap">
            <Link to="/pricing" className="pricing-link">Compare all plans →</Link>
          </p>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="cta-banner">
        <div className="section-inner">
          <h2>Ready to simplify your school management?</h2>
          <p>Join madrasahs across New Zealand and Nigeria already using e-Daarah.</p>
          <div className="cta-actions">
            <button onClick={() => navigate('/register')} className="btn-cta">Start Your Free Trial</button>
            <button onClick={() => navigate('/demo')} className="btn-cta-outline">View Live Demo</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src="/e-daarah-whitebg-logo.png" alt="e-Daarah" className="footer-logo-img" />
              <span className="footer-logo-text">e-Daarah</span>
            </div>
            <p className="footer-tagline">نظام إدارة المدارس الدينية</p>
            <p className="footer-sub">Designed for madrasahs. Ready for any school.</p>
          </div>
          <div className="footer-cols">
            <div className="footer-col">
              <h4>Product</h4>
              <Link to="/demo">Demo</Link>
              <Link to="/pricing">Pricing</Link>
              <Link to="/register">Register</Link>
            </div>
            <div className="footer-col">
              <h4>Support</h4>
              <Link to="/help">Help Center</Link>
              <a href="mailto:support@e-daarah.com">Contact</a>
              <Link to="/signin">Sign In</Link>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <Link to="/terms">Terms of Service</Link>
              <Link to="/privacy">Privacy Policy</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p className="copyright">© 2026 e-Daarah. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
