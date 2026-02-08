import axios from 'axios';

// Use VITE_API_URL from environment, fallback to relative /api for local dev
const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  // If the request already has an Authorization header set explicitly, don't override it
  if (config.headers.Authorization) {
    return config;
  }

  // On parent portal routes, prefer the parent token
  const isParentRoute = window.location.pathname.includes('/parent');
  const parentToken = localStorage.getItem('parentToken');
  const userToken = localStorage.getItem('token');

  const token = isParentRoute && parentToken ? parentToken : (userToken || parentToken);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Endpoints that should NOT trigger auto-redirect on 401/403
const AUTH_ENDPOINTS = [
  '/auth/login',
  '/auth/parent-login',
  '/auth/parent/report',
  '/auth/register',
  '/auth/register-madrasah',
  '/auth/register-teacher',
  '/auth/verify-email',
  '/auth/madrasah/',
  '/password/'
];

// Plan-related error codes that should NOT trigger logout
const PLAN_ERROR_CODES = [
  'STUDENT_LIMIT_REACHED',
  'TEACHER_LIMIT_REACHED',
  'CLASS_LIMIT_REACHED',
  'TRIAL_EXPIRED',
  'SUBSCRIPTION_INACTIVE',
  'PAYMENT_PAST_DUE',
  'UPGRADE_REQUIRED'
];

// Check if request URL is an auth endpoint
const isAuthEndpoint = (url) => {
  return AUTH_ENDPOINTS.some(endpoint => url?.includes(endpoint));
};

// Check if error is a plan-related error (should NOT logout)
const isPlanError = (error) => {
  const code = error.response?.data?.code;
  return code && PLAN_ERROR_CODES.includes(code);
};

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url;

    // Don't auto-redirect for auth endpoints - let the component handle the error
    if (isAuthEndpoint(requestUrl)) {
      return Promise.reject(error);
    }

    // Don't redirect for plan-related errors - user should see error message, not be logged out
    if (isPlanError(error)) {
      return Promise.reject(error);
    }

    // For 401 (unauthorized/session expired), redirect to login
    // Don't redirect on 403 - it may be a permission issue that doesn't require logout
    if (error.response?.status === 401) {
      const isParentRoute = window.location.pathname.includes('/parent');

      // Parent portal: only clear parent tokens, redirect to parent login
      if (isParentRoute) {
        const pathParts = window.location.pathname.split('/');
        const slug = pathParts[1] || '';
        localStorage.removeItem('parentToken');
        localStorage.removeItem('parentStudent');
        if (slug) {
          window.location.href = `/${slug}/parent-login`;
        }
        return Promise.reject(error);
      }

      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const isDemo = user?.isDemo;
      const madrasah = JSON.parse(localStorage.getItem('madrasah') || '{}');

      // Clear auth data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('parentToken');
      localStorage.removeItem('parentStudent');

      // Demo users go back to demo page
      if (isDemo) {
        window.location.href = '/demo';
      } else if (madrasah?.slug) {
        window.location.href = `/${madrasah.slug}/login`;
      } else {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
