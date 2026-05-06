# Maintaining the User Guide site

The user-facing docs at `/docs` are markdown files under `articles/`. They're rendered through the `DocsArticle` component, listed in `manifest.js`, and kept honest by a freshness checker.

## Adding a new article

1. Drop a `.md` file in `frontend/src/docs/articles/`. Filename convention: `{category-id}-{slug}.md` (e.g. `admins-fees.md`).
2. Open `frontend/src/docs/manifest.js` and add an entry:
   ```js
   {
     slug: 'fees',
     title: 'Setting up fees',
     summary: 'Manual vs automatic fee modes and how proration works.',
     roles: ['admin'],
     body: import('...?raw'),  // see existing imports at top of manifest.js
   }
   ```
3. End every article with a `<!-- docs-meta -->` block (see "Source tracking" below).

## Source tracking — the rule that prevents drift

Every article must end with a comment block listing the source files it documents:

```markdown
<!-- docs-meta
sources:
  - frontend/src/pages/teacher/Dashboard.jsx#L2400-L2700
  - backend/src/routes/teacher.routes.js#L600-L800
last_audited: 2026-05-04
-->
```

Two simple rules:

1. **List every source file you read while writing the article.** Line ranges are optional but help future-you find the right block fast.
2. **Bump `last_audited` to today's date** every time you re-read those sources and confirm the article matches the current behaviour.

That's it. The `#L...` line ranges are decorative — only the file path is checked.

## When you change a feature

If you modify any file listed under `sources:` in any article, two things should happen in the same PR:

- Update the article wherever behaviour changed
- Bump `last_audited` to today

If you forget, the freshness checker will tell you.

## Running the freshness check

```bash
cd frontend
npm run docs-check          # human-readable report, exits 0
npm run docs-check-strict   # exits 1 if anything is stale (CI gate)
```

Output looks like:

```
📚 Docs freshness check

  ✅  frontend/src/docs/articles/getting-started-welcome.md  (audited 2026-05-04)
  ⚠️  frontend/src/docs/articles/admin-attendance.md  (audited 2026-05-04) — sources changed:
        frontend/src/pages/teacher/Dashboard.jsx  (modified 2026-05-06)

Summary: 4 fresh · 1 stale · 0 with errors
```

The script compares each source's last-commit date (via `git log`) to the article's `last_audited`. If a source has a newer commit, the article is stale.

## Style rules

- **Step-by-step.** Numbered steps when the order matters. Bullets when it doesn't.
- **Short.** Under ~250 words ideally. One job per article.
- **Quote real UI labels.** If the button says "Save Attendance", write *"Save Attendance"*, not *"Save"*.
- **Write what exists today.** Don't promise future behaviour. If something is on the roadmap, leave it out — we'll add it when we ship it.
- **Top of every article**: 1–2 sentence summary of what the reader will learn.
- **Bottom of every article**: a "What's next?" line linking to the natural next read.

## Embedding media

Markdown supports gif/img/video/mp4 inline. Drop files into `frontend/public/docs-media/` and reference them:

```markdown
![Recording attendance](/docs-media/attendance-record.gif)

<video src="/docs-media/onboarding-walkthrough.mp4" controls />
```

Both render at full width with rounded corners and a thin border.

## Categories

Categories are defined in `manifest.js`. Add a new one if your article doesn't fit:

```js
{ id: 'parents', title: 'For Parents', articles: [...] }
```

The category appears as a sidebar group automatically.
