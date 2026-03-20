import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SEO from '../components/SEO';
import './Landing.css';

function Landing() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const revealRefs = useRef([]);
  const [scrolled, setScrolled] = useState(false);
  const [heroAnimKey, setHeroAnimKey] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Header scroll effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Hero animation loop — replay every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroAnimKey(k => k + 1);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const addRevealRef = (el) => {
    if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el);
  };

  // Close menu on route change
  useEffect(() => {
    if (menuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <div className="landing">
      <SEO
        title="e-Daarah — Attendance & Admin for Madrasahs"
        description="Stop losing track of who showed up. e-Daarah replaces paper registers with a simple system madrasah teachers actually use. Attendance, reports, and parent updates — all in one place."
      />

      {/* Header */}
      <header className={`landing-header ${scrolled ? 'header-scrolled' : ''}`}>
        <Link to="/" className="logo">
          <img src="/e-daarah-whitebg-logo.png" alt="e-Daarah" className="logo-img" />
          <span className="logo-text">e-Daarah</span>
        </Link>
        <nav className="header-nav desktop-nav">
          <Link to="/pricing" className="nav-link">Pricing</Link>
          <Link to="/demo" className="nav-link">Demo</Link>
          <Link to="/blog" className="nav-link">Blog</Link>
          <Link to="/register" className="nav-link primary">Get Started</Link>
        </nav>
        <button
          className={`hamburger-btn ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </header>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMenuOpen(false)}>
          <nav className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <Link to="/pricing" className="mobile-menu-link" onClick={() => setMenuOpen(false)}>Pricing</Link>
            <Link to="/demo" className="mobile-menu-link" onClick={() => setMenuOpen(false)}>Demo</Link>
            <Link to="/blog" className="mobile-menu-link" onClick={() => setMenuOpen(false)}>Blog</Link>
            <Link to="/schools" className="mobile-menu-link" onClick={() => setMenuOpen(false)}>Schools</Link>
            <Link to="/register" className="mobile-menu-link" onClick={() => setMenuOpen(false)}>Get Started</Link>
            <Link to="/signin" className="mobile-menu-link" onClick={() => setMenuOpen(false)}>Sign In</Link>
          </nav>
        </div>
      )}

      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-content">
            <h1 className="hero-title">Attendance<br />for madrasahs.</h1>
            <p className="hero-subtitle">
              Attendance, fees, Qur'an progress, and more — without paper registers.
            </p>
            <div className="hero-actions">
              <button onClick={() => navigate('/register')} className="btn primary">
                Get Started
              </button>
              <button onClick={() => navigate('/demo')} className="btn secondary">
                View Demo
              </button>
            </div>
            <p className="hero-signin">Already have an account? <Link to="/signin">Sign in</Link></p>
            <p className="hero-quran-link">
              <a href="#quran-free" onClick={(e) => { e.preventDefault(); document.getElementById('quran-free')?.scrollIntoView({ behavior: 'smooth' }); }}>
                Teaching Qur'an only? Start free →
              </a>
            </p>

            {/* Mobile-only feature chips */}
            <div className="hero-chips">
              <span className="hero-chip">Attendance</span>
              <span className="hero-chip">Qur'an Tracking</span>
              <span className="hero-chip">Fees</span>
              <span className="hero-chip">Parent Portal</span>
              <span className="hero-chip">Exam Records</span>
            </div>
          </div>

          {/* Animated attendance card */}
          <div className="hero-visual animating" key={heroAnimKey}>
            <div className="attendance-card">
              <div className="ac-header">
                <span className="ac-dot"></span>
                <span className="ac-title">Today's Attendance</span>
                <span className="ac-date">Sunday, 3 Feb</span>
              </div>
              <div className="ac-rows">
                <div className="ac-row row-1">
                  <span className="ac-name">Ahmad Hussein</span>
                  <span className="ac-check present">✓</span>
                </div>
                <div className="ac-row row-2">
                  <span className="ac-name">Fatima Omar</span>
                  <span className="ac-check present">✓</span>
                </div>
                <div className="ac-row row-3">
                  <span className="ac-name">Yusuf Ibrahim</span>
                  <span className="ac-check present">✓</span>
                </div>
                <div className="ac-row row-4">
                  <span className="ac-name">Aisha Mohammed</span>
                  <span className="ac-check absent">✗</span>
                </div>
                <div className="ac-row row-5">
                  <span className="ac-name">Ibrahim Suleiman</span>
                  <span className="ac-check present">✓</span>
                </div>
              </div>
              <div className="ac-footer">
                <div className="ac-stat">
                  <span className="ac-stat-label">Present</span>
                  <span className="ac-stat-value">4 / 5</span>
                </div>
                <div className="ac-bar">
                  <div className="ac-bar-fill"></div>
                </div>
              </div>
            </div>

            {/* Floating fee badge */}
            <div className="hero-badge fee-badge">
              <span className="badge-icon">$</span>
              <div className="badge-text">
                <span className="badge-label">Fees Collected</span>
                <span className="badge-value">78%</span>
              </div>
            </div>

            {/* Floating parent badge */}
            <div className="hero-badge parent-badge">
              <span className="badge-icon">👤</span>
              <div className="badge-text">
                <span className="badge-label">Parent Notified</span>
                <span className="badge-value">Just now</span>
              </div>
            </div>

            {/* Floating Qur'an badge */}
            <div className="hero-badge quran-badge">
              <span className="badge-icon">📖</span>
              <div className="badge-text">
                <span className="badge-label">Qur'an Progress</span>
                <span className="badge-value">Surah Al-Mulk</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Install as App */}
      <section className="install-app scroll-reveal" ref={addRevealRef}>
        <div className="section-inner">
          <p className="section-label">Works Like a Mobile App</p>
          <h2 className="section-heading">Add e-Daarah to your home screen</h2>
          <p className="section-desc">No app store needed. Install it directly from your browser in seconds.</p>
          <div className="install-grid">
            <div className="install-card">
              <div className="install-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 18.5V3.5M12 3.5l5 5M12 3.5l-5 5"/><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>
              </div>
              <h3>iPhone / iPad</h3>
              <ol className="install-steps">
                <li>Open <strong>e-daarah.com</strong> in Safari</li>
                <li>Tap the <strong>Share</strong> button <span className="install-inline-icon">⬆</span></li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                <li>Tap <strong>Add</strong> — done!</li>
              </ol>
            </div>
            <div className="install-card">
              <div className="install-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
              </div>
              <h3>Android</h3>
              <ol className="install-steps">
                <li>Open <strong>e-daarah.com</strong> in Chrome</li>
                <li>Tap the <strong>menu</strong> <span className="install-inline-icon">⋮</span> (three dots)</li>
                <li>Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></li>
                <li>Tap <strong>Install</strong> — done!</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works scroll-reveal" ref={addRevealRef}>
        <div className="section-inner">
          <p className="section-label">How It Works</p>
          <h2 className="section-heading">Taking attendance shouldn't be hard</h2>
          <div className="steps">
            <div className="step">
              <span className="step-number">1</span>
              <h3>Add Your Classes</h3>
              <p>Register your madrasah, create classes, and add your students. Takes about 10 minutes.</p>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <h3>Teachers Take Attendance</h3>
              <p>Each teacher opens their class, taps present or absent, and saves. Done in under a minute.</p>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <h3>Everyone Stays Informed</h3>
              <p>Parents see attendance instantly. Admins see who's falling behind. No chasing, no phone calls.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="who-for scroll-reveal" ref={addRevealRef}>
        <div className="section-inner">
          <p className="section-label">Who It's For</p>
          <h2 className="section-heading">Built for madrasahs. Works for any school.</h2>
          <div className="who-grid">
            <div className="who-card">
              <h3>Weekend Madrasahs</h3>
              <p>Saturday / Sunday classes where tracking attendance on paper is easy to forget and hard to keep consistent.</p>
            </div>
            <div className="who-card">
              <h3>Full-time Islamic Schools</h3>
              <p>Larger institutions with multiple teachers, classes, and the need for proper admin and parent communication.</p>
            </div>
            <div className="who-card">
              <h3>After-school Programs</h3>
              <p>Evening or after-school Qur'an classes, hifz circles, or Islamic studies — any recurring program with students to track.</p>
            </div>
            <div className="who-card">
              <h3>Any School</h3>
              <p>Not a madrasah? No problem. Attendance, fees, exams, and parent access work for any small to mid-size school.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Qur'an Tracker CTA */}
      <section id="quran-free" className="quran-cta-section scroll-reveal" ref={addRevealRef}>
        <div className="section-inner">
          <p className="section-label">Free Forever</p>
          <h2 className="section-heading">Teaching Qur'an? Track progress for free.</h2>
          <p className="section-desc">
            Hifdh circles, tilawah classes, revision groups — track up to 75 students with position tracking, session grading, and progress history. No trial, no expiry, no credit card.
          </p>
          <div className="quran-cta-features">
            <span className="quran-cta-tag">Hifdh tracking</span>
            <span className="quran-cta-tag">Tilawah tracking</span>
            <span className="quran-cta-tag">Revision tracking</span>
            <span className="quran-cta-tag">75 students</span>
            <span className="quran-cta-tag">Cloud backup</span>
          </div>
          <button onClick={() => navigate('/register?type=quran_focused')} className="btn primary">Get Started Free</button>
        </div>
      </section>

      {/* Features */}
      <section className="features scroll-reveal" ref={addRevealRef}>
        <div className="section-inner">
          <p className="section-label">More than just attendance</p>
          <h2 className="section-heading">Once attendance is sorted, everything else gets easier</h2>

          <div className="feature-grid">
            <div className="feature-card">
              <h3>Attendance in One Tap</h3>
              <p>Teachers mark the whole class in under a minute. Grade dressing, behavior, and punctuality at the same time. No paper needed.</p>
            </div>
            <div className="feature-card">
              <h3>Know Who's Falling Behind</h3>
              <p>See which students are missing too many days before it becomes a problem. Get alerts, not surprises.</p>
            </div>
            <div className="feature-card">
              <h3>Fee Tracking — Manual or Auto</h3>
              <p>Set fees manually per student, or let the system calculate them from fee schedules based on your academic planner. Either way, parents see what they owe and you see who's behind.</p>
            </div>
            <div className="feature-card">
              <h3>Parents Stay in the Loop</h3>
              <p>Parents log in and see their child's attendance, conduct, and results. No more "was my child there?" messages.</p>
            </div>
            <div className="feature-card">
              <h3>Qur'an Progress</h3>
              <p>Track hifdh, tilawah, and revision per student. Know exactly where each child is in their memorisation journey.</p>
            </div>
            <div className="feature-card">
              <h3>Exam Results &amp; Rankings</h3>
              <p>Record scores, generate rankings, and see class performance at a glance. End-of-term reports in seconds, not weekends.</p>
            </div>
            <div className="feature-card">
              <h3>Year-End Promotions</h3>
              <p>Move students between classes at the end of each session. Bulk promote, retain, or mark as graduated.</p>
            </div>
            <div className="feature-card">
              <h3>Teacher Availability</h3>
              <p>Teachers mark days they'll be away. Admins see who's unavailable at a glance — so there are no surprises on teaching day.</p>
            </div>
            <div className="feature-card">
              <h3>Separate Logins</h3>
              <p>Admins manage everything. Teachers see only their classes. Parents see only their children. Everyone gets what they need.</p>
            </div>
            <div className="feature-card">
              <h3>Reports &amp; Exports</h3>
              <p>Download attendance records, student reports, and exam results as CSV or PDF. Ready for your committee meetings.</p>
            </div>
            <div className="feature-card">
              <h3>Online Student Enrollment</h3>
              <p>Share your enrollment link and let parents submit applications online. Review, approve, and assign students to classes — or reject with one click.</p>
            </div>
            <div className="feature-card">
              <h3>SMS Notifications</h3>
              <p>Send fee reminders and announcements to parents via SMS — manually or on autopilot with monthly auto-reminders. Buy credit packs as needed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Before / After */}
      <section className="before-after scroll-reveal" ref={addRevealRef}>
        <div className="section-inner">
          <p className="section-label">The Difference</p>
          <h2 className="section-heading">What changes when you switch</h2>
          <div className="ba-grid">
            <div className="ba-col ba-before">
              <h3>Without e-Daarah</h3>
              <ul>
                <li>Paper register gets lost or forgotten</li>
                <li>No idea who's been missing for weeks</li>
                <li>Parents keep asking "was my child there?"</li>
                <li>Fee records in a notebook — or someone's head</li>
                <li>End-of-term reports take a whole weekend</li>
                <li>No exam history or progress tracking</li>
              </ul>
            </div>
            <div className="ba-col ba-after">
              <h3>With e-Daarah</h3>
              <ul>
                <li>Attendance saved in the cloud, always accessible</li>
                <li>Spot low-attendance students at a glance</li>
                <li>Parents log in and see everything themselves</li>
                <li>Clear fee records both you and parents can see</li>
                <li>Reports generated in seconds, not days</li>
                <li>Full exam history per student, per semester</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof — uncomment when we have more users
      <section className="social-proof">
        <p className="section-label">Trusted by madrasahs in New Zealand and beyond</p>
        <div className="marquee">
          <div className="marquee-track">
            <div className="marquee-item">
              <span className="proof-name">Tauranga Masjid Madrasah</span>
              <span className="proof-detail">Tauranga, New Zealand</span>
            </div>
            <span className="marquee-dot">·</span>
            <div className="marquee-item">
              <span className="proof-name">MMA Madrasah</span>
              <span className="proof-detail">Palmerston North, NZ</span>
            </div>
            <span className="marquee-dot">·</span>
            <div className="marquee-item">
              <span className="proof-name">Al-Modrasatu Ath-Thaqafiyyah</span>
              <span className="proof-detail">Ibadan, Nigeria</span>
            </div>
            <span className="marquee-dot">·</span>
            <div className="marquee-item">
              <span className="proof-name">Tauranga Masjid Madrasah</span>
              <span className="proof-detail">Tauranga, New Zealand</span>
            </div>
            <span className="marquee-dot">·</span>
            <div className="marquee-item">
              <span className="proof-name">MMA Madrasah</span>
              <span className="proof-detail">Palmerston North, NZ</span>
            </div>
            <span className="marquee-dot">·</span>
            <div className="marquee-item">
              <span className="proof-name">Al-Modrasatu Ath-Thaqafiyyah</span>
              <span className="proof-detail">Ibadan, Nigeria</span>
            </div>
            <span className="marquee-dot">·</span>
          </div>
        </div>
        <p className="proof-cta">Interested in a demo? <a href="mailto:support@e-daarah.com?subject=Demo%20Request">Get in touch</a></p>
      </section>
      */}

      {/* Pricing */}
      <section id="pricing" className="pricing scroll-reveal" ref={addRevealRef}>
        <div className="section-inner">
          <p className="section-label">Pricing</p>
          <h2 className="section-heading">Simple, transparent pricing</h2>
          <p className="section-desc">14-day free trial. No credit card required. All prices in USD.</p>
          <div className="pricing-grid">
            <div className="price-card">
              <h3>Solo</h3>
              <div className="price"><span className="price-currency">USD</span> $5<span>/mo</span></div>
              <p>Up to 75 students</p>
              <button onClick={() => navigate('/register')} className="btn secondary">Start Trial</button>
            </div>
            <div className="price-card">
              <h3>Standard</h3>
              <div className="price"><span className="price-currency">USD</span> $12<span>/mo</span></div>
              <p>Up to 100 students</p>
              <button onClick={() => navigate('/register')} className="btn secondary">Start Trial</button>
            </div>
            <div className="price-card featured">
              <h3>Plus</h3>
              <div className="price"><span className="price-currency">USD</span> $29<span>/mo</span></div>
              <p>Up to 500 students</p>
              <button onClick={() => navigate('/register')} className="btn primary">Start Trial</button>
            </div>
            <div className="price-card">
              <h3>Enterprise</h3>
              <div className="price">Custom</div>
              <p>Unlimited students</p>
              <a href="mailto:support@e-daarah.com?subject=Enterprise%20Plan%20Inquiry" className="btn secondary">Contact Us</a>
            </div>
          </div>
          <div className="sms-addon-note">
            <p><strong>SMS Add-on</strong> — Plus plan and above includes 25 free SMS credits. Send fee reminders and announcements to parents via SMS. Need more? Credit packs from $3. <Link to="/pricing">See details →</Link></p>
          </div>
          <p className="pricing-more"><Link to="/pricing">Compare all plans →</Link></p>
        </div>
      </section>

      {/* Featured Schools */}
      <section className="featured-schools-banner">
        <div className="section-inner">
          <p>See madrasahs already using e-Daarah → <Link to="/schools">Featured Schools</Link></p>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="section-inner">
          <h2>Try it free for 14 days</h2>
          <p>Set up your madrasah in 10 minutes. No credit card required.</p>
          <div className="cta-actions">
            <button onClick={() => navigate('/register')} className="btn primary">Start Your Free Trial</button>
            <button onClick={() => navigate('/demo')} className="btn secondary">View Live Demo</button>
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
            <p className="footer-sub">Attendance and admin for madrasahs.</p>
          </div>
          <div className="footer-cols">
            <div className="footer-col">
              <h4>Product</h4>
              <Link to="/demo">Demo</Link>
              <Link to="/pricing">Pricing</Link>
              <Link to="/register">Register</Link>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <Link to="/blog">Blog</Link>
              <Link to="/schools">Schools</Link>
              <Link to="/help">Help Center</Link>
            </div>
            <div className="footer-col">
              <h4>Support</h4>
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
          <p>© 2026 e-Daarah. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
