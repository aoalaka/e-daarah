import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

export default function SchoolsDirectory() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/public/schools')
      .then(res => setSchools(res.data))
      .catch(() => setSchools([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="schools-page">
      <SEO
        title="Featured Madrasahs & Islamic Schools"
        description="See madrasahs and Islamic schools using e-Daarah for attendance tracking, exam recording, and student management."
        canonicalPath="/schools"
      />

      <header className="schools-header">
        <Link to="/" className="schools-logo">
          <img src="/e-daarah-whitebg-logo.png" alt="e-Daarah" className="schools-logo-img" />
          <span className="schools-logo-text">e-Daarah</span>
        </Link>
        <nav className="schools-nav">
          <Link to="/pricing">Pricing</Link>
          <Link to="/demo">Demo</Link>
          <Link to="/blog">Blog</Link>
          <Link to="/signin">Sign In</Link>
        </nav>
      </header>

      <main className="schools-main">
        <div className="schools-hero">
          <h1>Featured Madrasahs</h1>
          <p>Madrasahs and Islamic schools using e-Daarah to manage their students, attendance, and academic records.</p>
        </div>

        {loading ? (
          <div className="schools-loading">Loading...</div>
        ) : schools.length === 0 ? (
          <div className="schools-empty">
            Featured schools coming soon. Be among the first to join.
          </div>
        ) : (
          <div className="schools-grid">
            {schools.map(school => (
              <Link to={`/schools/${school.slug}`} key={school.slug} className="school-card">
                <div className="school-card-icon">
                  {school.name.charAt(0).toUpperCase()}
                </div>
                <div className="school-card-info">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {school.name}
                    <VerifiedBadge size={16} />
                  </h3>
                  {(school.city || school.country) && (
                    <p className="school-card-location">
                      {[school.city, school.region, school.country].filter(Boolean).join(', ')}
                    </p>
                  )}
                  <div className="school-card-stats">
                    {school.institution_type && (
                      <span className="school-card-type">{TYPE_LABELS[school.institution_type] || school.institution_type}</span>
                    )}
                    <span>{school.student_count} students</span>
                    <span>{school.class_count} classes</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="schools-cta">
          <h2>Want your madrasah featured here?</h2>
          <p>Register your institution, get verified, and join the growing community of madrasahs using e-Daarah.</p>
          <Link to="/register" className="schools-cta-btn">Register Your Madrasah</Link>
        </div>
      </main>
    </div>
  );
}
