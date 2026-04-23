// src/api/axios.config.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
});

// ── Request interceptor: adjunta el token a cada petición ──────────────────
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor: normaliza errores ────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Token expirado o inválido → limpiar sesión y redirigir
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    // Rechazar con el mensaje del servidor si existe
    const mensaje = error.response?.data?.error?.message || 'Error de conexión con el servidor';
    return Promise.reject(new Error(mensaje));
  },
);

export default api;
