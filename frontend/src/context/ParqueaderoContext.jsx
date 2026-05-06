// src/context/ParqueaderoContext.jsx
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { espaciosApi } from '../api/index';
import { useAuth }     from './AuthContext';
import { io }           from 'socket.io-client';

const ParqueaderoContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function ParqueaderoProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [resumen,       setResumen]       = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [refreshCount,  setRefreshCount]  = useState(0); 

  const fetchResumen = useCallback(async () => {
    try {
      setError(null);
      const data = await espaciosApi.getResumen();
      setResumen(data);
      setRefreshCount(c => c + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Socket setup
  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = io(SOCKET_URL);

    socket.on('connect', () => console.log('✅ WebSocket conectado:', socket.id));
    socket.on('parqueadero_update', () => {
      console.log('🔄 Actualización recibida vía WebSocket');
      fetchResumen();
    });

    return () => socket.disconnect();
  }, [isAuthenticated, fetchResumen]);

  // Carga inicial
  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      fetchResumen();
    } else {
      setResumen([]);
    }
  }, [isAuthenticated, fetchResumen]);

  const value = {
    resumen,       // Array de { tipo_vehiculo, capacidad_total, disponibles, ocupados, ... }
    loading,
    error,
    refreshCount,  // número que aumenta cada vez que se refresca — úsalo como key para animar
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
