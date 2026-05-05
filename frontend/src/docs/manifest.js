// Docs manifest — single source of truth for the help & docs site.
// Each article is a markdown file under ./articles/. Use Vite's ?raw import.
//
// Adding a new article: drop a .md file in ./articles/, then add an entry below.
// Categories render as sidebar groups; articles render in the order listed.

import gettingStartedWelcome from './articles/getting-started-welcome.md?raw';
import gettingStartedSignUp from './articles/getting-started-sign-up.md?raw';
import gettingStartedOnboarding from './articles/getting-started-onboarding.md?raw';
import adminAttendance from './articles/admin-attendance.md?raw';
import faq from './articles/faq.md?raw';

export const docsManifest = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    articles: [
      {
        slug: 'welcome',
        title: 'Welcome to E-Daarah',
        summary: 'What E-Daarah is and who it\'s for.',
        roles: ['admin', 'teacher', 'parent'],
        body: gettingStartedWelcome,
      },
      {
        slug: 'sign-up',
        title: 'Creating your madrasah account',
        summary: 'Step-by-step signup, including verifying your email.',
        roles: ['admin'],
        body: gettingStartedSignUp,
      },
      {
        slug: 'onboarding',
        title: 'Onboarding wizard walkthrough',
        summary: 'The first-run questions every new admin sees.',
        roles: ['admin'],
        body: gettingStartedOnboarding,
      },
    ],
  },
  {
    id: 'admins',
    title: 'For Admins',
    articles: [
      {
        slug: 'attendance',
        title: 'Recording attendance',
        summary: 'Daily roll call, dressing/behaviour grades, and bulk edits.',
        roles: ['admin', 'teacher'],
        body: adminAttendance,
      },
    ],
  },
  {
    id: 'help',
    title: 'Help',
    articles: [
      {
        slug: 'faq',
        title: 'Frequently asked questions',
        summary: 'Quick answers to the most common questions.',
        roles: ['admin', 'teacher', 'parent'],
        body: faq,
      },
    ],
  },
];

// Flatten for search and direct lookup
export const allArticles = docsManifest.flatMap(cat =>
  cat.articles.map(a => ({ ...a, categoryId: cat.id, categoryTitle: cat.title, path: `/docs/${cat.id}/${a.slug}` }))
);

export function findArticle(categoryId, slug) {
  return allArticles.find(a => a.categoryId === categoryId && a.slug === slug);
}
