import { useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { useMadrasah } from '../contexts/MadrasahContext';
import './TeacherRegistration.css';

function TeacherRegistration() {
  const { madrasahSlug } = useParams();
  const { madrasah } = useMadrasah();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await authService.registerTeacher(madrasahSlug, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password
      });

      setSuccess(true);
      setTimeout(() => {
        navigate(`/${madrasahSlug}/login`);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="registration-container">
      <div className="registration-card">
        <div className="registration-header">
          <h1>{madrasah?.name || 'Teacher Registration'}</h1>
          <p>Join as a teacher</p>
        </div>

        {success ? (
          <div className="success-message">
            <div className="success-icon">+</div>
            <h2>Registration Successful!</h2>
            <p>Redirecting to login page...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="registration-form">
            {error && <div className="error-message">{error}</div>}

            <div className="info-message">
              Your staff ID will be automatically generated after registration.
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1234567890"
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  minLength="8"
                  required
                />
                <small style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  Min 8 characters with uppercase, lowercase, number, and symbol
                </small>
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  minLength="8"
                  required
                />
              </div>
            </div>

            <button type="submit" className="submit-btn">Register</button>

            <div className="login-link">
              Already have an account? <Link to={`/${madrasahSlug}/login`}>Login here</Link>
            </div>

            <div className="login-link">
              <Link to="/">Back to Home</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default TeacherRegistration;
