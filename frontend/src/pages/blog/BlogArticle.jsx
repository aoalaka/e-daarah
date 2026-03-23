import { useParams, Link } from 'react-router-dom';
import SEO from '../../components/SEO';
import blogArticles from './blogData';
import './Blog.css';

function BlogArticle() {
  const { slug } = useParams();
  const article = blogArticles.find((a) => a.slug === slug);
  const relatedArticles = blogArticles.filter((a) => a.slug !== slug).slice(0, 3);

  if (!article) {
    return (
      <div className="blog-page">
        <header className="blog-header">
          <Link to="/" className="logo">
            <img src="/e-daarah-whitebg-logo.png" alt="E-Daarah" className="logo-img" />
            <span className="logo-text">E-Daarah</span>
          </Link>
          <nav className="header-nav">
            <Link to="/pricing" className="nav-link">Pricing</Link>
            <Link to="/demo" className="nav-link">Demo</Link>
            <Link to="/blog" className="nav-link">Blog</Link>
            <Link to="/signin" className="nav-link">Sign In</Link>
          </nav>
        </header>
        <main className="blog-article-main">
          <div className="blog-not-found">
            <h1>Article Not Found</h1>
            <p>The article you are looking for does not exist.</p>
            <Link to="/blog" className="blog-back-link">Back to Blog</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="blog-page">
      <SEO
        title={article.title}
        description={article.description}
        canonicalPath={`/blog/${article.slug}`}
      />

      <header className="blog-header">
        <Link to="/" className="logo">
          <img src="/e-daarah-whitebg-logo.png" alt="E-Daarah" className="logo-img" />
          <span className="logo-text">E-Daarah</span>
        </Link>
        <nav className="header-nav">
          <Link to="/pricing" className="nav-link">Pricing</Link>
          <Link to="/demo" className="nav-link">Demo</Link>
          <Link to="/blog" className="nav-link">Blog</Link>
          <Link to="/signin" className="nav-link">Sign In</Link>
        </nav>
      </header>

      <main className="blog-article-main">
        <Link to="/blog" className="blog-back-link">Back to Blog</Link>

        <article className="blog-article">
          <div className="blog-article-header">
            <span className="blog-card-category">{article.category}</span>
            <h1 className="blog-article-title">{article.title}</h1>
            <div className="blog-article-meta">
              <span>{article.date}</span>
              <span>{article.readTime}</span>
            </div>
          </div>

          <div className="blog-article-body">
            {article.sections.map((section, index) => (
              <section key={index}>
                <h2>{section.heading}</h2>
                {section.body.split('\n\n').map((paragraph, pIndex) => (
                  <p key={pIndex}>{paragraph}</p>
                ))}
              </section>
            ))}
          </div>

          <div className="blog-cta">
            <h3>Ready to simplify your madrasah administration?</h3>
            <p>
              Qur'an tracking is free — no credit card, no expiry. Paid plans start from $2/month.
            </p>
            <div className="blog-cta-links">
              <Link to="/register" className="blog-cta-button">
                Start Free
              </Link>
              <Link to="/pricing" className="blog-cta-link">
                View paid plans
              </Link>
            </div>
          </div>

          {relatedArticles.length > 0 && (
            <div className="blog-related">
              <h3>Related articles</h3>
              <div className="blog-related-list">
                {relatedArticles.map((a) => (
                  <Link to={`/blog/${a.slug}`} key={a.slug} className="blog-related-item">
                    <p className="blog-related-title">{a.title}</p>
                    <p className="blog-related-desc">{a.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>

      <footer className="blog-footer">
        <p>&copy; {new Date().getFullYear()} E-Daarah. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default BlogArticle;
