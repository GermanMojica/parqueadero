import { useState, useEffect } from 'react';
import { useParqueadero }  from '../context/ParqueaderoContext';
import { useAuth }         from '../context/AuthContext';
import { reportesApi }     from '../api/index';
import { formatFecha, formatMoneda } from '../utils/format.utils';
import { RefreshCw, AlertCircle, CheckCircle, XCircle, Car, DollarSign, Bike, Truck } from 'lucide-react';
import s from './Dashboard.module.css';

function DonutChart({ pct, color, size = 130 }) {
  const r    = (size - 18) / 2;
  const cx   = size / 2;
  const circ = 2 * Math.PI * r;
  const fill = Math.min(pct / 100, 1) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--color-border-base)" strokeWidth={8} />
      <circle cx={cx} cy={cx} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={`${fill} ${circ - fill}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  );
}

function BarRow({ label, value, max, color, icon }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className={s.barRow}>
      <div className={s.barLabel}>
        <span>{icon} {label}</span>
        <span className={s.barVal}>{value} / {max}</span>
      </div>
      <div className={s.barTrackH}>
        <div className={s.barFillH} style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function SparkLine({ data = [], color = 'var(--brand-green)', h = 36, w = 140 }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * (h - 6) - 3;
    return `${x},${y}`;
  }).join(' ');
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg width={w} height={h}>
      <polygon points={area} fill={color} opacity={0.05} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KpiCard({ label, value, sub, color, spark, icon: Icon, kpiColor }) {
  return (
    <div className={s.kpiCard} style={{ '--kpi-color': kpiColor || color }}>
      <div className={s.kpiIcon}>
        <Icon size={80} strokeWidth={1} />
      </div>
      <div className={s.kpiTop}>
        <div>
          <p className={s.kpiLabel}>{label}</p>
          <p className={s.kpiNum}>{value}</p>
          {sub && <p className={s.kpiSub}>{sub}</p>}
        </div>
        {spark && <SparkLine data={spark} color={color} />}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { resumen, loading, error, refetch } = useParqueadero();
  const { usuario }                          = useAuth();
  const [kpis,  setKpis]  = useState(null);

  const totalDisp = resumen.reduce((a, r) => a + (r.disponibles     ?? 0), 0);
  const totalOcup = resumen.reduce((a, r) => a + (r.ocupados        ?? 0), 0);
  const totalCap  = resumen.reduce((a, r) => a + (r.capacidad_total ?? 0), 0);
  const pct       = totalCap > 0 ? Math.round((totalOcup / totalCap) * 100) : 0;
  
  // Use HSL colors from design system
  const pctColor  = pct >= 90 ? 'var(--color-crimson4)' : pct >= 70 ? 'var(--color-yellowA7)' : 'var(--brand-green)';

  const TIPO_ICON = { MOTO: <Bike size={16}/>, CAMIONETA: <Truck size={16}/>, SEDAN: <Car size={16}/> };

  useEffect(() => {
    reportesApi.getKpisHoy().then(setKpis).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      refetch();
      reportesApi.getKpisHoy().then(setKpis).catch(() => {});
    }, 30_000);
    return () => clearInterval(t);
  }, [refetch]);

  const hoy = new Date().toLocaleDateString('es-CO', {
    weekday:'long', day:'numeric', month:'long', year:'numeric'
  });

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Dashboard</h1>
          <p className={s.subtitle}>
            Bienvenido, <strong>{usuario?.nombre}</strong> · <span style={{ textTransform:'capitalize' }}>{hoy}</span>
          </p>
        </div>
        <button className={s.refreshBtn} onClick={refetch} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? ' Actualizando...' : ' Actualizar'}
        </button>
      </div>

      {error && (
        <div className={s.errorBanner}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className={s.kpiRow}>
        <KpiCard label="Cupos disponibles" icon={CheckCircle} value={totalDisp}
          kpiColor="var(--brand-green)" color="var(--brand-green)"
          sub={`de ${totalCap} totales`}
          spark={[totalCap-2, totalCap-4, totalCap-3, totalCap-5, totalDisp]}
        />
        <KpiCard label="Cupos ocupados" icon={XCircle} value={totalOcup}
          kpiColor="var(--color-crimson4)" color="var(--color-crimson4)"
          sub={`${pct}% ocupación`}
          spark={[2, 4, 3, 5, totalOcup]}
        />
        <KpiCard label="Atendidos hoy" icon={Car} value={kpis?.vehiculos_atendidos_hoy ?? '—'}
          kpiColor="var(--color-purple5)" color="var(--color-purple5)"
          sub="vehículos"
        />
        <KpiCard label="Ingresos hoy" icon={DollarSign}
          value={kpis ? formatMoneda(kpis.ingresos_hoy) : '—'}
          kpiColor="var(--color-violet10)" color="var(--color-violet10)"
          sub={kpis ? `Prom. ${Math.round(kpis.minutos_promedio_hoy ?? 0)} min` : ''}
        />
      </div>

      <div className={s.chartsRow}>
        <div className={s.chartCard} style={{ minWidth: 200 }}>
          <p className={s.chartTitle}>Ocupación global</p>
          <div className={s.donutWrap}>
            <DonutChart pct={pct} color={pctColor} size={130} />
            <div className={s.donutCenter}>
              <span className={s.donutPct} style={{ color: pctColor }}>{pct}%</span>
              <span className={s.donutSub}>ocupado</span>
            </div>
          </div>
          <div className={s.donutLegend}>
            <div className={s.legendItem}>
              <span className={s.legendDot} style={{ background:'var(--brand-green)' }} />
              <span>Libres <strong>{totalDisp}</strong></span>
            </div>
            <div className={s.legendItem}>
              <span className={s.legendDot} style={{ background: pctColor }} />
              <span>Ocupados <strong>{totalOcup}</strong></span>
            </div>
          </div>
        </div>

        <div className={s.chartCard} style={{ flex: 2 }}>
          <p className={s.chartTitle}>Disponibilidad por tipo de vehículo</p>
          <div className={s.barsWrap}>
            {resumen.length === 0 ? (
              <p className={s.empty}>Cargando datos...</p>
            ) : resumen.map(tipo => {
              const p  = tipo.capacidad_total > 0 ? Math.round((tipo.ocupados / tipo.capacidad_total) * 100) : 0;
              const c  = p >= 90 ? 'var(--color-crimson4)' : p >= 70 ? 'var(--color-yellowA7)' : 'var(--brand-green)';
              return (
                <BarRow key={tipo.id}
                  label={tipo.tipo_vehiculo}
                  value={tipo.ocupados}
                  max={tipo.capacidad_total}
                  color={c}
                  icon={TIPO_ICON[tipo.tipo_vehiculo] ?? <Car size={16}/>}
                />
              );
            })}
          </div>
          {resumen.length > 0 && (
            <div className={s.miniTable}>
              {resumen.map(tipo => {
                const isFull = tipo.disponibles === 0;
                const isLow = tipo.disponibles <= 3;
                return (
                <div key={tipo.id} className={s.miniRow}>
                  <span>{TIPO_ICON[tipo.tipo_vehiculo] ?? <Car size={16}/>} {tipo.tipo_vehiculo}</span>
                  <span className={s.miniBadge} style={{
                    borderColor: isFull ? 'var(--color-crimson4)' : isLow ? 'var(--color-yellowA7)' : 'var(--brand-border)',
                    color: isFull ? 'var(--color-crimson4)' : isLow ? 'var(--color-yellowA7)' : 'var(--brand-green)',
                  }}>
                    {isFull ? 'LLENO' : `${tipo.disponibles} libres`}
                  </span>
                </div>
              )})}
            </div>
          )}
        </div>
      </div>

      {kpis && (
        <div className={s.chartCard}>
          <p className={s.chartTitle}>Estado en tiempo real</p>
          <div className={s.realTimeRow}>
            {[
              { num: kpis.vehiculos_dentro ?? totalOcup, lbl: 'Vehículos dentro', color:'var(--color-crimson4)' },
              { num: kpis.vehiculos_atendidos_hoy ?? 0,  lbl: 'Atendidos hoy',   color:'var(--color-purple5)' },
              { num: formatMoneda(kpis.ingresos_hoy ?? 0), lbl: 'Ingresos del día', color:'var(--color-violet10)' },
              { num: `${Math.round(kpis.minutos_promedio_hoy ?? 0)} min`, lbl: 'Tiempo promedio', color:'var(--text-primary)' },
            ].map(({ num, lbl, color }) => (
              <div key={lbl} className={s.rtItem}>
                <span className={s.rtNum} style={{ color }}>{num}</span>
                <span className={s.rtLbl}>{lbl}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className={s.updateNote}>ACTUALIZACIÓN AUTOMÁTICA CADA 30 SEG</p>
    </div>
  );
}
