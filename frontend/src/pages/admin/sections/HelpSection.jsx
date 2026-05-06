import { Link } from 'react-router-dom';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { docsManifest } from '../../../docs/manifest';
import '../Dashboard.css';

/**
 * Slim Help tab — links to the standalone /docs site.
 * The old accordion-style content has moved to markdown files under
 * src/docs/articles/ so it can be searched, deep-linked, and edited
 * without touching React.
 */
function HelpSection({ setShowTour }) {
  return (
    <>
      <div className="page-header no-print">
        <h2 className="page-title">Help</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => { localStorage.removeItem('tour_admin_done'); setShowTour(true); }}>Replay tour</button>
          <a className="btn btn-primary btn-sm" href="/docs" target="_blank" rel="noopener noreferrer">
            Open User Guide <ArrowTopRightOnSquareIcon width={14} height={14} style={{ marginLeft: 6 }} />
          </a>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 600 }}>User Guide</h3>
          <p style={{ margin: 0, color: 'var(--gray)', fontSize: 14 }}>
            Step-by-step guides for everything E-Daarah does. Searchable. Updated continuously. Open the full site in a new tab to keep your dashboard handy.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        {docsManifest.map(cat => (
          <div key={cat.id} className="card">
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                {cat.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {cat.articles.map(a => (
                  <a
                    key={a.slug}
                    href={`/docs/${cat.id}/${a.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 14, color: '#0d9488', textDecoration: 'none', padding: '4px 0' }}
                  >
                    {a.title}
                  </a>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, fontSize: 13, color: 'var(--gray)' }}>
        Can't find what you need? <Link to="?tab=support" style={{ color: '#0d9488' }}>Open a support ticket →</Link>
      </div>
    </>
  );
}

export default HelpSection;
