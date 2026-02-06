import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { PrivateRoute } from './components/PrivateRoute';
import { MadrasahProvider } from './contexts/MadrasahContext';
import SessionTimeout from './components/SessionTimeout';

// Public pages
import Landing from './pages/Landing';
import MadrasahRegistration from './pages/MadrasahRegistration';
import Pricing from './pages/Pricing';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Help from './pages/Help';
import Demo from './pages/Demo';
import SignIn from './pages/SignIn';
import NotFound from './pages/NotFound';

// Check if we're on the admin subdomain
const isAdminSubdomain = () => {
  const hostname = window.location.hostname;
  return hostname.startsWith('admin.');
};

// Madrasah-scoped pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
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
      <SessionTimeout />
      <Routes>
        <Route path="login" element={<Login />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="verify-email" element={<VerifyEmail />} />
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
  // If on admin subdomain, only show super admin routes
  if (isAdminSubdomain()) {
    return (
      <BrowserRouter>
        <Toaster position="top-right" closeButton richColors />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<SuperAdminLogin />} />
          <Route path="/dashboard" element={<SuperAdminDashboard />} />
          <Route path="/madrasahs/:id" element={<MadrasahDetail />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Toaster position="top-right" closeButton richColors />
      <Routes>
        {/* Global public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/register" element={<MadrasahRegistration />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/help" element={<Help />} />

        {/* Super Admin routes (also accessible via /superadmin on main domain) */}
        <Route path="/superadmin/login" element={<SuperAdminLogin />} />
        <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
        <Route path="/superadmin/madrasahs/:id" element={<MadrasahDetail />} />

        {/* Madrasah-scoped routes */}
        <Route path="/:madrasahSlug/*" element={<MadrasahRoutes />} />

        {/* 404 Page */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
