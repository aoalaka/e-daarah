import api from './api';

export const authService = {
  // Login for admin/teacher (scoped to madrasah)
  login: async (madrasahSlug, email, password, role) => {
    const response = await api.post('/auth/login', { email, password, role });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('madrasah', JSON.stringify(response.data.madrasah));
    }
    return response.data;
  },

  // Parent login (scoped to madrasah with tenant isolation)
  parentLogin: async (madrasahSlug, studentId, accessCode) => {
    const response = await api.post('/auth/parent-login', {
      studentId,
      accessCode,
      madrasahSlug
    });
    if (response.data.token) {
      localStorage.setItem('parentToken', response.data.token);
      localStorage.setItem('parentStudent', JSON.stringify(response.data.student));
      localStorage.setItem('madrasah', JSON.stringify(response.data.madrasah));
    }
    return response.data;
  },

  // Register new madrasah with admin
  registerMadrasah: async (data) => {
    const response = await api.post('/auth/register-madrasah', data);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('madrasah', JSON.stringify(response.data.madrasah));
    }
    return response.data;
  },

  // Teacher self-registration (scoped to madrasah)
  registerTeacher: async (madrasahSlug, data) => {
    const response = await api.post('/auth/register-teacher', { ...data, madrasahSlug });
    return response.data;
  },

  // Demo login - instant access, no password needed
  demoLogin: async (slug, role) => {
    const response = await api.post('/auth/demo-login', { slug, role });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('madrasah', JSON.stringify(response.data.madrasah));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('madrasah');
    localStorage.removeItem('parentToken');
    localStorage.removeItem('parentStudent');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getMadrasah: () => {
    const madrasahStr = localStorage.getItem('madrasah');
    return madrasahStr ? JSON.parse(madrasahStr) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  isParentAuthenticated: () => {
    return !!localStorage.getItem('parentToken');
  }
};
