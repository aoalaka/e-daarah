import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './NotFound.css';

function NotFound() {
  useEffect(() => { document.title = 'Page Not Found — e-Daarah'; }, []);
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <h1 className="not-found-code">404</h1>
        <h2 className="not-found-title">Page Not Found</h2>
        <p className="not-found-message">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="not-found-link">
          Go to Homepage
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
