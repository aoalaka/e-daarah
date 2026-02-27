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

  // Parent login with phone + PIN
  parentLogin: async (madrasahSlug, phone, phoneCountryCode, pin) => {
    const response = await api.post('/auth/parent-login', {
      phone,
      phoneCountryCode,
      pin,
      madrasahSlug
    });
    if (response.data.token) {
      localStorage.setItem('parentToken', response.data.token);
      localStorage.setItem('parentChildren', JSON.stringify(response.data.children));
      localStorage.setItem('parentInfo', JSON.stringify(response.data.parent));
      localStorage.setItem('madrasah', JSON.stringify(response.data.madrasah));
    }
    return response.data;
  },

  // Parent registration (first-time PIN setup)
  parentRegister: async (madrasahSlug, phone, phoneCountryCode, pin, name) => {
    const response = await api.post('/auth/parent-register', {
      phone,
      phoneCountryCode,
      pin,
      name,
      madrasahSlug
    });
    if (response.data.token) {
      localStorage.setItem('parentToken', response.data.token);
      localStorage.setItem('parentChildren', JSON.stringify(response.data.children));
      localStorage.setItem('parentInfo', JSON.stringify(response.data.parent));
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
    localStorage.removeItem('parentChildren');
    localStorage.removeItem('parentInfo');
  },

  parentLogout: () => {
    localStorage.removeItem('parentToken');
    localStorage.removeItem('parentStudent');
    localStorage.removeItem('parentChildren');
    localStorage.removeItem('parentInfo');
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
