import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import SEO from '../components/SEO';
import './SignIn.css';

function SignIn() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-focus the input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await api.get(`/auth/madrasahs/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(response.data);
        setShowResults(true);
        setHasSearched(true);
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
        setHasSearched(true);
      } finally {
        setSearching(false);
      }
    }, 400);

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
    <div className="signin-page">
      <SEO
        title="Sign In — e-Daarah"
        description="Sign in to your madrasah's admin portal. Find your school and access attendance, exams, and reports."
      />
      <div className="signin-card">
        <Link to="/" className="signin-logo">
          <img src="/e-daarah-whitebg-logo.png" alt="e-Daarah" className="signin-logo-img" />
          <span className="signin-logo-text">e-Daarah</span>
        </Link>

        <div className="signin-header">
          <h1>Sign in</h1>
          <p>Find your madrasah to continue</p>
        </div>

        <div className="signin-search" ref={searchRef}>
          <label htmlFor="madrasah-search">Madrasah name</label>
          <div className="signin-input-wrapper">
            <input
              ref={inputRef}
              id="madrasah-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              placeholder="e.g. Al-Noor, Baitul Ilm..."
              autoComplete="off"
            />
            {searching && <span className="signin-spinner" />}
          </div>

          {showResults && searchResults.length > 0 && (
            <ul className="signin-results">
              {searchResults.map((m) => (
                <li key={m.id} onClick={() => handleSelectMadrasah(m)}>
                  <div className="result-info">
                    <span className="result-name">{m.name}</span>
                    <span className="result-url">e-daarah.com/{m.slug}</span>
                  </div>
                  <span className="result-arrow">→</span>
                </li>
              ))}
            </ul>
          )}

          {showResults && hasSearched && searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
            <div className="signin-no-results">
              <p>No madrasah found</p>
              <p className="signin-no-results-hint">Check the spelling or ask your administrator</p>
            </div>
          )}
        </div>

        <div className="signin-divider">
          <span>or</span>
        </div>

        <div className="signin-alternatives">
          <Link to="/demo" className="signin-alt-btn">
            Try a Demo
          </Link>
          <Link to="/register" className="signin-alt-link">
            Register a new madrasah →
          </Link>
        </div>

        <div className="signin-footer">
          <Link to="/">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}

export default SignIn;
