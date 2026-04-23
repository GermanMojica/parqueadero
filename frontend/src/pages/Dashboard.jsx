// src/pages/Dashboard.jsx
import { useParqueadero }  from '../context/ParqueaderoContext';
import { useAuth }         from '../context/AuthContext';
import { formatFecha }     from '../utils/format.utils';
import s from './Dashboard.module.css';

function CupoCard({ tipo }) {
  const pct = tipo.capacidad_total > 0
    ? Math.round((tipo.ocupados / tipo.capacidad_total) * 100)
    : 0;

  const statusColor = pct >= 90 ? 'danger' : pct >= 70 ? 'warning' : 'success';
  const colors = {
    success: { bar: 'var(--color-success)', bg: 'var(--color-success-light)' },
    warning: { bar: 'var(--color-warning)', bg: 'var(--color-warning-light)' },
    danger:  { bar: 'var(--color-danger)',  bg: 'var(--color-danger-light)'  },
  };
  const col = colors[statusColor];

  return (
    <div className={s.cupoCard} style={{ borderTop: `4px solid ${col.bar}` }}>
      <div className={s.cupoHeader}>
        <h3 className={s.cupoTipo}>{tipo.tipo_vehiculo}</h3>
        <span className={s.cuposPct} style={{ color: col.bar }}>{pct}%</span>
      </div>

      {/* Barra de ocupación */}
      <div className={s.barTrack}>
        <div
          className={s.barFill}
          style={{ width: `${pct}%`, background: col.bar }}
        />
      </div>

      {/* Números */}
      <div className={s.cupoNums}>
        <div className={s.cupoNum}>
          <span className={s.numVal} style={{ color: 'var(--color-success)' }}>
            {tipo.disponibles}
          </span>
          <span className={s.numLabel}>Disponibles</span>
        </div>
        <div className={s.cupoNum}>
          <span className={s.numVal} style={{ color: col.bar }}>
            {tipo.ocupados}
          </span>
          <span className={s.numLabel}>Ocupados</span>
        </div>
        <div className={s.cupoNum}>
          <span className={s.numVal} style={{ color: 'var(--color-gray-400)' }}>
            {tipo.capacidad_total}
          </span>
          <span className={s.numLabel}>Total</span>
        </div>
      </div>

      {/* Mantenimiento */}
      {tipo.en_mantenimiento > 0 && (
        <p className={s.mantenimiento}>
          ⚠ {tipo.en_mantenimiento} en mantenimiento
        </p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { resumen, loading, error, refetch } = useParqueadero();
  const { usuario }                          = useAuth();

  const totalDisponibles = resumen.reduce((a, r) => a + (r.disponibles ?? 0), 0);
  const totalOcupados    = resumen.reduce((a, r) => a + (r.ocupados    ?? 0), 0);
  const totalCapacidad   = resumen.reduce((a, r) => a + (r.capacidad_total ?? 0), 0);
  const pctGlobal = totalCapacidad > 0 ? Math.round((totalOcupados / totalCapacidad) * 100) : 0;

  const hora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className={s.page}>
      {/* Encabezado */}
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.title}>Dashboard</h1>
          <p className={s.subtitle}>
            Bienvenido, <strong>{usuario?.nombre}</strong> — {formatFecha(new Date())}
          </p>
        </div>
        <button className={s.refreshBtn} onClick={refetch} disabled={loading} title="Actualizar">
          {loading ? '⟳' : '↻'} Actualizar
        </button>
      </div>

      {error && (
        <div className={s.errorMsg}>⚠ Error al cargar disponibilidad: {error}</div>
      )}

      {/* KPIs globales */}
      <div className={s.kpiRow}>
        <div className={s.kpi}>
          <span className={s.kpiNum} style={{ color: 'var(--color-success)' }}>{totalDisponibles}</span>
          <span className={s.kpiLabel}>Cupos disponibles</span>
        </div>
        <div className={s.kpi}>
          <span className={s.kpiNum} style={{ color: 'var(--color-danger)' }}>{totalOcupados}</span>
          <span className={s.kpiLabel}>Cupos ocupados</span>
        </div>
        <div className={s.kpi}>
          <span className={s.kpiNum}>{totalCapacidad}</span>
          <span className={s.kpiLabel}>Capacidad total</span>
        </div>
        <div className={s.kpi}>
          <span className={s.kpiNum}>{pctGlobal}%</span>
          <span className={s.kpiLabel}>Ocupación global</span>
        </div>
      </div>

      {/* Cards por tipo de vehículo */}
      <h2 className={s.sectionTitle}>Disponibilidad por tipo de vehículo</h2>

      {loading && resumen.length === 0 ? (
        <div className={s.loadingState}>Cargando disponibilidad...</div>
      ) : (
        <div className={s.cardsGrid}>
          {resumen.map(tipo => (
            <CupoCard key={tipo.id} tipo={tipo} />
          ))}
        </div>
      )}

      <p className={s.updateNote}>
        Actualización automática cada 30 segundos · Última vez: {hora}
      </p>
    </div>
  );
}
