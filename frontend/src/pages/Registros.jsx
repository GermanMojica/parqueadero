import { useState, useEffect, useCallback } from 'react';
import { registrosApi }   from '../api/index';
import { useAuth }        from '../context/AuthContext';
import { formatFecha, formatDuracion, formatMoneda } from '../utils/format.utils';
import { RefreshCw, Search, ArrowLeft, ArrowRight, Loader2, FileText, AlertCircle } from 'lucide-react';
import s from './Registros.module.css';

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
        <h1 className={s.title}>
          Historial de Registros
        </h1>
        <span className={s.total}>{data.total} registros encontrados</span>
      </div>

      {/* Filtros */}
      <div className={s.filtros}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            name="placa"
            className={s.filterInput}
            placeholder="Buscar por placa..."
            value={filtros.placa}
            onChange={handleFiltro}
            maxLength={8}
            style={{ textTransform: 'uppercase', paddingLeft: 34, width: '100%' }}
          />
        </div>
        <select name="estado" className={s.filterInput} value={filtros.estado} onChange={handleFiltro}>
          <option value="">Todos los estados</option>
          <option value="ABIERTO">Abierto</option>
          <option value="CERRADO">Cerrado</option>
          <option value="ANULADO">Anulado</option>
        </select>
        <button className={s.refreshBtn} onClick={fetchData} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {error && <div className={s.errorMsg}><AlertCircle size={16} style={{display:'inline', verticalAlign:'middle'}}/> {error}</div>}

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
              <th>Op. Entrada</th>
              <th>Op. Salida</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className={s.loadingRow}><Loader2 size={24} className="animate-spin" style={{margin:'0 auto'}}/></td></tr>
            ) : data.data.length === 0 ? (
              <tr><td colSpan={11} className={s.emptyRow}><FileText size={24} style={{display:'block', margin:'0 auto 8px', opacity:0.5}}/>No hay registros con los filtros aplicados</td></tr>
            ) : data.data.map(reg => (
              <tr key={reg.id} className={reg.estado === 'ABIERTO' ? s.rowActive : ''}>
                <td data-label="ID" className={s.idCell}>{reg.id}</td>
                <td data-label="Placa" className={s.placaCell}>
                  <span 
                    style={{ cursor: 'pointer', color: 'var(--brand-green)', borderBottom: '1px dashed transparent', transition: 'border-color 0.2s' }}
                    onMouseEnter={e => e.target.style.borderBottomColor = 'var(--brand-green)'}
                    onMouseLeave={e => e.target.style.borderBottomColor = 'transparent'}
                    onClick={() => setFiltros(prev => ({ ...prev, placa: reg.placa, offset: 0 }))}
                    title={`Ver todo el historial de ${reg.placa}`}
                  >
                    {reg.placa}
                  </span>
                </td>
                <td data-label="Tipo">{reg.tipo_vehiculo}</td>
                <td data-label="Espacio" className={s.espacioCell}>{reg.espacio_codigo}</td>
                <td data-label="Entrada">{formatFecha(reg.hora_entrada)}</td>
                <td data-label="Salida">{reg.hora_salida ? formatFecha(reg.hora_salida) : <span style={{color:'var(--brand-green)'}}>Dentro</span>}</td>
                <td data-label="Duración">{formatDuracion(reg.minutos_total)}</td>
                <td data-label="Total" className={s.totalCell}>{reg.total_cobrado ? formatMoneda(reg.total_cobrado) : '—'}</td>
                <td data-label="Estado">
                  <span className={`${s.badge} ${s[`badge_${reg.estado}`]}`}>
                    {reg.estado}
                  </span>
                </td>
                <td data-label="Op. Entrada" className={s.operadorCell}>{reg.operador_entrada}</td>
                <td data-label="Op. Salida" className={s.operadorCell}>{reg.operador_salida || '—'}</td>
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
          >
            <ArrowLeft size={16} /> Anterior
          </button>
          <span className={s.pageInfo}>Página {pagina} de {totalPags}</span>
          <button
            className={s.pageBtn}
            disabled={pagina >= totalPags}
            onClick={() => setFiltros(p => ({ ...p, offset: p.offset + p.limit }))}
          >
            Siguiente <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
