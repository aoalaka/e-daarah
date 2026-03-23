import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import SplashScreen from './components/SplashScreen';
import { PrivateRoute } from './components/PrivateRoute';
import { MadrasahProvider } from './contexts/MadrasahContext';
import SessionTimeout from './components/SessionTimeout';
import PullToRefresh from './components/PullToRefresh';

// Public pages
import Landing from './pages/Landing';
import MadrasahRegistration from './pages/MadrasahRegistration';
import Pricing from './pages/Pricing';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Help from './pages/Help';
import Demo from './pages/Demo';
import SignIn from './pages/SignIn';
import BlogIndex from './pages/blog/BlogIndex';
import BlogArticle from './pages/blog/BlogArticle';
import SchoolsDirectory from './pages/schools/SchoolsDirectory';
import SchoolProfile from './pages/schools/SchoolProfile';
import NotFound from './pages/NotFound';

// Check if we're on the admin subdomain
const isAdminSubdomain = () => {
  const hostname = window.location.hostname;
  return hostname.startsWith('admin.');
};

// Check if running as installed PWA (standalone mode)
const isStandalonePWA = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

// Madrasah-scoped pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import ParentLogin from './pages/ParentLogin';
import ParentReport from './pages/ParentReport';
import TeacherRegistration from './pages/TeacherRegistration';
import StudentApplication from './pages/StudentApplication';
import AdminDashboard from './pages/admin/Dashboard';
import TeacherDashboard from './pages/teacher/Dashboard';
import SoloDashboard from './pages/solo/Dashboard';

// Super Admin pages
import SuperAdminLogin from './pages/superadmin/Login';
import SuperAdminDashboard from './pages/superadmin/Dashboard';
import MadrasahDetail from './pages/superadmin/MadrasahDetail';

import './App.css';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

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
        <Route path="enroll" element={<StudentApplication />} />

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

        <Route
          path="solo/*"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <SoloDashboard />
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
  const isMobile = window.innerWidth <= 768;
  const splashShown = sessionStorage.getItem('splash_shown');
  const [showSplash, setShowSplash] = useState(isMobile && isStandalonePWA() && !splashShown);

  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem('splash_shown', '1');
    setShowSplash(false);
  }, []);

  // If on admin subdomain, only show super admin routes
  if (isAdminSubdomain()) {
    return (
      <BrowserRouter>
        <ScrollToTop />
        <PullToRefresh>
          <Toaster position={window.innerWidth <= 768 ? 'bottom-center' : 'top-right'} closeButton richColors duration={3000} />
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<SuperAdminLogin />} />
            <Route path="/dashboard" element={<SuperAdminDashboard />} />
            <Route path="/madrasahs/:id" element={<MadrasahDetail />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </PullToRefresh>
      </BrowserRouter>
    );
  }

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <BrowserRouter>
        <ScrollToTop />
        <PullToRefresh>
          <Toaster position={window.innerWidth <= 768 ? 'bottom-center' : 'top-right'} closeButton richColors duration={3000} />
          <Routes>
          {/* Global public routes */}
          <Route path="/" element={isStandalonePWA() ? <Navigate to="/signin" replace /> : <Landing />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/register" element={<MadrasahRegistration />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/help" element={<Help />} />
          <Route path="/blog" element={<BlogIndex />} />
          <Route path="/blog/:slug" element={<BlogArticle />} />
          <Route path="/schools" element={<SchoolsDirectory />} />
          <Route path="/schools/:slug" element={<SchoolProfile />} />

          {/* Super Admin routes (also accessible via /superadmin on main domain) */}
          <Route path="/superadmin/login" element={<SuperAdminLogin />} />
          <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
          <Route path="/superadmin/madrasahs/:id" element={<MadrasahDetail />} />

          {/* Madrasah-scoped routes */}
          <Route path="/:madrasahSlug/*" element={<MadrasahRoutes />} />

          {/* 404 Page */}
          <Route path="*" element={<NotFound />} />
          </Routes>
        </PullToRefresh>
      </BrowserRouter>
    </>
  );
}

export default App;
