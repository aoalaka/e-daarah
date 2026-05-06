// Docs manifest — single source of truth for the help & docs site.
// Each article is a markdown file under ./articles/. Use Vite's ?raw import.
//
// Adding a new article: drop a .md file in ./articles/, then add an entry below.
// Categories render as sidebar groups; articles render in the order listed.

import gettingStartedWelcome from './articles/getting-started-welcome.md?raw';
import gettingStartedSignUp from './articles/getting-started-sign-up.md?raw';
import gettingStartedOnboarding from './articles/getting-started-onboarding.md?raw';
import gettingStartedClassesAndStudents from './articles/getting-started-classes-and-students.md?raw';

import adminTeachers from './articles/admin-teachers.md?raw';
import adminAttendance from './articles/admin-attendance.md?raw';
import adminExams from './articles/admin-exams.md?raw';
import adminQuran from './articles/admin-quran.md?raw';
import adminCourses from './articles/admin-courses.md?raw';
import adminSms from './articles/admin-sms.md?raw';
import adminFeesSetup from './articles/admin-fees-setup.md?raw';
import adminFeesPayments from './articles/admin-fees-payments.md?raw';

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
      {
        slug: 'classes-and-students',
        title: 'Adding your first class and students',
        summary: 'Create classes, add students, and bulk-upload from a spreadsheet.',
        roles: ['admin'],
        body: gettingStartedClassesAndStudents,
      },
    ],
  },
  {
    id: 'admins',
    title: 'For Admins',
    articles: [
      {
        slug: 'teachers',
        title: 'Inviting your teachers',
        summary: 'Self-registration link or create teachers manually, then assign them to classes.',
        roles: ['admin'],
        body: adminTeachers,
      },
      {
        slug: 'attendance',
        title: 'Recording attendance',
        summary: 'Daily roll call, dressing/behaviour grades, and bulk edits.',
        roles: ['admin', 'teacher'],
        body: adminAttendance,
      },
      {
        slug: 'exams',
        title: 'Recording exam results',
        summary: 'Per-subject scores for the whole class in one form.',
        roles: ['admin', 'teacher'],
        body: adminExams,
      },
      {
        slug: 'quran',
        title: 'Tracking Qur\'an progress',
        summary: 'Hifdh, Tilawah, and Muraja\'ah sessions with surah/ayah ranges.',
        roles: ['admin', 'teacher'],
        body: adminQuran,
      },
      {
        slug: 'courses',
        title: 'Tracking course progress',
        summary: 'Class-coverage vs per-student modes, with one-tap unit marking.',
        roles: ['admin', 'teacher'],
        body: adminCourses,
      },
      {
        slug: 'sms',
        title: 'Sending SMS to parents',
        summary: 'Custom messages, auto fee reminders, and attendance alerts.',
        roles: ['admin'],
        body: adminSms,
      },
      {
        slug: 'fees-setup',
        title: 'Setting up fees',
        summary: 'Manual or automatic fee modes, schedules, and proration.',
        roles: ['admin'],
        body: adminFeesSetup,
      },
      {
        slug: 'fees-payments',
        title: 'Recording fee payments',
        summary: 'Log payments, generate family statements, edit history.',
        roles: ['admin'],
        body: adminFeesPayments,
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
