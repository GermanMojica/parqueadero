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
    
    const element = pdfRef.current;
    const opt = {
      margin:       10,
      filename:     `Reporte_Parqueadero_${fechas.fechaDesde}_a_${fechas.fechaHasta}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('Error PDF:', err);
      alert('Error al generar PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // --- Charts UI Helpers (Reutilizables) ---

  const renderBarChart = (data, isPdf = false) => {
    if (!data?.length) return <p style={{color: isPdf ? '#666' : 'var(--text-muted)'}}>Sin datos</p>;
    const maxVal = Math.max(...data.map(d => Number(d.ingresos_brutos || 0)), 1);
    const width = 600;
    const barWidth = (width / data.length) * 0.8;
    const gap = (width / data.length) * 0.2;
    const barColor = '#22c55e';

    return (
      <svg viewBox={`0 0 ${width} ${SVG_BAR_HEIGHT}`} style={{width: '100%', height: 'auto', overflow: 'visible'}}>
        {data.map((d, i) => {
          const h = (Number(d.ingresos_brutos || 0) / maxVal) * (SVG_BAR_HEIGHT - 40);
          return (
            <g key={i}>
              <rect x={i * (barWidth + gap)} y={SVG_BAR_HEIGHT - h - 20} width={barWidth} height={h} fill={barColor} rx="4" />
              <text x={i * (barWidth + gap) + barWidth/2} y={SVG_BAR_HEIGHT - 5} fontSize="10" fill={isPdf ? '#666' : '#94a3b8'} textAnchor="middle">{String(d.fecha).slice(5, 10)}</text>
            </g>
          );
        })}
      </svg>
    );
  };

  const renderLineChart = (data, isPdf = false) => {
    if (!data?.length) return <p style={{color: isPdf ? '#666' : 'var(--text-muted)'}}>Sin datos</p>;
    
    // Agrupar por hora (0 a 23) ya que la DB puede devolver múltiples filas por hora (por tipo de vehículo)
    const entradasPorHora = Array(24).fill(0);
    data.forEach(d => {
      if (d.hora !== undefined) {
        entradasPorHora[Number(d.hora)] += Number(d.entradas || 0);
      }
    });

    // Encontrar min y max hora con datos para no dibujar un montón de ceros a los lados si no se desea,
    // o simplemente dibujar las 24 horas. Vamos a dibujar las 24 horas para que el eje X sea consistente.
    const maxVal = Math.max(...entradasPorHora, 1);
    const width = 600;

    // Crear puntos usando el índice (hora 0 a 23)
    const points = entradasPorHora.map((entradas, hora) => {
      const x = (hora / 23) * width;
      const y = SVG_LINE_HEIGHT - (entradas / maxVal) * (SVG_LINE_HEIGHT - 40) - 20;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg viewBox={`0 0 ${width} ${SVG_LINE_HEIGHT}`} style={{width: '100%', height: 'auto', overflow: 'visible'}}>
        <polyline fill="none" stroke="#22c55e" strokeWidth="3" points={points} />
        {entradasPorHora.map((entradas, hora) => {
          if (entradas === 0 && maxVal > 1) return null; // No dibujar círculos en los 0s a menos que todo sea 0
          const x = (hora / 23) * width;
          const y = SVG_LINE_HEIGHT - (entradas / maxVal) * (SVG_LINE_HEIGHT - 40) - 20;
          return (
            <g key={hora}>
              <circle cx={x} cy={y} r="4" fill={isPdf ? '#fff' : '#0f0f0f'} stroke="#22c55e" strokeWidth="2" />
              <text x={x} y={y - 10} fontSize="10" fill={isPdf ? '#666' : '#94a3b8'} textAnchor="middle">{hora}:00</text>
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
      <div style={{display: 'flex', alignItems: 'center', gap: '20px', width: '100%'}}>
        <svg viewBox="0 0 100 100" style={{width: '120px', height: '120px'}}>
          {data.map((d, i) => {
            const percentage = (Number(d.cantidad) / total) * 100;
            const dashArray = `${percentage} ${100 - percentage}`;
            const dashOffset = -currentAngle + 25;
            currentAngle += percentage;
            return <circle key={i} cx="50" cy="50" r="40" fill="transparent" stroke={colors[i % colors.length]} strokeWidth="12" strokeDasharray={dashArray} strokeDashoffset={dashOffset} pathLength="100" />;
          })}
          <circle cx="50" cy="50" r="30" fill={isPdf ? '#fff' : '#0f0f0f'} />
          <text x="50" y="55" textAnchor="middle" fill={isPdf ? '#000' : '#fff'} fontSize="10" fontWeight="bold">{total}</text>
        </svg>
        <div style={{flex: 1}}>
          {data.map((d, i) => (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginBottom: '4px', color: isPdf ? '#333' : '#94a3b8'}}>
              <span style={{width: '8px', height: '8px', borderRadius: '50%', background: colors[i % colors.length]}} />
              <span>{d.tipo}: <b>{Math.round((d.cantidad/total)*100)}%</b></span>
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
            <h3 style={{ fontSize: '14px', margin: '0 0 15px', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px' }}>Distribución de Vehículos</h3>
            {renderDonutChart(dataTipo, true)}
          </div>
          <div style={{ border: '1px solid #eee', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '14px', margin: '0 0 15px', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px' }}>Ingresos Diarios</h3>
            {renderBarChart(dataDia, true)}
          </div>
        </div>

        <div style={{ border: '1px solid #eee', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '14px', margin: '0 0 15px', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px' }}>Tendencia Horaria (Carga de Vehículos)</h3>
          {renderLineChart(dataHoras, true)}
        </div>

        <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #eee', textAlign: 'center', color: '#aaa', fontSize: '10px' }}>
          Reporte generado automáticamente el {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
}
