import { Link } from 'react-router-dom';
import DocsLayout from './DocsLayout';
import { docsManifest } from '../../docs/manifest';

export default function DocsIndex() {
  return (
    <DocsLayout>
      <div className="docs-index">
        <h1>Help & Docs</h1>
        <p>Step-by-step guides for everything E-Daarah does. Start with Getting Started, or use the search at the top.</p>

        <div className="docs-index-grid">
          {docsManifest.map(cat => (
            <div key={cat.id} className="docs-index-card">
              <div className="docs-index-card-title">{cat.title}</div>
              <div className="docs-index-card-articles">
                {cat.articles.map(a => (
                  <Link key={a.slug} to={`/docs/${cat.id}/${a.slug}`}>{a.title}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DocsLayout>
  );
}
