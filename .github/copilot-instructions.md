# Madrasah Admin System - AI Agent Instructions

## Project Overview
Administrative system for managing Islamic schools (Madrasah) with role-based access for admins and teachers. Admins manage semesters, classes, and teacher assignments. Teachers handle student enrollment, daily attendance, behavioral/dressing grades, and semester exam performance.

## Tech Stack
- **Frontend**: React 18 + Vite + React Router
- **Backend**: Node.js + Express (ES Modules)
- **Database**: MySQL 8.0
- **Authentication**: JWT with bcryptjs
- **Deployment**: Docker + Docker Compose, Frontend on Vercel

## Architecture

### Directory Structure
```
madrasah-admin/
├── backend/          # Express API server
│   ├── src/
│   │   ├── config/database.js       # MySQL connection pool
│   │   ├── middleware/auth.middleware.js  # JWT authentication
│   │   ├── routes/                  # API endpoints by feature
│   │   └── server.js                # Entry point
│   └── Dockerfile
├── frontend/         # React SPA
│   ├── src/
│   │   ├── components/PrivateRoute.jsx    # Route protection
│   │   ├── pages/{admin,teacher}/         # Role-based dashboards
│   │   ├── services/{api,auth.service}.js # API client & auth
│   │   └── App.jsx                        # Router setup
│   ├── Dockerfile & nginx.conf
├── database/init.sql                # Schema with sample data
└── docker-compose.yml               # 3-service orchestration
```

### Database Schema
**Key Tables**: admins, teachers, sessions, semesters, classes, students, class_teachers (many-to-many), attendance, exam_performance

**Sessions Table**: id, name, start_date, end_date, is_active (only ONE session can be active at a time)

**Semesters Table**: id, session_id (FK to sessions), name, start_date, end_date, is_active (only ONE semester can be active at a time)

**Teachers Table**: id, first_name, last_name, staff_id (VARCHAR(5) UNIQUE), email (UNIQUE), password, phone, created_at

**Students Table**: id, first_name, last_name, student_id (VARCHAR(6) UNIQUE), class_id (nullable, SET NULL on delete), next_of_kin_name, next_of_kin_relationship, next_of_kin_phone, notes (TEXT), gender ENUM('Male', 'Female'), created_at

**Password Requirements**: Minimum 8 characters with uppercase, lowercase, number, and symbol

**Important Relationships**:
- Sessions → Semesters (1:N) - hierarchical academic year structure
- Semesters → Attendance (1:N) - attendance records linked to semesters
- Classes (persistent student groups, not tied to semesters)
- Classes ↔ Teachers (N:M via class_teachers)
- Students → Classes (N:1, nullable)
- Attendance → Students + Classes + Semesters + Teachers
- JSON field: `classes.school_days` stores array like `["Monday", "Wednesday"]`

**Active Session/Semester Logic**:
- Only ONE session can have is_active = true at any time
- Only ONE semester can have is_active = true at any time
- Backend automatically deactivates other sessions/semesters when setting one as active
- Teachers see only the active semester (read-only, auto-selected)

### API Routes
- `/api/auth/login` - Role-based login (admin/teacher)
- `/api/auth/parent-login` - Parent login with student_id and surname (last_name)
- `/api/auth/parent/report` - GET student report for authenticated parent
- `/api/auth/register-teacher` - Teacher self-registration with staff_id, email, password
- `/api/admin/*` - Admin-only (create semesters, classes, assign teachers, CRUD teachers/students)
  - `/api/admin/sessions` - GET (list), POST (create with auto-deactivation of other sessions)
  - `/api/admin/sessions/:id` - PUT (update with auto-deactivation), DELETE (delete)
  - `/api/admin/semesters` - GET (list), POST (create with auto-deactivation of other semesters)
  - `/api/admin/semesters/:id` - PUT (update with auto-deactivation), DELETE (delete)
  - `/api/admin/teachers` - GET (list), POST (create with default password = staff_id)
  - `/api/admin/teachers/:id` - PUT (update), DELETE (delete)
  - `/api/admin/students` - GET (list with class_name), POST (create)
  - `/api/admin/students/:id` - PUT (update), DELETE (delete)
  - `/api/admin/students/:id/report` - GET detailed student report (attendance, exams, stats)
  - `/api/admin/students/:id/comment` - PUT update overall teacher comment
  - `/api/admin/classes/:classId/attendance-performance` - GET class attendance records
  - `/api/admin/classes/:classId/exam-performance` - GET class exam records
