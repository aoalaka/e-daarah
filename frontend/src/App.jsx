import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { PrivateRoute } from './components/PrivateRoute';
import { MadrasahProvider } from './contexts/MadrasahContext';

// Public pages
import Landing from './pages/Landing';
import MadrasahRegistration from './pages/MadrasahRegistration';

// Madrasah-scoped pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ParentLogin from './pages/ParentLogin';
import ParentReport from './pages/ParentReport';
import TeacherRegistration from './pages/TeacherRegistration';
import AdminDashboard from './pages/admin/Dashboard';
import TeacherDashboard from './pages/teacher/Dashboard';

// Super Admin pages
import SuperAdminLogin from './pages/superadmin/Login';
import SuperAdminDashboard from './pages/superadmin/Dashboard';
import MadrasahDetail from './pages/superadmin/MadrasahDetail';

import './App.css';

function MadrasahRoutes() {
  return (
    <MadrasahProvider>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="parent-login" element={<ParentLogin />} />
        <Route path="parent" element={<ParentReport />} />
        <Route path="register-teacher" element={<TeacherRegistration />} />

        <Route
          path="admin/*"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="teacher/*"
          element={
            <PrivateRoute allowedRoles={['teacher']}>
              <TeacherDashboard />
            </PrivateRoute>
          }
        />

        <Route path="unauthorized" element={<div className="unauthorized">Unauthorized Access</div>} />
        <Route path="*" element={<Navigate to="login" replace />} />
      </Routes>
    </MadrasahProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" closeButton richColors />
      <Routes>
        {/* Global public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<MadrasahRegistration />} />

        {/* Super Admin routes */}
        <Route path="/superadmin/login" element={<SuperAdminLogin />} />
        <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
        <Route path="/superadmin/madrasahs/:id" element={<MadrasahDetail />} />

        {/* Madrasah-scoped routes */}
        <Route path="/:madrasahSlug/*" element={<MadrasahRoutes />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
