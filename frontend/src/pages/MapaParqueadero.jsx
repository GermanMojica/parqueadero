import { useState, useEffect, useCallback } from 'react';
import { espaciosApi }   from '../api/index';
import { useRegistros }  from '../hooks/useRegistros';
import { useParqueadero } from '../context/ParqueaderoContext';
import { formatFecha, formatDuracion, formatMoneda } from '../utils/format.utils';
import { 
  Map as MapIcon, RefreshCw, Loader2, Bike, Truck, Car,
  Banknote, CreditCard, Smartphone, MoreHorizontal, CheckCircle, Printer
} from 'lucide-react';
import { ticketsApi } from '../api/index';
import { TicketRecibo } from '../components/shared/TicketRecibo';
import s from './MapaParqueadero.module.css';

const ESTADO_CFG = {
  DISPONIBLE:    { label: 'Libre',      color: 'var(--brand-green)' },
  OCUPADO:       { label: 'Ocupado',    color: 'var(--color-crimson4)' },
  MANTENIMIENTO: { label: 'Mant.',      color: 'var(--color-yellowA7)' },
};

const TIPO_ICON = { 
  MOTO: <Bike size={16}/>, 
  CAMIONETA: <Truck size={16}/>, 
  SEDAN: <Car size={16}/> 
};

const TIPO_ICON_LG = { 
  MOTO: <Bike size={24}/>, 
  CAMIONETA: <Truck size={24}/>, 
  SEDAN: <Car size={24}/> 
};

const METODOS = [
  { id: 'EFECTIVO', icon: <Banknote size={20}/>, label: 'Efectivo' },
  { id: 'TARJETA',  icon: <CreditCard size={20}/>, label: 'Tarjeta'  },
  { id: 'TRANSFERENCIA', icon: <Smartphone size={20}/>, label: 'Transfer.' },
  { id: 'OTRO',     icon: <MoreHorizontal size={20}/>, label: 'Otro'     },
];

function EspacioCell({ espacio, onClick }) {
  const cfg = ESTADO_CFG[espacio.estado] ?? ESTADO_CFG.DISPONIBLE;
  const tipoIcon = TIPO_ICON[espacio.tipo_vehiculo] ?? <Car size={16}/>;
  return (
    <button
      className={`${s.espacio} ${s[espacio.estado?.toLowerCase() ?? 'disponible']}`}
      onClick={() => onClick(espacio)}
      title={`${espacio.codigo} — ${espacio.estado}${espacio.placa ? ' · ' + espacio.placa : ''}`}
    >
      <span className={s.espacioTipo}>{tipoIcon}</span>
      <span className={s.espacioCodigo}>{espacio.codigo}</span>
      {espacio.estado === 'OCUPADO' && espacio.placa ? (
        <span className={s.espacioPlaca}>{espacio.placa}</span>
      ) : (
        <span className={s.espacioEstado}>{cfg.label}</span>
      )}
    </button>
  );
}

