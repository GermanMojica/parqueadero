// src/hooks/useRegistros.js
import { useState, useCallback } from 'react';
import { registrosApi }          from '../api/index';

export function useRegistros() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const exec = useCallback(async (fn) => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    clearError: () => setError(null),
    registrarEntrada: (data)  => exec(() => registrosApi.registrarEntrada(data)),
    previewSalida:    (placa) => exec(() => registrosApi.previewSalida(placa)),
    registrarSalida:  (data)  => exec(() => registrosApi.registrarSalida(data)),
    getHistorial:     (params)=> exec(() => registrosApi.getHistorial(params)),
    anular:           (id, d) => exec(() => registrosApi.anular(id, d)),
  };
}

// src/hooks/useAsync.js — hook genérico para cualquier llamada async
export function useAsync() {
  const [state, setState] = useState({ loading: false, error: null, data: null });

  const run = useCallback(async (fn) => {
    setState({ loading: true, error: null, data: null });
    try {
      const data = await fn();
      setState({ loading: false, error: null, data });
      return data;
    } catch (err) {
      setState({ loading: false, error: err.message, data: null });
      throw err;
    }
  }, []);

  return { ...state, run, reset: () => setState({ loading: false, error: null, data: null }) };
}
