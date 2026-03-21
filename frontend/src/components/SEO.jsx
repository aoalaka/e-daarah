import { useEffect } from 'react';

/**
 * Lightweight SEO component — sets document title and meta description per page.
 * No external dependencies needed (no react-helmet).
 */
export default function SEO({ title, description, canonicalPath }) {
  useEffect(() => {
    // Set page title
    if (title) {
      document.title = title.includes('E-Daarah')
        ? title
        : `${title} — E-Daarah`;
    }

    // Set meta description
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (meta) {
        meta.setAttribute('content', description);
      }
    }

    // Set OG title
    if (title) {
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', title.includes('E-Daarah') ? title : `${title} — E-Daarah`);
      }
    }

    // Set OG description
    if (description) {
      let ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) {
        ogDesc.setAttribute('content', description);
      }
    }

    // Set canonical URL
    const path = canonicalPath || window.location.pathname;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', `https://www.e-daarah.com${path}`);
    }

    // Set OG URL
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute('content', `https://www.e-daarah.com${path}`);
    }

    // Set Twitter title and description
    if (title) {
      let twTitle = document.querySelector('meta[name="twitter:title"]');
      if (twTitle) {
        twTitle.setAttribute('content', title.includes('E-Daarah') ? title : `${title} — E-Daarah`);
      }
    }
    if (description) {
      let twDesc = document.querySelector('meta[name="twitter:description"]');
      if (twDesc) {
        twDesc.setAttribute('content', description);
      }
    }
  }, [title, description, canonicalPath]);

  return null;
}
