// src/context/ParqueaderoContext.jsx
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { espaciosApi } from '../api/index';
import { useAuth }     from './AuthContext';

const ParqueaderoContext = createContext(null);

const POLL_INTERVAL_MS = 30_000; // 30 segundos

export function ParqueaderoProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [resumen, setResumen]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState(null);
  const intervalRef             = useRef(null);

  const fetchResumen = useCallback(async () => {
    try {
      setError(null);
      const data = await espaciosApi.getResumen();
      setResumen(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Inicia polling cuando hay sesión activa
  useEffect(() => {
    if (!isAuthenticated) {
      clearInterval(intervalRef.current);
      setResumen([]);
      return;
    }
    setLoading(true);
    fetchResumen();
    intervalRef.current = setInterval(fetchResumen, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [isAuthenticated, fetchResumen]);

  const value = {
    resumen,       // Array de { tipo_vehiculo, capacidad_total, disponibles, ocupados, ... }
    loading,
    error,
    refetch: fetchResumen,  // Para llamar manualmente tras registrar entrada/salida
  };

  return (
    <ParqueaderoContext.Provider value={value}>
      {children}
    </ParqueaderoContext.Provider>
  );
}

export function useParqueadero() {
  const ctx = useContext(ParqueaderoContext);
  if (!ctx) throw new Error('useParqueadero debe usarse dentro de ParqueaderoProvider');
  return ctx;
}
