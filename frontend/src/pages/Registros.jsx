// src/pages/Registros.jsx
import { useState, useEffect, useCallback } from 'react';
import { registrosApi }   from '../api/index';
import { useAuth }        from '../context/AuthContext';
import { formatFecha, formatDuracion, formatMoneda, normalizarPlaca } from '../utils/format.utils';
import s from './Registros.module.css';

const ESTADO_COLORS = { ABIERTO: 'success', CERRADO: 'primary', ANULADO: 'danger' };

export default function Registros() {
  const { isAdmin } = useAuth();
  const [data,     setData]     = useState({ data: [], total: 0 });
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [filtros,  setFiltros]  = useState({ estado: '', placa: '', limit: 20, offset: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await registrosApi.getHistorial(filtros);
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFiltro = (e) => {
    setFiltros(prev => ({ ...prev, [e.target.name]: e.target.value, offset: 0 }));
  };

  const pagina = Math.floor(filtros.offset / filtros.limit) + 1;
  const totalPags = Math.ceil(data.total / filtros.limit);

  return (
    <div className={s.page}>
      {/* Encabezado */}
      <div className={s.pageHeader}>
        <h1 className={s.title}>Historial de Registros</h1>
        <span className={s.total}>{data.total} registros encontrados</span>
      </div>

      {/* Filtros */}
      <div className={s.filtros}>
        <input
          name="placa"
          className={s.filterInput}
          placeholder="Buscar por placa..."
          value={filtros.placa}
          onChange={handleFiltro}
          maxLength={8}
          style={{ textTransform: 'uppercase' }}
        />
        <select name="estado" className={s.filterInput} value={filtros.estado} onChange={handleFiltro}>
          <option value="">Todos los estados</option>
          <option value="ABIERTO">Abierto</option>
          <option value="CERRADO">Cerrado</option>
          <option value="ANULADO">Anulado</option>
        </select>
        <button className={s.refreshBtn} onClick={fetchData} disabled={loading}>
          {loading ? '...' : '↻ Actualizar'}
        </button>
      </div>

      {error && <div className={s.errorMsg}>{error}</div>}

      {/* Tabla */}
      <div className={s.tableWrapper}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Placa</th>
              <th>Tipo</th>
              <th>Espacio</th>
              <th>Entrada</th>
              <th>Salida</th>
              <th>Duración</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Operador</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className={s.loadingRow}>Cargando...</td></tr>
            ) : data.data.length === 0 ? (
              <tr><td colSpan={10} className={s.emptyRow}>No hay registros con los filtros aplicados</td></tr>
            ) : data.data.map(reg => (
              <tr key={reg.id} className={reg.estado === 'ABIERTO' ? s.rowActive : ''}>
                <td className={s.idCell}>#{reg.id}</td>
                <td className={s.placaCell}>{reg.placa}</td>
                <td>{reg.tipo_vehiculo}</td>
                <td className={s.espacioCell}>{reg.espacio_codigo}</td>
                <td>{formatFecha(reg.hora_entrada)}</td>
                <td>{reg.hora_salida ? formatFecha(reg.hora_salida) : <span className={s.dentro}>Dentro</span>}</td>
                <td>{formatDuracion(reg.minutos_total)}</td>
                <td className={s.totalCell}>{reg.total_cobrado ? formatMoneda(reg.total_cobrado) : '—'}</td>
                <td>
                  <span className={`${s.badge} ${s[`badge_${reg.estado}`]}`}>
                    {reg.estado}
                  </span>
                </td>
                <td className={s.operadorCell}>{reg.operador_entrada}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPags > 1 && (
        <div className={s.paginacion}>
          <button
            className={s.pageBtn}
            disabled={filtros.offset === 0}
            onClick={() => setFiltros(p => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}
          >← Anterior</button>
          <span className={s.pageInfo}>Página {pagina} de {totalPags}</span>
          <button
            className={s.pageBtn}
            disabled={pagina >= totalPags}
            onClick={() => setFiltros(p => ({ ...p, offset: p.offset + p.limit }))}
          >Siguiente →</button>
        </div>
      )}
    </div>
  );
}
