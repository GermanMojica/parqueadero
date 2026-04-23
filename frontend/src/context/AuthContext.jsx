// src/context/AuthContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';
import { authApi } from '../api/index';

const AuthContext = createContext(null);

// Rehidrata sesión desde sessionStorage si existe
function getInitialSession() {
  try {
    const token   = sessionStorage.getItem('token');
    const usuario = sessionStorage.getItem('usuario');
    if (token && usuario) return { token, usuario: JSON.parse(usuario) };
  } catch { /* corrupto */ }
  return null;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getInitialSession);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.login({ email, password });
      sessionStorage.setItem('token',   data.token);
      sessionStorage.setItem('usuario', JSON.stringify(data.usuario));
      setSession(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('usuario');
    setSession(null);
  }, []);

  const value = {
    usuario:        session?.usuario ?? null,
    token:          session?.token   ?? null,
    isAuthenticated: !!session,
    isAdmin:        session?.usuario?.rol === 'ADMIN',
    loading,
    error,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
