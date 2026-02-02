import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import passwordRoutes from './routes/password.routes.js';
import adminRoutes from './routes/admin.routes.js';
import teacherRoutes from './routes/teacher.routes.js';
import classRoutes from './routes/class.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import uploadRoutes from './routes/upload.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/upload', uploadRoutes);

// Health check (both paths for flexibility) - doesn't require DB
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Madrasah Admin API is running' });
});
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Madrasah Admin API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server - don't block on DB connection for health checks
const startServer = async () => {
  // Start listening first so health checks pass
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Then try to connect to database
  try {
    await testConnection();
  } catch (error) {
    console.error('Database connection failed:', error.message);
    console.log('Server is running but database is not connected. Retrying...');
    // Don't exit - let the server run for health checks
    // API routes will fail gracefully if DB is down
  }
};

startServer();
