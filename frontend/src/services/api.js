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
  const token = localStorage.getItem('token') || localStorage.getItem('parentToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Endpoints that should NOT trigger auto-redirect on 401/403
const AUTH_ENDPOINTS = [
  '/auth/login',
  '/auth/parent-login',
  '/auth/register',
  '/auth/register-madrasah',
  '/auth/register-teacher',
  '/auth/verify-email',
  '/auth/madrasah/',
  '/password/'
];

// Check if request URL is an auth endpoint
const isAuthEndpoint = (url) => {
  return AUTH_ENDPOINTS.some(endpoint => url?.includes(endpoint));
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

    // For other endpoints, redirect on 401/403 (session expired, unauthorized)
    if (error.response?.status === 401 || error.response?.status === 403) {
      const madrasah = JSON.parse(localStorage.getItem('madrasah') || '{}');

      // Clear auth data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('parentToken');
      localStorage.removeItem('parentStudent');

      // Redirect to madrasah-specific login or home
      if (madrasah?.slug) {
        window.location.href = `/${madrasah.slug}/login`;
      } else {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
