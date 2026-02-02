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

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
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
