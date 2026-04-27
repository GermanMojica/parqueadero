// src/pages/MapaParqueadero.jsx
import { useState, useEffect, useCallback } from 'react';
import { espaciosApi }   from '../api/index';
import { useParqueadero } from '../context/ParqueaderoContext';
import s from './MapaParqueadero.module.css';

const ESTADO_CONFIG = {
  DISPONIBLE:    { label: 'Libre',       cls: s.disponible },
  OCUPADO:       { label: 'Ocupado',     cls: s.ocupado },
  MANTENIMIENTO: { label: 'Mantenim.',   cls: s.mantenimiento },
};

function EspacioCell({ espacio, onClick }) {
  const cfg = ESTADO_CONFIG[espacio.estado] ?? ESTADO_CONFIG.DISPONIBLE;
  return (
    <button
      className={`${s.espacio} ${cfg.cls}`}
      onClick={() => onClick(espacio)}
      title={`${espacio.codigo} — ${espacio.estado}`}
    >
      <span className={s.espacioCodigo}>{espacio.codigo}</span>
      <span className={s.espacioEstado}>{cfg.label}</span>
    </button>
  );
}

export default function MapaParqueadero() {
  const { resumen, refetch } = useParqueadero();
  const [espacios,  setEspacios]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [seleccion, setSeleccion] = useState(null);
  const [filtroZona, setFiltroZona] = useState('TODOS');

  const cargarEspacios = useCallback(async () => {
    setLoading(true);
    try {
      const data = await espaciosApi.getAll();
      setEspacios(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarEspacios(); }, [cargarEspacios]);

  // Agrupar espacios por tipo de vehículo
  const grupos = espacios.reduce((acc, e) => {
    const k = e.tipo_vehiculo;
    if (!acc[k]) acc[k] = [];
    acc[k].push(e);
    return acc;
  }, {});

  const zonas = ['TODOS', ...Object.keys(grupos)];

  const totalDisp = espacios.filter(e => e.estado === 'DISPONIBLE').length;
  const totalOcup = espacios.filter(e => e.estado === 'OCUPADO').length;
  const totalMant = espacios.filter(e => e.estado === 'MANTENIMIENTO').length;
  const pctOcup   = espacios.length ? Math.round((totalOcup / espacios.length) * 100) : 0;

  return (
    <div className={s.page}>
      {/* KPIs */}
      <div className={s.kpiRow}>
        <div className={s.kpi} style={{ borderTop: '3px solid var(--color-success)' }}>
          <span className={s.kpiNum} style={{ color: 'var(--color-success)' }}>{totalDisp}</span>
          <span className={s.kpiLabel}>Disponibles</span>
        </div>
        <div className={s.kpi} style={{ borderTop: '3px solid var(--color-danger)' }}>
          <span className={s.kpiNum} style={{ color: 'var(--color-danger)' }}>{totalOcup}</span>
          <span className={s.kpiLabel}>Ocupados</span>
        </div>
        <div className={s.kpi} style={{ borderTop: '3px solid var(--color-warning)' }}>
          <span className={s.kpiNum} style={{ color: 'var(--color-warning)' }}>{totalMant}</span>
          <span className={s.kpiLabel}>Mantenimiento</span>
        </div>
        <div className={s.kpi} style={{ borderTop: '3px solid var(--color-primary)' }}>
          <span className={s.kpiNum}>{pctOcup}%</span>
          <span className={s.kpiLabel}>Ocupación</span>
        </div>
      </div>

      {/* Controles */}
      <div className={s.controls}>
        <div className={s.filtros}>
          {zonas.map(z => (
            <button
              key={z}
              className={`${s.filtroBtn} ${filtroZona === z ? s.filtroBtnActive : ''}`}
              onClick={() => setFiltroZona(z)}
            >
              {z}
            </button>
          ))}
        </div>
        <button className={s.refreshBtn} onClick={() => { cargarEspacios(); refetch(); }}>
          ↻ Actualizar
        </button>
      </div>

      {/* Leyenda */}
      <div className={s.legend}>
        {Object.entries(ESTADO_CONFIG).map(([k, v]) => (
          <div key={k} className={s.legendItem}>
            <div className={`${s.legendDot} ${v.cls}`} />
            <span>{v.label}</span>
          </div>
        ))}
      </div>

      {/* Mapa de espacios */}
      {loading ? (
        <div className={s.loading}>Cargando mapa de espacios...</div>
      ) : (
        <div className={s.mapaWrapper}>
          {Object.entries(grupos)
            .filter(([tipo]) => filtroZona === 'TODOS' || tipo === filtroZona)
            .map(([tipo, lista]) => {
              const libresTipo = lista.filter(e => e.estado === 'DISPONIBLE').length;
              return (
                <div key={tipo} className={s.zona}>
                  <div className={s.zonaHeader}>
                    <span className={s.zonaNombre}>
                      {tipo === 'MOTO' ? '🏍' : tipo === 'CAMIONETA' ? '🚙' : '🚗'} {tipo}
                    </span>
                    <span className={s.zonaLibres} style={{
                      color: libresTipo === 0 ? 'var(--color-danger)' : 'var(--color-success)'
                    }}>
                      {libresTipo === 0 ? 'LLENO' : `${libresTipo} libres`}
                    </span>
                  </div>

                  {/* Barra de ocupación por tipo */}
                  <div className={s.barTrack}>
                    <div
                      className={s.barFill}
                      style={{
                        width: `${Math.round(((lista.length - libresTipo) / lista.length) * 100)}%`,
                        background: libresTipo === 0 ? 'var(--color-danger)' : 'var(--color-success)',
                      }}
                    />
                  </div>

                  <div className={s.espaciosGrid}>
                    {lista.map(e => (
                      <EspacioCell
                        key={e.id}
                        espacio={e}
                        onClick={setSeleccion}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Modal detalle de espacio */}
      {seleccion && (
        <div className={s.modalOverlay} onClick={() => setSeleccion(null)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <h3 className={s.modalTitle}>Espacio {seleccion.codigo}</h3>
            <div className={s.modalBody}>
              <p><strong>Tipo:</strong> {seleccion.tipo_vehiculo}</p>
              <p><strong>Estado:</strong>
                <span style={{
                  color: seleccion.estado === 'DISPONIBLE' ? 'var(--color-success)'
                       : seleccion.estado === 'OCUPADO' ? 'var(--color-danger)'
                       : 'var(--color-warning)',
                  fontWeight: 600, marginLeft: 8
                }}>
                  {seleccion.estado}
                </span>
              </p>
            </div>
            <button className={s.modalClose} onClick={() => setSeleccion(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
