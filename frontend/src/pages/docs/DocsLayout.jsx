import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { docsManifest, allArticles } from '../../docs/manifest';
import './Docs.css';

export default function DocsLayout({ children, currentArticle }) {
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);

  // Close mobile nav when route changes
  useEffect(() => { setNavOpen(false); }, [location.pathname]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const onDown = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Search — fuzzy across title + summary + body
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return allArticles
      .map(a => {
        const haystack = `${a.title} ${a.summary || ''} ${a.body || ''}`.toLowerCase();
        if (!haystack.includes(q)) return null;
        // Score: title hits weighted higher than body hits
        const titleHit = a.title.toLowerCase().includes(q) ? 10 : 0;
        const summaryHit = (a.summary || '').toLowerCase().includes(q) ? 5 : 0;
        const bodyHits = (a.body.toLowerCase().match(new RegExp(q, 'g')) || []).length;
        return { ...a, score: titleHit + summaryHit + bodyHits };
      })
      .filter(Boolean)
      .sort((x, y) => y.score - x.score)
      .slice(0, 8);
  }, [query]);

  return (
    <div className="docs-shell">
      <header className="docs-topbar">
        <Link to="/" className="docs-logo">
          <img src="/e-daarah-whitebg-logo.png" alt="E-Daarah" />
          <span className="docs-logo-text">E-Daarah</span>
          <span className="docs-logo-divider">·</span>
          <span className="docs-logo-section">User Guide</span>
        </Link>
        <button
          type="button"
          className="docs-mobile-toggle"
          onClick={() => setNavOpen(o => !o)}
          aria-label="Toggle navigation"
        >
          {navOpen ? '✕ Close' : '☰ Menu'}
        </button>

        <div className="docs-search" ref={searchRef}>
          <input
            type="search"
            placeholder="Search docs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
          />
          {searchFocused && query.trim().length >= 2 && (
            <div className="docs-search-results">
              {searchResults.length === 0 ? (
                <div className="docs-search-empty">No matches for "{query}"</div>
              ) : (
                searchResults.map(r => (
                  <Link
                    key={r.path}
                    to={r.path}
                    className="docs-search-result"
                    onClick={() => { setQuery(''); setSearchFocused(false); }}
                  >
                    <div className="docs-search-result-cat">{r.categoryTitle}</div>
                    <div className="docs-search-result-title">{r.title}</div>
                    {r.summary && <div className="docs-search-result-summary">{r.summary}</div>}
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </header>

      <div className="docs-main">
        <nav className={`docs-sidebar ${navOpen ? 'open' : ''}`}>
          {docsManifest.map(cat => (
            <div key={cat.id} className="docs-sidebar-cat">
              <div className="docs-sidebar-cat-title">{cat.title}</div>
              {cat.articles.map(a => {
                const path = `/docs/${cat.id}/${a.slug}`;
                const isActive = location.pathname === path;
                return (
                  <Link
                    key={a.slug}
                    to={path}
                    className={`docs-sidebar-link ${isActive ? 'active' : ''}`}
                  >
                    {a.title}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <main className="docs-content">{children}</main>

        {currentArticle && currentArticle.headings && currentArticle.headings.length > 0 && (
          <aside className="docs-toc">
            <div className="docs-toc-title">On this page</div>
            {currentArticle.headings.map(h => (
              <a key={h.slug} href={`#${h.slug}`} className={`docs-toc-link ${h.level === 3 ? 'h3' : ''}`}>
                {h.text}
              </a>
            ))}
          </aside>
        )}
      </div>
    </div>
  );
}
