import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import SEO from '../../components/SEO';
import api from '../../services/api';
import VerifiedBadge from '../../components/VerifiedBadge';
import './Schools.css';

const TYPE_LABELS = {
  mosque_based: 'Mosque-based',
  independent: 'Independent',
  school_affiliated: 'School-affiliated',
  online: 'Online',
  other: 'Other',
};

export default function SchoolProfile() {
  const { slug } = useParams();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/public/schools/${slug}`)
      .then(res => setSchool(res.data))
      .catch(err => {
        if (err.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="schools-page">
        <header className="schools-header">
          <Link to="/" className="schools-logo">
            <img src="/e-daarah-whitebg-logo.png" alt="E-Daarah" className="schools-logo-img" />
            <span className="schools-logo-text">E-Daarah</span>
          </Link>
        </header>
        <div className="schools-loading">Loading...</div>
      </div>
    );
  }

  if (notFound || !school) {
    return (
      <div className="schools-page">
        <SEO title="School Not Found" description="This school profile could not be found." />
        <header className="schools-header">
          <Link to="/" className="schools-logo">
            <img src="/e-daarah-whitebg-logo.png" alt="E-Daarah" className="schools-logo-img" />
            <span className="schools-logo-text">E-Daarah</span>
          </Link>
        </header>
        <main className="schools-main">
          <div className="school-not-found">
            <h1>School Not Found</h1>
            <p>This school profile doesn't exist or hasn't been verified yet.</p>
            <Link to="/schools">Browse all schools</Link>
          </div>
        </main>
      </div>
    );
  }

  const location = [school.city, school.region, school.country].filter(Boolean).join(', ');
  const memberSince = school.created_at ? new Date(school.created_at).getFullYear() : null;

  return (
    <div className="schools-page">
      <SEO
        title={`${school.name} — Madrasah Profile`}
        description={`${school.name}${location ? ` in ${location}` : ''} — a verified madrasah using E-Daarah for student management, attendance tracking, and academic records.`}
        canonicalPath={`/schools/${slug}`}
      />

      <header className="schools-header">
        <Link to="/" className="schools-logo">
          <img src="/e-daarah-whitebg-logo.png" alt="E-Daarah" className="schools-logo-img" />
          <span className="schools-logo-text">E-Daarah</span>
        </Link>
        <nav className="schools-nav">
          <Link to="/pricing">Pricing</Link>
          <Link to="/demo">Demo</Link>
          <Link to="/blog">Blog</Link>
          <Link to="/signin">Sign In</Link>
        </nav>
      </header>

      <main className="schools-main">
        <Link to="/schools" className="school-back-link">Featured Schools</Link>

        <div className="school-profile">
          <div className="school-profile-header">
            <div className="school-profile-icon">
              {school.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {school.name}
                <VerifiedBadge size={20} />
              </h1>
              {location && <p className="school-profile-location">{location}</p>}
              {school.institution_type && (
                <span className="school-card-type">{TYPE_LABELS[school.institution_type] || school.institution_type}</span>
              )}
            </div>
          </div>

          <div className="school-profile-stats">
            <div className="school-stat">
              <span className="school-stat-value">{school.student_count}</span>
              <span className="school-stat-label">Active Students</span>
            </div>
            <div className="school-stat">
              <span className="school-stat-value">{school.class_count}</span>
              <span className="school-stat-label">Classes</span>
            </div>
            <div className="school-stat">
              <span className="school-stat-value">{school.teacher_count}</span>
              <span className="school-stat-label">Teachers</span>
            </div>
          </div>

          <div className="school-profile-features">
            <h2>Features in Use</h2>
            <ul>
              <li>Attendance Tracking</li>
              <li>Exam Recording</li>
              {school.enable_quran_tracking ? <li>Qur'an Progress Tracking</li> : null}
              {school.enable_fee_tracking ? <li>Fee Management</li> : null}
              <li>Parent Portal</li>
            </ul>
          </div>

          {memberSince && (
            <p className="school-profile-since">Member since {memberSince}</p>
          )}
        </div>

        <div className="schools-cta" style={{ marginTop: '3rem' }}>
          <h2>Run a madrasah or Islamic school?</h2>
          <p>Join {school.name} and other institutions using E-Daarah to simplify their administration.</p>
          <Link to="/register" className="schools-cta-btn">Get Started Free</Link>
        </div>
      </main>
    </div>
  );
}
