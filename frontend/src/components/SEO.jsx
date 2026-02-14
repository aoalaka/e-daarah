import { useEffect } from 'react';

/**
 * Lightweight SEO component — sets document title and meta description per page.
 * No external dependencies needed (no react-helmet).
 */
export default function SEO({ title, description }) {
  useEffect(() => {
    // Set page title
    if (title) {
      document.title = title.includes('e-Daarah')
        ? title
        : `${title} — e-Daarah`;
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
        ogTitle.setAttribute('content', title.includes('e-Daarah') ? title : `${title} — e-Daarah`);
      }
    }

    // Set OG description
    if (description) {
      let ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) {
        ogDesc.setAttribute('content', description);
      }
    }

    // Set Twitter title and description
    if (title) {
      let twTitle = document.querySelector('meta[name="twitter:title"]');
      if (twTitle) {
        twTitle.setAttribute('content', title.includes('e-Daarah') ? title : `${title} — e-Daarah`);
      }
    }
    if (description) {
      let twDesc = document.querySelector('meta[name="twitter:description"]');
      if (twDesc) {
        twDesc.setAttribute('content', description);
      }
    }
  }, [title, description]);

  return null;
}
