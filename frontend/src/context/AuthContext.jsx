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

import { notificacionesApi } from '../api/index';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function registrarPushSilencioso() {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;
    
    let sub = await registration.pushManager.getSubscription();
    if (!sub) {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });
    }
    await notificacionesApi.suscribirPush(sub.toJSON());
  } catch (err) {
    console.error('Error al registrar web push silencioso:', err);
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getInitialSession);
  const [sedeActual, setSedeActualState] = useState(() => {
    const s = sessionStorage.getItem('sedeActual');
    return s ? Number(s) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const setSedeActual = useCallback((id) => {
    setSedeActualState(id);
    if (id) {
      sessionStorage.setItem('sedeActual', id);
    } else {
      sessionStorage.removeItem('sedeActual');
    }
    // Opcional: recargar la app o emitir evento para que los componentes se refrequen
    window.dispatchEvent(new Event('sedeChanged'));
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.login({ email, password });
      sessionStorage.setItem('token',   data.token);
      sessionStorage.setItem('usuario', JSON.stringify(data.usuario));
      setSession(data);
      
      // Solicitar permiso de notificaciones push al hacer login si aún no se ha definido
      if ('Notification' in window && 'serviceWorker' in navigator) {
        if (Notification.permission === 'default') {
          Notification.requestPermission().then((perm) => {
            if (perm === 'granted') {
              setTimeout(registrarPushSilencioso, 1000);
            }
          });
        } else if (Notification.permission === 'granted') {
          setTimeout(registrarPushSilencioso, 1000);
        }
      }
      
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
    sessionStorage.removeItem('sedeActual');
    setSession(null);
    setSedeActualState(null);
  }, []);

  const value = {
    usuario:        session?.usuario ?? null,
    token:          session?.token   ?? null,
    isAuthenticated: !!session,
    isAdmin:        session?.usuario?.rol === 'ADMIN',
    isSuperAdmin:   session?.usuario?.rol === 'SUPERADMIN',
    sedeActual,
    setSedeActual,
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
