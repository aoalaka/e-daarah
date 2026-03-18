import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';
import blogArticles from './blogData';
import './Blog.css';

function BlogIndex() {
  const sortedArticles = [...blogArticles].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  return (
    <div className="blog-page">
      <SEO
        title="Blog — e-Daarah"
        description="Practical guides and insights on madrasah management, Islamic school administration, Quran progress tracking, attendance, and more."
        canonicalPath="/blog"
      />

      <header className="blog-header">
        <Link to="/" className="logo">
          <img src="/e-daarah-whitebg-logo.png" alt="e-Daarah" className="logo-img" />
          <span className="logo-text">e-Daarah</span>
        </Link>
        <nav className="header-nav">
          <Link to="/pricing" className="nav-link">Pricing</Link>
          <Link to="/demo" className="nav-link">Demo</Link>
          <Link to="/blog" className="nav-link">Blog</Link>
          <Link to="/signin" className="nav-link">Sign In</Link>
        </nav>
      </header>

      <main className="blog-index-main">
        <div className="blog-index-header">
          <h1 className="blog-index-title">Blog</h1>
          <p className="blog-index-subtitle">
            Practical guides for madrasah administrators and Islamic school educators.
          </p>
        </div>

        <div className="blog-card-grid">
          {sortedArticles.map((article) => (
            <Link
              to={`/blog/${article.slug}`}
              key={article.slug}
              className="blog-card"
            >
              <span className="blog-card-category">{article.category}</span>
              <h2 className="blog-card-title">{article.title}</h2>
              <p className="blog-card-description">{article.description}</p>
              <div className="blog-card-meta">
                <span>{article.date}</span>
                <span>{article.readTime}</span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <footer className="blog-footer">
        <p>&copy; {new Date().getFullYear()} e-Daarah. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default BlogIndex;
