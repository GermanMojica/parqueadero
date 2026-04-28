// Dashboard.jsx con gráficos SVG sin dependencias externas
import { useState, useEffect } from 'react';
import { useParqueadero }  from '../context/ParqueaderoContext';
import { useAuth }         from '../context/AuthContext';
import { reportesApi }     from '../api/index';
import { formatFecha, formatMoneda } from '../utils/format.utils';
import s from './Dashboard.module.css';

// ── Donut chart SVG ──────────────────────────────────────────────────────────
function DonutChart({ pct, color, size = 120 }) {
  const r   = (size - 16) / 2;
  const cx  = size / 2;
  const circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#e2e8f0" strokeWidth={10} />
      <circle
        cx={cx} cy={cx} r={r} fill="none"
        stroke={color} strokeWidth={10}
        strokeDasharray={`${fill} ${circ - fill}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

// ── Barra horizontal ─────────────────────────────────────────────────────────
function BarRow({ label, value, max, color, emoji }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className={s.barRow}>
      <div className={s.barLabel}>
        <span>{emoji} {label}</span>
        <span className={s.barVal}>{value} / {max}</span>
      </div>
      <div className={s.barTrackH}>
        <div className={s.barFillH} style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Mini gráfico de línea SVG ─────────────────────────────────────────────────
function SparkLine({ data, color = '#2563eb', height = 40 }) {
  if (!data || data.length < 2) return null;
  const w = 180;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - (v / max) * (height - 6) - 3;
    return `${x},${y}`;
  }).join(' ');
  const area = `0,${height} ` + pts + ` ${w},${height}`;
  return (
    <svg width={w} height={height} style={{ overflow: 'visible' }}>
      <polygon points={area} fill={color} opacity={0.12} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, spark, icon }) {
  return (
    <div className={s.kpiCard}>
      <div className={s.kpiTop}>
        <div>
          <p className={s.kpiLabel}>{icon} {label}</p>
          <p className={s.kpiNum} style={{ color }}>{value}</p>
          {sub && <p className={s.kpiSub}>{sub}</p>}
        </div>
        {spark && <SparkLine data={spark} color={color} />}
      </div>
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function Dashboard() {
  const { resumen, loading, error, refetch } = useParqueadero();
  const { usuario }                          = useAuth();
  const [kpis, setKpis]                      = useState(null);

  const totalDisp = resumen.reduce((a, r) => a + (r.disponibles    ?? 0), 0);
  const totalOcup = resumen.reduce((a, r) => a + (r.ocupados       ?? 0), 0);
  const totalCap  = resumen.reduce((a, r) => a + (r.capacidad_total ?? 0), 0);
  const pctGlobal = totalCap > 0 ? Math.round((totalOcup / totalCap) * 100) : 0;
  const pctColor  = pctGlobal >= 90 ? '#ef4444' : pctGlobal >= 70 ? '#f59e0b' : '#22c55e';

  useEffect(() => {
    reportesApi.getKpisHoy().then(setKpis).catch(() => {});
  }, []);

  const tipoEmojis = { SEDAN: '🚗', CAMIONETA: '🚙', MOTO: '🏍' };

  // Datos simulados para sparkline si no hay histórico
  const sparkDisp = [42, 39, 35, 38, 40, 37, totalDisp];
  const sparkOcup = [3, 6, 10, 7, 5, 8, totalOcup];

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Dashboard</h1>
          <p className={s.subtitle}>
            Bienvenido, <strong>{usuario?.nombre}</strong> ·{' '}
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button className={s.refreshBtn} onClick={refetch} disabled={loading}>
          <span style={{ display: 'inline-block', animation: loading ? 'spin 1s linear infinite' : 'none' }}>↻</span>
          {loading ? ' Actualizando...' : ' Actualizar'}
        </button>
      </div>

      {error && <div className={s.errorBanner}>⚠ {error}</div>}

      {/* KPIs row */}
      <div className={s.kpiRow}>
        <KpiCard
          label="Cupos disponibles"  icon="🟢"
          value={totalDisp}          color="#16a34a"
          sub={`de ${totalCap} totales`}
          spark={sparkDisp}
        />
        <KpiCard
          label="Cupos ocupados"     icon="🔴"
          value={totalOcup}          color="#dc2626"
          sub={`${pctGlobal}% de ocupación`}
          spark={sparkOcup}
        />
        <KpiCard
          label="Atendidos hoy"      icon="🚘"
          value={kpis?.vehiculos_atendidos_hoy ?? '—'}
          color="#2563eb"
          sub="vehículos"
        />
        <KpiCard
          label="Ingresos hoy"       icon="💰"
          value={kpis ? formatMoneda(kpis.ingresos_hoy) : '—'}
          color="#7c3aed"
          sub={kpis ? `Prom. ${Math.round(kpis.minutos_promedio_hoy ?? 0)} min` : ''}
        />
      </div>

      {/* Gráficos: Donut + Barras */}
      <div className={s.chartsRow}>

        {/* Donut global */}
        <div className={s.chartCard}>
          <h3 className={s.chartTitle}>Ocupación global</h3>
          <div className={s.donutWrap}>
            <DonutChart pct={pctGlobal} color={pctColor} size={140} />
            <div className={s.donutCenter}>
              <span className={s.donutPct} style={{ color: pctColor }}>{pctGlobal}%</span>
              <span className={s.donutSub}>ocupado</span>
            </div>
          </div>
          <div className={s.donutLegend}>
            <div className={s.legendItem}>
              <span className={s.legendDot} style={{ background: '#22c55e' }} />
              <span>Libres <strong>{totalDisp}</strong></span>
            </div>
            <div className={s.legendItem}>
              <span className={s.legendDot} style={{ background: pctColor }} />
              <span>Ocupados <strong>{totalOcup}</strong></span>
            </div>
          </div>
        </div>

        {/* Barras por tipo */}
        <div className={s.chartCard} style={{ flex: 2 }}>
          <h3 className={s.chartTitle}>Disponibilidad por tipo</h3>
          <div className={s.barsWrap}>
            {resumen.length === 0 ? (
              <p className={s.empty}>Cargando datos...</p>
            ) : (
              resumen.map(tipo => {
                const pct = tipo.capacidad_total > 0
                  ? Math.round((tipo.ocupados / tipo.capacidad_total) * 100)
                  : 0;
                const col = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e';
                return (
                  <BarRow
                    key={tipo.id}
                    label={tipo.tipo_vehiculo}
                    value={tipo.ocupados}
                    max={tipo.capacidad_total}
                    color={col}
                    emoji={tipoEmojis[tipo.tipo_vehiculo] ?? '🚘'}
                  />
                );
              })
            )}
          </div>

          {/* Mini tabla resumen */}
          {resumen.length > 0 && (
            <div className={s.miniTable}>
              {resumen.map(tipo => (
                <div key={tipo.id} className={s.miniRow}>
                  <span>{tipoEmojis[tipo.tipo_vehiculo] ?? '🚘'} {tipo.tipo_vehiculo}</span>
                  <span className={s.miniBadge} style={{
                    background: tipo.disponibles === 0 ? '#fee2e2' : '#dcfce7',
                    color:      tipo.disponibles === 0 ? '#dc2626' : '#16a34a',
                  }}>
                    {tipo.disponibles === 0 ? 'LLENO' : `${tipo.disponibles} libres`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Gauge de vehículos dentro */}
      {kpis && (
        <div className={s.chartCard}>
          <h3 className={s.chartTitle}>Estado en tiempo real</h3>
          <div className={s.realTimeRow}>
            <div className={s.rtItem}>
              <span className={s.rtNum} style={{ color: '#dc2626' }}>{kpis.vehiculos_dentro ?? totalOcup}</span>
              <span className={s.rtLbl}>Vehículos dentro ahora</span>
            </div>
            <div className={s.rtItem}>
              <span className={s.rtNum} style={{ color: '#2563eb' }}>{kpis.vehiculos_atendidos_hoy ?? 0}</span>
              <span className={s.rtLbl}>Atendidos hoy</span>
            </div>
            <div className={s.rtItem}>
              <span className={s.rtNum} style={{ color: '#7c3aed' }}>{formatMoneda(kpis.ingresos_hoy ?? 0)}</span>
              <span className={s.rtLbl}>Ingresos del día</span>
            </div>
            <div className={s.rtItem}>
              <span className={s.rtNum} style={{ color: '#0891b2' }}>{Math.round(kpis.minutos_promedio_hoy ?? 0)} min</span>
              <span className={s.rtLbl}>Tiempo promedio</span>
            </div>
          </div>
        </div>
      )}

      <p className={s.updateNote}>
        ↻ Actualización automática cada 30 seg · {formatFecha(new Date())}
      </p>
    </div>
  );
}
