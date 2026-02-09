# AI Agent Handoff Prompt

Copy everything below this line and give it to a new AI agent session:

---

## Context

You are continuing development on **e-Daarah** (https://e-daarah.com), a multi-tenant SaaS platform for managing Islamic schools (Madrasahs). The codebase is at `/Users/aalaka/Documents/bigIdeas/madrasah-admin`.

## Read These Files First

Before doing anything, read these files to understand the full system:

1. **`.github/copilot-instructions.md`** — Complete project architecture, tech stack, conventions, database schema, API routes, frontend patterns, and design approach. THIS IS YOUR PRIMARY REFERENCE.
2. **`ROADMAP.md`** — Full roadmap with completed phases (0-7) and planned Phase 8 features.
3. **`database/init.sql`** — Database schema (the source of truth for table structures).

## Tech Stack

- **Frontend**: React 18 + Vite + React Router (SPA)
- **Backend**: Node.js + Express (ES Modules — `import/export` everywhere)
- **Database**: MySQL 8.0 (hosted on Railway)
- **Auth**: JWT + bcryptjs
- **Email**: Resend SDK
- **Payments**: Stripe (checkout, webhooks, customer portal)
- **Hosting**: Railway (backend + DB), Railway or Vercel (frontend)

## Architecture (Multi-Tenant)

This is a **multi-tenant** system. Almost every table has a `madrasah_id` column for tenant isolation. Every query MUST filter by `madrasah_id` and `deleted_at IS NULL` (soft deletes).

### Key Relationships
- `madrasahs` → top-level tenant (each school is a madrasah)
- `users` → belong to a madrasah (role: admin/teacher)
- `sessions` → academic years, belong to a madrasah
- `semesters` → belong to a session (NOT directly to madrasah)
- `classes` → belong to a madrasah
- `students` → belong to a madrasah, assigned to a class
- `class_teachers` → many-to-many (class_id + user_id, NOT teacher_id)
- `attendance` → has madrasah_id, student_id, class_id, semester_id, user_id
- `exam_performance` → has madrasah_id, student_id, semester_id, user_id

### Important Column Naming
- The `class_teachers` table uses `user_id` (NOT `teacher_id`)
- The `semesters` table has NO `madrasah_id` — it connects through `sessions.madrasah_id`
- All tables with soft deletes have `deleted_at` (NULL = active, timestamp = deleted)

## Design Philosophy

- **Mobile-first** — Most teachers mark attendance on phones
- **Minimalist aesthetic** — Ample whitespace, clean layouts, professional appearance
- **Restrained color palette** — 2-3 colors max, no excessive gradients
- **Simple icons used sparingly** — Prefer text labels where practical
- **Touch targets** — Minimum 44x44px for interactive elements
- **Responsive breakpoints** — Adapt naturally across devices

### CSS Conventions (Admin Dashboard)
The admin dashboard uses a design system in `Dashboard.css`:
- Primary color: `#0a0a0a` (near-black)
- `.btn-primary` (black bg), `.btn-secondary` (white bg, black border), `.btn-sm`
- `.card`, `.table`, `.section-header`
- `.form-input`, `.form-select`, `.form-textarea`
- `.badge`, `.badge-success`, `.badge-muted`
- `.empty` state for no-data messages

### SuperAdmin Dashboard
Separate CSS in `SuperAdmin.css` with its own design system:
- `.superadmin` wrapper, `.stat-card`, `.data-table`
- `.risk-badge` (critical/high/medium/low), `.status-badge`, `.plan-badge`

## Backend Patterns

```javascript
// Route pattern — ALWAYS follow this
router.post('/endpoint', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const madrasahId = req.user.madrasahId; // ALWAYS use for tenant isolation
    const [result] = await pool.query(
      'SELECT * FROM table WHERE madrasah_id = ? AND deleted_at IS NULL',
      [madrasahId]
    );
    res.json(result);
  } catch (error) {
    console.error('Descriptive error:', error);
    res.status(500).json({ error: 'User-friendly message' });
  }
});
```

- **Always** use parameterized queries (never string interpolation)
- **Always** filter by `madrasah_id` and `deleted_at IS NULL`
- **Always** add `authenticateToken` + `requireRole()` middleware
- Mount new route files in `backend/src/server.js`

## Frontend Patterns

```jsx
// Page component pattern
import api from '../../services/api';

function MyPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const response = await api.get('/endpoint');
      setData(response.data);
    } finally {
      setLoading(false);
    }
  };

  // ... render
}
```

- `api` from `services/api.js` has axios interceptors that auto-attach JWT token
- CSS modules per component (e.g., `MyPage.css`)
- Pages go in `frontend/src/pages/{role}/`
- Routes defined in `frontend/src/App.jsx`

## Database Migrations

- Migration files go in `backend/migrations/`
- Named sequentially: `010_description.sql`, `011_description.sql`, etc.
- Current highest: check the migrations folder for the latest number
- Run on production via: create a `run-NNN.mjs` script that parses `MYSQL_URL` env var
- **Production DB**: database name is `railway` (NOT `madrasah_admin`)
- **CRITICAL**: When connecting locally to prod, use `MYSQL_PUBLIC_URL` (public hostname), not `MYSQL_URL` (internal Railway hostname)

## Deployment

```bash
# Backend
cd /path/to/project
railway service e-daarah-backend-prod
railway up

# Frontend
railway service e-daarah-frontend-prod
railway up
```

Both services build remotely on Railway even if CLI is interrupted after upload.

## Current Production State

- **DB host (public)**: ballast.proxy.rlwy.net:49251
- **DB user**: root
- **DB name**: railway
- **Frontend**: https://www.e-daarah.com / https://admin.e-daarah.com (superadmin)
- **Backend**: https://api.e-daarah.com

## Plan Gating

Features are gated by pricing plan (trial/standard/plus):
- Middleware in `backend/src/middleware/plan-limits.middleware.js`
- Plus-only features: CSV export, bulk upload, print reports, analytics, and new premium features
- Check `requireFeature('feature_name')` middleware pattern

## What's Been Built (Phases 0-7 Complete)

- Full auth (login, register, password reset, email verification)
- Admin dashboard (sessions, semesters, classes, teachers, students CRUD)
- Teacher dashboard (attendance, dressing/behavior grades, exam recording)
- Parent portal (report cards, login with student_id + surname)
- Stripe billing (checkout, webhooks, customer portal, plan enforcement)
- Trial system (14-day, email reminders, expired state)
- Security (login lockout, session timeout, audit logging)
- Analytics dashboard (Plus) — attendance trends, at-risk students, exam analytics
- Print-friendly reports, CSV export, bulk student upload (Plus)
- Super admin dashboard (madrasah management, churn risk, announcements, tickets, usage insights)
- Help center, terms, privacy pages

## Phase 8 Features (TODO — see ROADMAP.md)

8.1 Academic Calendar, 8.2 Email Attendance Alerts, 8.3 Quran Progress Tracking, 8.4 Teacher Performance Dashboard, 8.5 Student Promotion/Rollover, 8.6 In-App Notifications, 8.7 Parent Communication, 8.8 Multi-Language, 8.9 Fee Management, 8.10 Mobile PWA

---

**When implementing a new feature, always:**
1. Write the migration SQL first
2. Add backend routes with proper auth + tenant isolation
3. Build frontend UI following existing design patterns
4. Test locally, then commit + deploy both services
5. Verify in production via backend logs (`railway logs`)