- `/api/teacher/*` - Teacher-only (view classes, record attendance, exam performance)
  - `/api/teacher/my-classes` - GET classes where teacher is assigned
  - `/api/teacher/classes/:classId/students` - GET students in a class (with authorization check)
  - `/api/teacher/classes/:classId/attendance/:date` - GET attendance records for a specific date (filtered by active semester)
  - `/api/teacher/classes/:classId/attendance` - POST single attendance record (present, dressing_grade, behavior_grade, notes)
  - `/api/teacher/classes/:classId/attendance/bulk` - POST bulk attendance for all students in class (requires semester_id)
  - `/api/teacher/classes/:classId/exam-performance` - GET/POST exam performance records
- `/api/attendance/*` - Teacher-only (record attendance, dressing/behavior grades, exam scores)
- `/api/classes/*` - Shared (view classes, students)

**Authentication Flow**: JWT in localStorage → axios interceptor adds `Authorization: Bearer <token>` → middleware validates role

**Active Session/Semester Enforcement**:
- POST/PUT `/admin/sessions` - Automatically deactivates all other sessions if is_active=true
- POST/PUT `/admin/semesters` - Automatically deactivates all other semesters if is_active=true
- Teachers see only the active semester (cannot change)

## Development Workflow

### Local Development
```bash
# Backend
cd backend && npm install
cp .env.example .env  # Configure DB_HOST=localhost for local MySQL
npm run dev           # Uses nodemon

# Frontend
cd frontend && npm install
cp .env.example .env  # Set VITE_API_URL=http://localhost:5000/api
npm run dev           # Runs on port 5173/5174

# Database (if using Docker)
docker run --name madrasah-mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=madrasah_admin -p 3306:3306 -d mysql:8.0
```

### Docker Development
```bash
docker-compose up -d       # Starts mysql, backend, frontend
docker-compose logs -f     # View logs
docker-compose down -v     # Stop and remove volumes
```

**Services**:
- MySQL: Port 3306, auto-initializes with `database/init.sql`
- Backend: Port 5000, waits for MySQL health check
- Frontend: Port 3000 (nginx), proxies `/api` to backend

### Testing
```bash
# Quick health check
curl http://localhost:5000/health

# Login test (admin)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@madrasah.com","password":"admin123","role":"admin"}'
```

## Code Conventions

### Backend Patterns
- **ES Modules**: All files use `import/export` (package.json has `"type": "module"`)
- **Route Middleware**: Auth routes use `authenticateToken` + `requireRole('admin'/'teacher')`
- **Database**: Use connection pool from `config/database.js`, always use parameterized queries
- **Error Handling**: Catch blocks return `{ error: 'message' }` with appropriate status code

Example route pattern:
```javascript
router.post('/endpoint', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const [result] = await pool.query('INSERT INTO...', [params]);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed message' });
  }
});
```

### Frontend Patterns
- **Routing**: `PrivateRoute` wrapper checks auth + role before rendering
- **Public Routes**: `/login`, `/register-teacher`, `/parent-login` (no auth required)
- **Parent Routes**: `/parent` - student report view (requires parent JWT token)
- **API Calls**: Import `api` from `services/api.js` (pre-configured axios with interceptors)
- **Auth State**: `authService` manages localStorage (`token`, `user`)
- **Component Structure**: Pages in `pages/{role}/`, shared components in `components/`
- **Styling**: CSS modules per component (e.g., `Login.css`, `Dashboard.css`)
- **Admin Features**: 
  - Full CRUD on teachers (first_name, last_name, staff_id, email, phone) and students (student_id, next_of_kin fields, class assignment)
  - Sessions and Semesters management with automatic active enforcement
  - View class attendance performance and exam scores
  - Generate detailed student reports (attendance rate, dressing/behavior grades, exam results)
  - Add overall comments to student records
  - Filter reports by semester
