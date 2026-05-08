import axios from 'axios';

const rawUrl = import.meta.env.VITE_API_URL || '/api';
const finalUrl = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl.replace(/\/$/, '')}/api`;

const api = axios.create({
  baseURL: finalUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// ── Request interceptor ─────────────────────────────
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  
  const sedeActual = sessionStorage.getItem('sedeActual');
  if (sedeActual) config.headers['X-Sede-Id'] = sedeActual;

  return config;
});

// ── Response interceptor ────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('usuario');
      window.location.href = '/login';
    }

    const mensaje =
      error.response?.data?.error?.message ||
      'Error de conexión con el servidor';

    return Promise.reject(new Error(mensaje));
  }
);

export default api;