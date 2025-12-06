import axios from 'axios';

export const TOKEN_KEYS = {
  admin: 'token_admin',
  doctor: 'token_doctor',
  nurse: 'token_nurse',
  receptionist: 'token_receptionist',
  pharmacist: 'token_pharmacist',
  lab_tech: 'token_lab_tech'
};

export const setRoleToken = (role, token) => {
  if (TOKEN_KEYS[role]) {
    localStorage.setItem(TOKEN_KEYS[role], token);
  }
};

export const clearRoleToken = (role) => {
  if (TOKEN_KEYS[role]) {
    localStorage.removeItem(TOKEN_KEYS[role]);
  }
};

export const clearAllTokens = () => {
  Object.values(TOKEN_KEYS).forEach(key => localStorage.removeItem(key));
  localStorage.removeItem('user'); // Clear legacy user object if any
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Helper to determine which token to use based on current path
const getActiveToken = () => {
  const path = window.location.pathname;
  if (path.startsWith('/admin')) return localStorage.getItem(TOKEN_KEYS.admin);
  if (path.startsWith('/doctor')) return localStorage.getItem(TOKEN_KEYS.doctor);
  if (path.startsWith('/nurse')) return localStorage.getItem(TOKEN_KEYS.nurse);
  if (path.startsWith('/reception')) return localStorage.getItem(TOKEN_KEYS.receptionist);
  if (path.startsWith('/pharmacy')) return localStorage.getItem(TOKEN_KEYS.pharmacist);
  if (path.startsWith('/lab')) return localStorage.getItem(TOKEN_KEYS.lab_tech);
  
  // Fallback: try to find any token if we are not in a specific module (e.g. profile)
  // or return the first found token
  for (const key of Object.values(TOKEN_KEYS)) {
    const token = localStorage.getItem(key);
    if (token) return token;
  }
  return null;
};

// Add token to requests
api.interceptors.request.use((config) => {
  const token = getActiveToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Optional: Redirect to login if 401, but be careful with multiple roles
      // For now, we let the UI handle the redirect or error message
    }
    return Promise.reject(error);
  }
);

export default api;