export default function MapaParqueadero() {
  const { resumen, refetch }                     = useParqueadero();
  const { previewSalida, registrarSalida, loading } = useRegistros();

  const [espacios,   setEspacios]   = useState([]);
  const [cargando,   setCargando]   = useState(false);
  const [seleccion,  setSeleccion]  = useState(null);
  const [preview,    setPreview]    = useState(null);
  const [loadPreview,setLoadPreview]= useState(false);
  const [metodoPago, setMetodoPago] = useState('');
  const [pagoError,  setPagoError]  = useState('');
  const [salidaOk,   setSalidaOk]   = useState(null);
  const [filtro,     setFiltro]     = useState('TODOS');
  const [entranceTicket, setEntranceTicket] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setEspacios(await espaciosApi.getAll()); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const handleSeleccion = async (espacio) => {
    setSeleccion(espacio);
    setPreview(null);
    setMetodoPago('');
    setPagoError('');
    setSalidaOk(null);
    if (espacio.estado === 'OCUPADO' && espacio.placa) {
      setLoadPreview(true);
      try {
        const data = await previewSalida(espacio.placa);
        setPreview(data);
      } catch { /* no bloquea el modal */ }
      finally { setLoadPreview(false); }
    }
  };

  const handleSalida = async () => {
    if (!metodoPago) { setPagoError('Selecciona el método de pago'); return; }
    setPagoError('');
    try {
      const result = await registrarSalida({ placa: seleccion.placa, metodoPago });
      setSalidaOk(result);
      refetch();
      cargar();
    } catch (err) {
      setPagoError(err.message || 'Error al registrar la salida');
    }
  };

  const handleImprimirEntrada = async () => {
    if (!preview?.registro?.id) return;
    try {
      const tickets = await ticketsApi.getByRegistro(preview.registro.id);
      const entrada = tickets.find(t => t.tipo === 'ENTRADA');
      if (entrada) {
        setEntranceTicket(entrada.datos_json);
      }
    } catch (err) {
      console.error('Error al recuperar ticket:', err);
    }
  };

  const handleMantenimiento = async (estado) => {
    try {
      await espaciosApi.updateEstado(seleccion.id, estado);
      refetch();
      cargar();
      cerrarModal();
    } catch (err) {
      console.error('Error al cambiar estado de mantenimiento', err);
    }
  };

  const cerrarModal = () => {
    setSeleccion(null);
    setPreview(null);
    setSalidaOk(null);
    setMetodoPago('');
    setPagoError('');
    setEntranceTicket(null);
  };

  const grupos = espacios.reduce((acc, e) => {
    const k = e.tipo_vehiculo ?? 'OTROS';
    (acc[k] = acc[k] || []).push(e);
    return acc;
  }, {});

  const zonas      = ['TODOS', ...Object.keys(grupos)];
  const totalDisp  = espacios.filter(e => e.estado === 'DISPONIBLE').length;
  const totalOcup  = espacios.filter(e => e.estado === 'OCUPADO').length;
  const totalMant  = espacios.filter(e => e.estado === 'MANTENIMIENTO').length;
  const pctOcup    = espacios.length ? Math.round((totalOcup / espacios.length) * 100) : 0;

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <h1 className={s.title}>
          <MapIcon size={28} /> Mapa del Parqueadero
        </h1>
        <button className={s.refreshBtn} onClick={() => { cargar(); refetch(); }}>
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>

      <div className={s.kpiRow}>
        <div className={s.kpi} style={{ '--kpi-color': 'var(--brand-green)' }}>
          <span className={s.kpiNum} style={{ color:'var(--brand-green)' }}>{totalDisp}</span>
          <span className={s.kpiLabel}>Disponibles</span>
        </div>
        <div className={s.kpi} style={{ '--kpi-color': 'var(--color-crimson4)' }}>
          <span className={s.kpiNum} style={{ color:'var(--color-crimson4)' }}>{totalOcup}</span>
          <span className={s.kpiLabel}>Ocupados</span>
        </div>
        <div className={s.kpi} style={{ '--kpi-color': 'var(--color-yellowA7)' }}>
          <span className={s.kpiNum} style={{ color:'var(--color-yellowA7)' }}>{totalMant}</span>
          <span className={s.kpiLabel}>Mantenim.</span>
        </div>
        <div className={s.kpi} style={{ '--kpi-color': pctOcup >= 90 ? 'var(--color-crimson4)' : pctOcup >= 70 ? 'var(--color-yellowA7)' : 'var(--brand-green)' }}>
          <span className={s.kpiNum} style={{ color: pctOcup >= 90 ? 'var(--color-crimson4)' : pctOcup >= 70 ? 'var(--color-yellowA7)' : 'var(--brand-green)' }}>{pctOcup}%</span>
          <span className={s.kpiLabel}>Ocupación</span>
        </div>
      </div>

      <div className={s.controls}>
        <div className={s.filtros}>
          {zonas.map(z => (
            <button key={z} className={`${s.filtroBtn} ${filtro === z ? s.filtroBtnActive : ''}`}
              onClick={() => setFiltro(z)}>
              {TIPO_ICON[z] ?? <MapIcon size={16}/>} {z}
            </button>
          ))}
        </div>
        <div className={s.legend}>
          {Object.entries(ESTADO_CFG).map(([k, v]) => (
            <div key={k} className={s.legendItem}>
              <div className={s.legendDot} style={{ background: v.color }} />
              <span>{v.label}</span>
            </div>
          ))}
        </div>
      </div>

      {cargando ? (
        <div className={s.loading}>
          <Loader2 size={32} className="animate-spin" />
          Cargando mapa de espacios...
        </div>
      ) : (
        <div className={s.mapaWrapper}>
          {Object.entries(grupos)
            .filter(([tipo]) => filtro === 'TODOS' || tipo === filtro)
            .map(([tipo, lista]) => {
              const libres = lista.filter(e => e.estado === 'DISPONIBLE').length;
              const pct    = Math.round(((lista.length - libres) / lista.length) * 100);
              const col    = libres === 0 ? 'var(--color-crimson4)' : libres <= 3 ? 'var(--color-yellowA7)' : 'var(--brand-green)';
              return (
                <div key={tipo} className={s.zona}>
                  <div className={s.zonaHeader}>
                    <span className={s.zonaNombre}>{TIPO_ICON_LG[tipo] ?? <Car size={24}/>} {tipo}</span>
                    <span className={s.zonaLibres} style={{ color: col }}>
                      {libres === 0 ? 'LLENO' : `${libres} libre${libres !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <div className={s.barTrack}>
                    <div className={s.barFill} style={{ width:`${pct}%`, background:col }} />
                  </div>
                  <div className={s.espaciosGrid}>
                    {lista.map(e => (
                      <EspacioCell key={e.id} espacio={e} onClick={handleSeleccion} />
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {seleccion && (
        <div className={s.modalOverlay} onClick={cerrarModal}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            {salidaOk ? (
              <div className={s.ticketModalWrapper}>
                <TicketRecibo
                  ticketData={salidaOk.ticket}
                  tipo="SALIDA"
                  onAction={cerrarModal}
                  actionLabel="Finalizar"
                  actionIcon={<CheckCircle size={16} />}
                />
              </div>
            ) : entranceTicket ? (
              <div className={s.ticketModalWrapper}>
                <TicketRecibo
                  ticketData={entranceTicket}
                  tipo="ENTRADA"
                  onAction={() => setEntranceTicket(null)}
                  actionLabel="Volver al detalle"
                  actionIcon={<MoreHorizontal size={16} />}
                />
              </div>
            ) : (
              <>
                <div className={s.modalHeader}>
                  <span className={s.modalTitle}>
                    {TIPO_ICON_LG[seleccion.tipo_vehiculo] ?? <Car size={24}/>} Espacio {seleccion.codigo}
                  </span>
                  <span className={s.modalBadge} style={{
                    background: seleccion.estado === 'DISPONIBLE' ? 'rgba(62,207,142,0.1)'
                              : seleccion.estado === 'OCUPADO'    ? 'rgba(220,38,38,0.1)' : 'rgba(217,119,6,0.1)',
                    color:      seleccion.estado === 'DISPONIBLE' ? 'var(--brand-green)'
                              : seleccion.estado === 'OCUPADO'    ? 'var(--color-crimson4)' : 'var(--color-yellowA7)',
                  }}>
                    {ESTADO_CFG[seleccion.estado]?.label ?? seleccion.estado}
                  </span>
                </div>

                <div className={s.modalBody}>
                  <div className={s.modalRow}><span>Tipo</span><strong>{seleccion.tipo_vehiculo}</strong></div>

                  {seleccion.estado === 'OCUPADO' && (
                    <>
                      <div className={s.modalRow}><span>Placa</span><strong>{seleccion.placa ?? '—'}</strong></div>
                      {loadPreview && <div className={s.modalRow}><span colSpan={2} style={{display:'flex', alignItems:'center', gap:'8px'}}><Loader2 size={16} className="animate-spin"/> Calculando cobro...</span></div>}
                      {preview && (
                        <>
                          <div className={s.modalRow}><span>Entrada</span><strong>{formatFecha(preview.registro?.horaEntrada)}</strong></div>
                          <div className={s.modalRow}><span>Tiempo aprox.</span><strong>{formatDuracion(preview.calculo?.minutosTotales)}</strong></div>
                          <div className={s.modalRow}><span>Cobro estimado</span><strong style={{ color:'var(--brand-link)', fontSize:'1.05rem' }}>{formatMoneda(preview.calculo?.totalEstimado)}</strong></div>
                        </>
                      )}

                      <div style={{ paddingTop: 'var(--space-3)' }}>
                        <p style={{ fontFamily:'var(--font-mono)', fontSize:'var(--font-size-xs)', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'1.2px', marginBottom:'var(--space-2)' }}>
                          Método de pago para salida
                        </p>
                        <div className={s.pagoMiniGrid}>
                          {METODOS.map(m => (
                            <button key={m.id} type="button"
                              className={`${s.pagoBtnMini} ${metodoPago === m.id ? s.pagoBtnMiniActive : ''}`}
                              onClick={() => { setMetodoPago(m.id); setPagoError(''); }}>
                              {m.icon}
                              <span>{m.label}</span>
                            </button>
                          ))}
                        </div>
                        {pagoError && <p className={s.pagoMiniError}>{pagoError}</p>}
                      </div>
                    </>
                  )}
                </div>

                {seleccion.estado === 'OCUPADO' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
                    <button className={s.btnSalidaMapa} onClick={handleSalida}
                      disabled={loading || loadPreview}>
                      {loading ? 'Procesando...' : 'Registrar salida desde mapa'}
                    </button>
                    <button className={s.btnReimprimir} onClick={handleImprimirEntrada} disabled={loadPreview}>
                      <Printer size={16} /> Ver/Imprimir Ticket de Entrada
                    </button>
                  </div>
                )}
                {seleccion.estado === 'DISPONIBLE' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
                    <button className={s.btnReimprimir} onClick={() => handleMantenimiento('MANTENIMIENTO')} style={{color: 'var(--color-yellowA7)', borderColor: 'var(--color-yellowA7)'}}>
                      Poner en mantenimiento
                    </button>
                  </div>
                )}
                {seleccion.estado === 'MANTENIMIENTO' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
                    <button className={s.btnReimprimir} onClick={() => handleMantenimiento('DISPONIBLE')} style={{color: 'var(--brand-green)', borderColor: 'var(--brand-green)'}}>
                      Quitar mantenimiento (Habilitar)
                    </button>
                  </div>
                )}
                <button className={s.modalClose} onClick={cerrarModal}>Cerrar</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
