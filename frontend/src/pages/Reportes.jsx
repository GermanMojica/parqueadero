import { useState, useEffect, useCallback, useRef } from 'react';
import { reportesApi } from '../api/index';
import { formatMoneda } from '../utils/format.utils';
import html2pdf from 'html2pdf.js';
import { 
  TrendingUp, Users, Clock, DollarSign, Download, Calendar, 
  BarChart3, PieChart, Activity, Loader2, AlertCircle, FileText
} from 'lucide-react';
import s from './Reportes.module.css';

import * as XLSX from 'xlsx';

const SVG_BAR_HEIGHT = 200;
const SVG_LINE_HEIGHT = 150;

export default function Reportes() {
  const [rango, setRango] = useState('semana');
  const [fechas, setFechas] = useState({ 
    fechaDesde: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    fechaHasta: new Date().toISOString().split('T')[0]
  });
  
  const [kpis, setKpis] = useState(null);
  const [dataDia, setDataDia] = useState([]);
  const [dataHoras, setDataHoras] = useState([]);
  const [dataTipo, setDataTipo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [error, setError] = useState('');
  
  const pdfRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [resResumen, resHoras, resPlacas] = await Promise.all([
        reportesApi.getResumen(fechas),
        reportesApi.getOcupacionHora({ fechaDesde: fechas.fechaDesde, fechaHasta: fechas.fechaHasta }),
        reportesApi.getPlacasFrecuentes(10)
      ]);

      const detalle = resResumen.detalle || [];
      const totales = resResumen.totales || {};

      // Calcular KPIs manuales si no vienen exactos
      const totalVehiculos = totales.total_vehiculos || 0;
      const ingresosTotales = totales.ingresos_brutos || 0;
      let sumMinutos = 0;
      detalle.forEach(d => {
        sumMinutos += Number(d.minutos_promedio || 0) * Number(d.total_vehiculos || 0);
      });
      const tiempoProm = totalVehiculos ? sumMinutos / totalVehiculos : 0;
      const ingresoProm = totalVehiculos ? ingresosTotales / totalVehiculos : 0;

      setKpis({
        total_ingresos: ingresosTotales,
        total_vehiculos: totalVehiculos,
        tiempo_promedio: tiempoProm,
        ingreso_promedio: ingresoProm
      });

      setDataDia(detalle);
      setDataHoras(resHoras || []);

      // Agrupar tipos de vehículo para la dona
      const tiposMap = {};
      detalle.forEach(d => {
        if (!tiposMap[d.tipo_vehiculo]) tiposMap[d.tipo_vehiculo] = 0;
        tiposMap[d.tipo_vehiculo] += Number(d.total_vehiculos);
      });
      setDataTipo(Object.entries(tiposMap).map(([tipo, cantidad]) => ({ tipo, cantidad })));

    } catch (err) {
      setError('Error al cargar datos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [fechas]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRangoChange = (val) => {
    setRango(val);
    const hoy = new Date();
    let desde = new Date();
    if (val === 'semana') desde.setDate(hoy.getDate() - 7);
    else if (val === 'mes') desde.setMonth(hoy.getMonth() - 1);
    
    if (val !== 'personalizado') {
      setFechas({ 
        fechaDesde: desde.toISOString().split('T')[0], 
        fechaHasta: hoy.toISOString().split('T')[0] 
      });
    }
  };

  const exportExcel = () => {
    if (!dataDia.length) return alert('No hay datos para exportar');
    
    // Preparar datos
    const dataRows = dataDia.map(d => ({
      Fecha: String(d.fecha).slice(0, 10),
      'Vehículos Atendidos': d.total_vehiculos,
      'Ingresos Totales': d.ingresos_brutos
    }));

    // Crear hoja y libro
    const ws = XLSX.utils.json_to_sheet(dataRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte_Ingresos");

    // Descargar
    const fileName = `Reporte_Parqueadero_${fechas.fechaDesde}_a_${fechas.fechaHasta}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const exportPDF = async () => {
    if (loading || !kpis) return;
    setGeneratingPdf(true);

    try {
      // Clone the hidden PDF element and place it visibly in the body
      const source = pdfRef.current;
      const clone = source.cloneNode(true);
      clone.style.position = 'fixed';
      clone.style.left = '0';
      clone.style.top = '0';
      clone.style.width = '800px';
      clone.style.zIndex = '9999';
      clone.style.opacity = '0';
      clone.style.pointerEvents = 'none';
      document.body.appendChild(clone);

      // Wait for the browser to paint
      await new Promise(r => setTimeout(r, 300));

      const opt = {
        margin:       10,
        filename:     `Reporte_Parqueadero_${fechas.fechaDesde}_a_${fechas.fechaHasta}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false, width: 800 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(clone).save();
      document.body.removeChild(clone);
    } catch (err) {
      console.error('Error PDF:', err);
      alert('Error al generar PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // --- Charts UI Helpers (Reutilizables) ---

  const [hoveredBar, setHoveredBar] = useState(null);

  const renderBarChart = (data, isPdf = false) => {
    if (!data?.length) return <p style={{color: isPdf ? '#666' : 'var(--text-muted)'}}>Sin datos</p>;
    const maxVal = Math.max(...data.map(d => Number(d.ingresos_brutos || 0)), 1);
    const chartWidth = 600;
    const chartHeight = SVG_BAR_HEIGHT;
    const marginLeft = 52;
    const marginRight = 5;
    const marginBottom = 22;
    const marginTop = 5;
    const plotWidth = chartWidth - marginLeft - marginRight;
    const plotHeight = chartHeight - marginBottom - marginTop;
    const barColor = '#22c55e';

    // Y-axis ticks (4 levels)
    const tickCount = 4;
    const ticks = [];
    for (let i = 0; i <= tickCount; i++) {
      ticks.push((maxVal / tickCount) * i);
    }

    const barTotalWidth = plotWidth / data.length;
    const barWidth = barTotalWidth * 0.65;
    const barGap = barTotalWidth * 0.175;

    const formatAxisVal = (v) => {
      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
      if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
      return Math.round(v).toString();
    };

    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{width: '100%', height: 'auto'}} preserveAspectRatio="xMidYMid meet">
          {/* Grid lines + Y labels */}
          {ticks.map((val, i) => {
            const y = marginTop + plotHeight - (val / maxVal) * plotHeight;
            return (
              <g key={`tick-${i}`}>
                <line x1={marginLeft} y1={y} x2={chartWidth - marginRight} y2={y} stroke={isPdf ? '#e5e5e5' : 'rgba(255,255,255,0.06)'} strokeWidth="1" strokeDasharray={i === 0 ? 'none' : '3 3'} />
                <text x={marginLeft - 6} y={y + 3} fontSize="9" fill={isPdf ? '#666' : '#64748b'} textAnchor="end" fontFamily="monospace">{formatAxisVal(val)}</text>
              </g>
            );
          })}
          <line x1={marginLeft} y1={marginTop} x2={marginLeft} y2={marginTop + plotHeight} stroke={isPdf ? '#ccc' : 'rgba(255,255,255,0.08)'} strokeWidth="1" />
          {/* Bars */}
          {data.map((d, i) => {
            const val = Number(d.ingresos_brutos || 0);
            const h = (val / maxVal) * plotHeight;
            const x = marginLeft + i * barTotalWidth + barGap;
            const y = marginTop + plotHeight - h;
            const isHovered = !isPdf && hoveredBar === i;
            return (
              <g key={i}
                onMouseEnter={() => !isPdf && setHoveredBar(i)}
                onMouseLeave={() => !isPdf && setHoveredBar(null)}
                style={{ cursor: isPdf ? 'default' : 'pointer' }}
              >
                {isHovered && (
                  <rect x={marginLeft + i * barTotalWidth} y={marginTop} width={barTotalWidth} height={plotHeight} fill="rgba(255,255,255,0.03)" rx="3" />
                )}
                <rect x={x} y={y} width={barWidth} height={h} fill={isHovered ? '#4ade80' : barColor} rx="3" style={{ transition: 'fill 0.15s' }} />
                <text x={x + barWidth / 2} y={marginTop + plotHeight + 14} fontSize="9" fill={isPdf ? '#666' : '#64748b'} textAnchor="middle">{String(d.fecha).slice(5, 10)}</text>
              </g>
            );
          })}
        </svg>
        {/* Tooltip */}
        {hoveredBar !== null && !isPdf && data[hoveredBar] && (() => {
          const d = data[hoveredBar];
          const barTotalW = plotWidth / data.length;
          const tipX = marginLeft + hoveredBar * barTotalW + barTotalW / 2;
          const leftPct = (tipX / chartWidth) * 100;
          return (
            <div style={{
              position: 'absolute',
              left: `${leftPct}%`,
              top: '0',
              transform: 'translateX(-50%)',
              background: 'rgba(15, 15, 15, 0.95)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '8px 14px',
              pointerEvents: 'none',
              zIndex: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              whiteSpace: 'nowrap',
            }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                {String(d.fecha).slice(0, 10)}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#4ade80' }}>
                {formatMoneda(Number(d.ingresos_brutos || 0))}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                {d.total_vehiculos || 0} vehículo{Number(d.total_vehiculos) !== 1 ? 's' : ''}
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  const renderLineChart = (data, isPdf = false) => {
    if (!data?.length) return <p style={{color: isPdf ? '#666' : 'var(--text-muted)'}}>Sin datos</p>;
    
    const entradasPorHora = Array(24).fill(0);
    data.forEach(d => {
      if (d.hora !== undefined) {
        entradasPorHora[Number(d.hora)] += Number(d.entradas || 0);
      }
    });

    const maxVal = Math.max(...entradasPorHora, 1);
    const width = 600;
    const padLeft = 30;
    const padRight = 30;
    const padTop = 25;
    const padBottom = 5;
    const plotW = width - padLeft - padRight;
    const plotH = SVG_LINE_HEIGHT - padTop - padBottom;

    const getX = (hora) => padLeft + (hora / 23) * plotW;
    const getY = (val) => padTop + plotH - (val / maxVal) * plotH;

    const points = entradasPorHora.map((entradas, hora) => `${getX(hora)},${getY(entradas)}`).join(' ');

    return (
      <svg viewBox={`0 0 ${width} ${SVG_LINE_HEIGHT}`} style={{width: '100%', height: 'auto'}} preserveAspectRatio="xMidYMid meet">
        <polyline fill="none" stroke="#22c55e" strokeWidth="3" points={points} />
        {entradasPorHora.map((entradas, hora) => {
          if (entradas === 0 && maxVal > 1) return null;
          const x = getX(hora);
          const y = getY(entradas);
          return (
            <g key={hora}>
              <circle cx={x} cy={y} r="4" fill={isPdf ? '#fff' : '#0f0f0f'} stroke="#22c55e" strokeWidth="2" />
              <text x={x} y={y - 10} fontSize="9" fill={isPdf ? '#666' : '#94a3b8'} textAnchor="middle">{hora}:00</text>
            </g>
          );
        })}
      </svg>
    );
  };

  const renderDonutChart = (data, isPdf = false) => {
    if (!data?.length) return <p style={{color: isPdf ? '#666' : 'var(--text-muted)'}}>Sin datos</p>;
    const total = data.reduce((a, b) => a + Number(b.cantidad || 0), 0);
    if (total === 0) return <p>Vacío</p>;
    let currentAngle = 0;
    const colors = ['#22c55e', '#6366f1', '#ef4444', '#eab308', '#ec4899', '#8b5cf6'];

    return (
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px', width: '100%', padding: '16px 0'}}>
        <svg viewBox="0 0 100 100" style={{width: '160px', height: '160px', flexShrink: 0}}>
          {data.map((d, i) => {
            const percentage = (Number(d.cantidad) / total) * 100;
            const dashArray = `${percentage} ${100 - percentage}`;
            const dashOffset = -currentAngle + 25;
            currentAngle += percentage;
            return <circle key={i} cx="50" cy="50" r="40" fill="transparent" stroke={colors[i % colors.length]} strokeWidth="12" strokeDasharray={dashArray} strokeDashoffset={dashOffset} pathLength="100" />;
          })}
          <circle cx="50" cy="50" r="30" fill={isPdf ? '#fff' : '#0f0f0f'} />
          <text x="50" y="55" textAnchor="middle" fill={isPdf ? '#000' : '#fff'} fontSize="12" fontWeight="bold">{total}</text>
        </svg>
        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
          {data.map((d, i) => (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: isPdf ? '#333' : '#94a3b8'}}>
              <span style={{width: '10px', height: '10px', borderRadius: '50%', background: colors[i % colors.length], flexShrink: 0}} />
              <span>{d.tipo}: <b style={{color: isPdf ? '#000' : '#fff'}}>{d.cantidad}</b> <span style={{opacity: 0.7}}>({Math.round((d.cantidad/total)*100)}%)</span></span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={s.page}>
      {/* HEADER PRINCIPAL */}
      <header className={s.header}>
        <div>
          <h1 className={s.title}>Reportes Estadísticos</h1>
          <p className={s.subtitle}>Rendimiento del sistema</p>
        </div>
        
        <div className={s.actions}>
          <div className={s.rangeSelector}>
            <Calendar size={16} />
            <select value={rango} onChange={(e) => handleRangoChange(e.target.value)}>
              <option value="semana">Última Semana</option>
              <option value="mes">Último Mes</option>
              <option value="personalizado">Personalizado</option>
            </select>
          </div>

          <div className={s.exportGroup}>
            <button className={`${s.exportBtn} ${s.excel}`} onClick={exportExcel} disabled={loading}>
              <Download size={14} /> Excel
            </button>
            <button 
              className={`${s.exportBtn} ${s.pdf}`} 
              onClick={exportPDF} 
              disabled={loading || generatingPdf}
            >
              {generatingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              {generatingPdf ? 'Generando...' : 'PDF'}
            </button>
          </div>
        </div>
      </header>

      {error && <div className={s.error}><AlertCircle size={20} /> {error}</div>}

      {/* KPI CARDS (PANTALLA) */}
      <section className={s.kpis}>
        {[
          { label: 'Total Ingresos', val: formatMoneda(kpis?.total_ingresos || 0), icon: <DollarSign />, color: '#22c55e' },
          { label: 'Vehículos Atendidos', val: kpis?.total_vehiculos || 0, icon: <Users />, color: '#6366f1' },
          { label: 'Tiempo Promedio', val: `${Math.round(kpis?.tiempo_promedio || 0)} min`, icon: <Clock />, color: '#eab308' },
          { label: 'Ingreso Promedio', val: formatMoneda(kpis?.ingreso_promedio || 0), icon: <TrendingUp />, color: '#ec4899' },
        ].map((k, i) => (
          <div key={i} className={s.kpiCard}>
            <div className={s.kpiIcon} style={{ background: k.color + '1A', color: k.color }}>{k.icon}</div>
            <div className={s.kpiInfo}>
              <span className={s.kpiLabel}>{k.label}</span>
              <h3 className={s.kpiValue}>{loading ? '...' : k.val}</h3>
            </div>
          </div>
        ))}
      </section>

      {/* CHARTS (PANTALLA) */}
      <section className={s.chartsGrid}>
        <div className={s.chartBox}>
          <div className={s.chartHeader}><PieChart size={18} /> <h3>Distribución por Tipo</h3></div>
          <div className={s.chartBody}>{loading ? <Loader2 className="animate-spin" /> : renderDonutChart(dataTipo)}</div>
        </div>
        <div className={s.chartBox}>
          <div className={s.chartHeader}><BarChart3 size={18} /> <h3>Ingresos por Día</h3></div>
          <div className={s.chartBody}>{loading ? <Loader2 className="animate-spin" /> : renderBarChart(dataDia)}</div>
        </div>
        <div className={`${s.chartBox} ${s.fullWidth}`}>
          <div className={s.chartHeader}><Activity size={18} /> <h3>Tendencia Horaria (Horas Pico)</h3></div>
          <div className={s.chartBody}>{loading ? <Loader2 className="animate-spin" /> : renderLineChart(dataHoras)}</div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          DIV OCULTO PARA GENERACIÓN DE PDF (ESTILOS INLINE PARA HTML2PDF)
          ══════════════════════════════════════════════════════════════════════════ */}
      <div 
        ref={pdfRef}
        id="reporte-pdf"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: '800px',
          background: '#ffffff',
          color: '#000000',
          padding: '40px',
          fontFamily: 'Arial, sans-serif'
        }}
      >
        <div style={{ borderBottom: '2px solid #22c55e', paddingBottom: '20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, color: '#000', fontSize: '24px' }}>INFORME DE RENDIMIENTO</h1>
            <p style={{ margin: '5px 0 0', color: '#666', fontSize: '14px' }}>PARQUEADERO - Sistema de Gestión</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold' }}>PERIODO:</p>
            <p style={{ margin: 0, fontSize: '12px', color: '#444' }}>{fechas.fechaDesde} al {fechas.fechaHasta}</p>
          </div>
        </div>

        {/* KPIs en PDF */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '30px' }}>
          {[
            { l: 'Ingresos Totales', v: formatMoneda(kpis?.total_ingresos || 0) },
            { l: 'Vehículos', v: kpis?.total_vehiculos || 0 },
            { l: 'T. Promedio', v: `${Math.round(kpis?.tiempo_promedio || 0)} min` },
            { l: 'Ingreso/Veh.', v: formatMoneda(kpis?.ingreso_promedio || 0) }
          ].map((k, i) => (
            <div key={i} style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', background: '#fcfcfc' }}>
              <p style={{ margin: 0, fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>{k.l}</p>
              <p style={{ margin: '5px 0 0', fontSize: '16px', fontWeight: 'bold', color: '#000' }}>{k.v}</p>
            </div>
          ))}
        </div>

        {/* Gráficas en PDF */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '30px' }}>
          <div style={{ border: '1px solid #eee', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '14px', margin: '0 0 15px', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px', color: '#000' }}>Distribución de Vehículos</h3>
            {renderDonutChart(dataTipo, true)}
          </div>
          <div style={{ border: '1px solid #eee', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '14px', margin: '0 0 15px', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px', color: '#000' }}>Ingresos Diarios</h3>
            {renderBarChart(dataDia, true)}
          </div>
        </div>

        <div style={{ border: '1px solid #eee', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
          <h3 style={{ fontSize: '14px', margin: '0 0 15px', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px', color: '#000' }}>Tendencia Horaria (Carga de Vehículos)</h3>
          {renderLineChart(dataHoras, true)}
        </div>

        {/* Tabla de detalle diario */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '14px', margin: '0 0 15px', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px', color: '#000' }}>Detalle Diario de Ingresos</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f8f8f8' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #ddd', color: '#333', fontWeight: 600 }}>Fecha</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #ddd', color: '#333', fontWeight: 600 }}>Tipo Vehículo</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '2px solid #ddd', color: '#333', fontWeight: 600 }}>Vehículos</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '2px solid #ddd', color: '#333', fontWeight: 600 }}>Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {dataDia.map((d, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '6px 12px', borderBottom: '1px solid #eee', color: '#333' }}>{String(d.fecha).slice(0, 10)}</td>
                  <td style={{ padding: '6px 12px', borderBottom: '1px solid #eee', color: '#555' }}>{d.tipo_vehiculo || '—'}</td>
                  <td style={{ padding: '6px 12px', borderBottom: '1px solid #eee', color: '#333', textAlign: 'right', fontWeight: 500 }}>{d.total_vehiculos}</td>
                  <td style={{ padding: '6px 12px', borderBottom: '1px solid #eee', color: '#22c55e', textAlign: 'right', fontWeight: 600 }}>{formatMoneda(d.ingresos_brutos)}</td>
                </tr>
              ))}
              <tr style={{ background: '#f0f0f0', fontWeight: 'bold' }}>
                <td style={{ padding: '8px 12px', borderTop: '2px solid #ccc', color: '#000' }} colSpan={2}>TOTAL</td>
                <td style={{ padding: '8px 12px', borderTop: '2px solid #ccc', color: '#000', textAlign: 'right' }}>{kpis?.total_vehiculos || 0}</td>
                <td style={{ padding: '8px 12px', borderTop: '2px solid #ccc', color: '#22c55e', textAlign: 'right' }}>{formatMoneda(kpis?.total_ingresos || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #eee', textAlign: 'center', color: '#aaa', fontSize: '10px' }}>
          Reporte generado automáticamente el {new Date().toLocaleString('es-CO')} | Sistema de Parqueadero
        </div>
      </div>
    </div>
  );
}