- **Parent Portal**:
  - Public route at `/parent-login` - login with student_id and surname
  - View student attendance, dressing/behavior performance, exam scores
  - Filter by semester
  - Read-only access to student report
  - No authentication required for initial access, JWT token after login
- **Teacher Registration**: Public form at `/register-teacher` with validation (3-digit staff_id, password confirmation)
- **Teacher Dashboard Features**:
  - View assigned classes
  - **Active semester is auto-selected and read-only** (cannot change)
  - Record daily attendance (present/absent checkbox)
  - Grade student dressing performance (Excellent/Good/Fair/Poor)
  - Grade student behavior (Excellent/Good/Fair/Poor)
  - Add notes for each student
  - Bulk save attendance for entire class
  - Record exam performance (date, type, score, notes)
  - View exam history per class

Example protected component:
```jsx
<PrivateRoute allowedRoles={['admin']}>
  <AdminDashboard />
</PrivateRoute>
```

## Docker & Deployment

### Building for Production
```bash
docker-compose build
docker tag madrasah-admin-backend:latest yourusername/madrasah-backend:latest
docker tag madrasah-admin-frontend:latest yourusername/madrasah-frontend:latest
docker push yourusername/madrasah-backend:latest
docker push yourusername/madrasah-frontend:latest
```

### Vercel Frontend Deployment
```bash
cd frontend
vercel --prod
# Set env var: VITE_API_URL=https://your-backend-url.com/api
```

**Note**: Backend needs separate hosting (Railway, Render, AWS, etc.)

## Environment Variables

### Backend (.env)
```
DB_HOST=mysql            # Use 'localhost' for local dev, 'mysql' in Docker
JWT_SECRET=<random-32-char-string>  # MUST change in production
CORS_ORIGIN=http://localhost:5173   # Update for production frontend URL
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api  # Backend API base URL
```

## Domain-Specific Notes
- **School Days**: Stored as JSON array in `classes.school_days`, typically `["Monday", "Wednesday"]`
- **Grades**: Enum values: 'Excellent', 'Good', 'Fair', 'Poor' for dressing/behavior
- **Default Credentials**: admin@madrasah.com / teacher@madrasah.com (password: admin123/teacher123)
  - **⚠️ Passwords in init.sql are placeholder hashes - generate real bcrypt hashes before production**

## Common Tasks

### Add New API Endpoint
1. Create route in `backend/src/routes/{feature}.routes.js`
2. Add authentication middleware if needed
3. Import and mount in `backend/src/server.js`
4. Create corresponding service function in `frontend/src/services/`

### Add New Page
1. Create component in `frontend/src/pages/{role}/NewPage.jsx`
2. Add Route in `frontend/src/App.jsx` or dashboard
3. Update navigation in dashboard sidebar

### Update Database Schema
1. Modify `database/init.sql`
2. Recreate containers: `docker-compose down -v && docker-compose up -d`
3. For production: Write migration script, run before deployment

## Validation Rules (Updated Feb 1, 2026)
- **Passwords**: Minimum 8 characters, must contain uppercase, lowercase, number, and symbol
- **Staff IDs**: Exactly 5 digits (e.g., 12345, 00384)
- **Student IDs**: Exactly 6 digits (e.g., 123456, 000815)
- **Exam Scores**: Step 0.1 for decimal precision (e.g., 87.3, 92.7)
- **Semester Dates**: Must be within parent session date range, cannot overlap with other semesters

### Design approach
- Design with a mobile-first approach prioritizing clean layouts and intuitive navigation
- Use a minimalist aesthetic with ample whitespace and clear visual hierarchy
- Maintain professional appearance through consistent typography and spacing
- Apply a restrained color palette (2-3 colors maximum) avoiding excessive gradients
- Use simple, functional icons sparingly - prefer text labels where practical
- Ensure all interactive elements have appropriate touch targets (minimum 44x44px)
- Implement responsive breakpoints that adapt naturally across device sizes
---
**Last Updated**: February 1, 2026
**Status**: Core functionality complete - attendance tracking, behavior/dressing grading, and exam performance recording fully implemented 
