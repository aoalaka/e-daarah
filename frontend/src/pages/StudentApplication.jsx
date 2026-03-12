import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMadrasah } from '../contexts/MadrasahContext';
import api from '../services/api';
import './TeacherRegistration.css';

function StudentApplication() {
  useEffect(() => { document.title = 'Student Enrollment — e-Daarah'; }, []);
  const { madrasahSlug } = useParams();
  const { madrasah } = useMadrasah();
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', gender: '', date_of_birth: '',
    email: '', phone: '', phone_country_code: '+64',
    street: '', city: '', state: '', country: '',
    parent_guardian_name: '', parent_guardian_relationship: '',
    parent_guardian_phone: '', parent_guardian_phone_country_code: '+64',
    notes: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await api.post('/auth/student-application', {
        ...formData,
        madrasahSlug,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="registration-container">
      <div className="registration-card" style={{ maxWidth: '560px' }}>
        <div className="registration-header">
          <h1>{madrasah?.name || 'Student Enrollment'}</h1>
          <p>Submit a student enrollment application</p>
        </div>

        {success ? (
          <div className="success-message">
            <div className="success-icon">+</div>
            <h2>Application Submitted</h2>
            <p>The madrasah admin will review your application. You will be contacted if more information is needed.</p>
            <div style={{ marginTop: '20px' }}>
              <button onClick={() => { setSuccess(false); setFormData({ first_name: '', last_name: '', gender: '', date_of_birth: '', email: '', phone: '', phone_country_code: '+64', street: '', city: '', state: '', country: '', parent_guardian_name: '', parent_guardian_relationship: '', parent_guardian_phone: '', parent_guardian_phone_country_code: '+64', notes: '' }); }} className="submit-btn" style={{ background: 'transparent', color: 'var(--accent, #2563eb)', border: '1px solid var(--accent, #2563eb)' }}>
                Submit Another
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="registration-form">
            {error && <div className="error-message">{error}</div>}

            <div className="info-message">
              Fill in the student's details below. The madrasah admin will review and assign a class.
            </div>

            {/* Student Info */}
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input type="text" value={formData.first_name} onChange={set('first_name')} required />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input type="text" value={formData.last_name} onChange={set('last_name')} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Gender *</label>
                <select value={formData.gender} onChange={set('gender')} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
                <input type="date" value={formData.date_of_birth} onChange={set('date_of_birth')} />
              </div>
            </div>

            <div className="form-group">
              <label>Email</label>
              <input type="email" value={formData.email} onChange={set('email')} />
            </div>

            {/* Parent/Guardian */}
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '20px 0 8px', color: '#374151' }}>Parent / Guardian</h3>

            <div className="form-row">
              <div className="form-group">
                <label>Name</label>
                <input type="text" value={formData.parent_guardian_name} onChange={set('parent_guardian_name')} />
              </div>
              <div className="form-group">
                <label>Relationship</label>
                <select value={formData.parent_guardian_relationship} onChange={set('parent_guardian_relationship')} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}>
                  <option value="">Select</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Parent/Guardian Phone</label>
              <input type="tel" value={formData.parent_guardian_phone} onChange={set('parent_guardian_phone')} placeholder="+1234567890" />
            </div>

            {/* Address */}
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '20px 0 8px', color: '#374151' }}>Address</h3>

            <div className="form-group">
              <label>Street</label>
              <input type="text" value={formData.street} onChange={set('street')} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input type="text" value={formData.city} onChange={set('city')} />
              </div>
              <div className="form-group">
                <label>State / Region</label>
                <input type="text" value={formData.state} onChange={set('state')} />
              </div>
            </div>

            <div className="form-group">
              <label>Country</label>
              <input type="text" value={formData.country} onChange={set('country')} />
            </div>

            {/* Notes */}
            <div className="form-group">
              <label>Notes</label>
              <textarea value={formData.notes} onChange={set('notes')} rows={3} placeholder="Any additional information..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>

            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>

            <div className="login-link">
              <Link to="/">Back to Home</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default StudentApplication;
