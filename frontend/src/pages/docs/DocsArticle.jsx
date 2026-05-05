import { useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DocsLayout from './DocsLayout';
import { findArticle, allArticles } from '../../docs/manifest';

// Slugify a heading text for anchor IDs
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

// Extract h2/h3 headings from markdown for the right-hand TOC
function extractHeadings(md) {
  const headings = [];
  const lines = (md || '').split('\n');
  let inFence = false;
  for (const line of lines) {
    if (line.startsWith('```')) inFence = !inFence;
    if (inFence) continue;
    const m = line.match(/^(#{2,3})\s+(.+?)\s*$/);
    if (m) {
      headings.push({
        level: m[1].length,
        text: m[2].replace(/[*_`]/g, ''),
        slug: slugify(m[2]),
      });
    }
  }
  return headings;
}

export default function DocsArticle() {
  const { categoryId, slug } = useParams();
  const navigate = useNavigate();

  const article = findArticle(categoryId, slug);

  // 404 fallback
  useEffect(() => {
    if (!article) {
      // Don't immediately redirect — show a clear message
    }
  }, [article]);

  const headings = useMemo(() => article ? extractHeadings(article.body) : [], [article]);

  // Prev/next navigation across the flat list of all articles
  const { prev, next } = useMemo(() => {
    if (!article) return { prev: null, next: null };
    const idx = allArticles.findIndex(a => a.path === article.path);
    return {
      prev: idx > 0 ? allArticles[idx - 1] : null,
      next: idx >= 0 && idx < allArticles.length - 1 ? allArticles[idx + 1] : null,
    };
  }, [article]);

  // Scroll to top on article change
  useEffect(() => { window.scrollTo(0, 0); }, [categoryId, slug]);

  if (!article) {
    return (
      <DocsLayout>
        <div style={{ padding: '40px 0' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Article not found</h1>
          <p style={{ color: '#6b7280', marginBottom: 16 }}>
            We couldn't find the doc you were looking for.
          </p>
          <Link to="/docs" style={{ color: '#0d9488', fontWeight: 500 }}>← Back to Help & Docs</Link>
        </div>
      </DocsLayout>
    );
  }

  const components = {
    // Convert markdown links — keep relative ones routed via React Router
    a: ({ href, children, ...rest }) => {
      if (href && href.startsWith('/')) {
        return <Link to={href} {...rest}>{children}</Link>;
      }
      return <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined} {...rest}>{children}</a>;
    },
    h2: ({ children }) => {
      const text = Array.isArray(children) ? children.join('') : String(children);
      const id = slugify(text);
      return <h2 id={id}>{children}</h2>;
    },
    h3: ({ children }) => {
      const text = Array.isArray(children) ? children.join('') : String(children);
      const id = slugify(text);
      return <h3 id={id}>{children}</h3>;
    },
  };

  return (
    <DocsLayout currentArticle={{ ...article, headings }}>
      <article>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {article.body}
        </ReactMarkdown>

        {(prev || next) && (
          <div className="docs-prev-next">
            {prev ? (
              <Link to={prev.path}>
                <div className="label">← Previous</div>
                <div className="title">{prev.title}</div>
              </Link>
            ) : <span />}
            {next ? (
              <Link to={next.path} className="next">
                <div className="label">Next →</div>
                <div className="title">{next.title}</div>
              </Link>
            ) : <span />}
          </div>
        )}
      </article>
    </DocsLayout>
  );
}
