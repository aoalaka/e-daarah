import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { testConnection } from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import passwordRoutes from './routes/password.routes.js';
import adminRoutes from './routes/admin.routes.js';
import teacherRoutes from './routes/teacher.routes.js';
import classRoutes from './routes/class.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import superadminRoutes from './routes/superadmin.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Request ID middleware for logging
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')?.substring(0, 50)
    }));
  });
  next();
});

// Rate limiting - general API
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting - strict for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting - password reset (very strict)
const passwordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: { error: 'Too many password reset attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply general rate limiting to all API routes
app.use('/api/', generalLimiter);

// Body parsing with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Apply strict rate limiting to auth routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/parent-login', authLimiter);
app.use('/api/auth/register-madrasah', authLimiter);
app.use('/api/auth/register-teacher', authLimiter);
app.use('/api/password', passwordLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/superadmin', superadminRoutes);

// Health check (both paths for flexibility) - doesn't require DB
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Madrasah Admin API is running' });
});
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Madrasah Admin API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(JSON.stringify({
    requestId: req.requestId,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  }));

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    requestId: req.requestId
  });
});

// Start server - don't block on DB connection for health checks
const startServer = async () => {
  // Start listening first so health checks pass
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Then try to connect to database
  try {
    await testConnection();
  } catch (error) {
    console.error('Database connection failed:', error.message);
    console.log('Server is running but database is not connected. Retrying...');
  }
};

startServer();
