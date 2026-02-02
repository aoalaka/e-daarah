# Madrasah Admin System

A comprehensive administrative system for managing Islamic schools (Madrasah), built with React, Node.js, Express, and MySQL.

## Features

### Admin Features
- Create and manage semesters
- Set up classes with school days (typically 2 days per week)
- Assign multiple teachers to classes
- View all students and teachers

### Teacher Features
- View assigned classes
- Add students to classes
- Record daily attendance
- Record dressing and behavioral grades
- Enter semester exam performance

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Node.js + Express
- **Database**: MySQL 8.0
- **Authentication**: JWT
- **Containerization**: Docker + Docker Compose

## Project Structure

```
madrasah-admin/
├── backend/                 # Node.js Express API
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── middleware/     # Authentication middleware
│   │   ├── routes/         # API routes
│   │   └── server.js       # Entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/                # React application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── App.jsx
│   ├── Dockerfile
│   └── package.json
├── database/                # Database initialization
│   └── init.sql            # Schema and sample data
└── docker-compose.yml       # Multi-container setup
```

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- MySQL 8.0 (for local development)

### Running with Docker (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd madrasah-admin
```

2. Start all services:
```bash
docker-compose up -d
```

3. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- MySQL: localhost:3306

### Local Development

#### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run dev
```

#### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env if needed
npm run dev
```

## Database Schema

### Main Tables
- **admins**: System administrators
- **teachers**: Teaching staff
- **semesters**: Academic periods
- **classes**: Class information with school days
- **students**: Student records
- **class_teachers**: Many-to-many relationship
- **attendance**: Daily attendance and grades
- **exam_performance**: Semester exam results

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login for admin/teacher

### Admin Routes (Requires admin role)
- `POST /api/admin/semesters` - Create semester
- `POST /api/admin/classes` - Create class
- `POST /api/admin/classes/:classId/teachers` - Assign teacher

### Teacher Routes (Requires teacher role)
- `GET /api/teacher/my-classes` - Get assigned classes
- `POST /api/teacher/classes/:classId/students` - Add student

### Attendance Routes (Requires teacher role)
- `POST /api/attendance` - Record attendance
- `POST /api/attendance/exam-performance` - Record exam score
- `GET /api/attendance/class/:classId` - View attendance

## Default Credentials

**Admin:**
- Email: admin@madrasah.com
- Password: admin123

**Teacher:**
- Email: teacher@madrasah.com
- Password: teacher123

⚠️ Change these credentials in production!

## Docker Hub Deployment

Build and push images:
```bash
# Build images
docker-compose build

# Tag images
docker tag madrasah-admin-backend:latest yourusername/madrasah-backend:latest
docker tag madrasah-admin-frontend:latest yourusername/madrasah-frontend:latest

# Push to Docker Hub
docker push yourusername/madrasah-backend:latest
docker push yourusername/madrasah-frontend:latest
```

## Vercel Deployment (Frontend)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy frontend:
```bash
cd frontend
vercel --prod
```

3. Set environment variables in Vercel dashboard:
- `VITE_API_URL`: Your backend API URL

## Security Notes

- Change JWT_SECRET in production
- Use strong passwords for database
- Enable HTTPS in production
- Implement rate limiting
- Add input validation

## License

MIT
