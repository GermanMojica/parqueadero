import { useState }       from 'react';
import { useRegistros }   from '../hooks/useRegistros';
import { useParqueadero } from '../context/ParqueaderoContext';
import { PlacaInput }     from '../components/shared/PlacaInput';
import { formatFecha, formatDuracion, formatMoneda } from '../utils/format.utils';
import { Search, Banknote, CreditCard, Smartphone, MoreHorizontal, ArrowUp, ArrowLeft, CheckCircle, Printer, Plus, AlertCircle } from 'lucide-react';
import { TicketRecibo } from '../components/shared/TicketRecibo';
import { fidelizacionApi } from '../api/index';
import { Trophy, Star, Gift } from 'lucide-react';
import s from './Operacion.module.css';

const STEP = { BUSCAR: 'BUSCAR', PREVIEW: 'PREVIEW', TICKET: 'TICKET' };

const METODOS_PAGO = [
  { id: 'EFECTIVO',      label: 'Efectivo',     icon: <Banknote size={20}/> },
  { id: 'TARJETA',       label: 'Tarjeta',      icon: <CreditCard size={20}/> },
  { id: 'TRANSFERENCIA', label: 'Transferencia', icon: <Smartphone size={20}/> },
  { id: 'OTRO',          label: 'Otro',         icon: <MoreHorizontal size={20}/> },
];

export default function Salida() {
  const { previewSalida, registrarSalida, loading, error, clearError } = useRegistros();
  const { refetch } = useParqueadero();

  const [step,       setStep]      = useState(STEP.BUSCAR);
  const [placa,      setPlaca]     = useState('');
  const [placaMeta,  setPlacaMeta] = useState({ valida: false });
  const [preview,    setPreview]   = useState(null);
  const [ticket,     setTicket]    = useState(null);
  const [metodoPago, setMetodoPago]= useState('');
  const [pagoError,  setPagoError] = useState('');
  const [tarjeta,    setTarjeta]   = useState(null);
  const [canjear,    setCanjear]   = useState(false);

  const handlePlacaChange = (val, meta) => {
    setPlaca(val);
    setPlacaMeta(meta);
    clearError();
  };

  const handleBuscar = async (e) => {
    e.preventDefault();
    if (!placaMeta.valida) return;
    clearError();
    try {
      const data = await previewSalida(placa);
      setPreview(data);
      setMetodoPago('');
      setPagoError('');
      setCanjear(false);
      
      // Buscar tarjeta de fidelización
      try {
        const t = await fidelizacionApi.getTarjeta(placa);
        setTarjeta(t);
      } catch {
        setTarjeta(null);
      }

      setStep(STEP.PREVIEW);
    } catch { /* error en hook */ }
  };

  const handleConfirmar = async () => {
    if (!metodoPago) { setPagoError('Selecciona el método de pago para continuar'); return; }
    clearError();
    setPagoError('');
    try {
      const result = await registrarSalida({ placa, metodoPago, canjearPuntos: canjear });
      setTicket({ ...result, metodoPago });
      setStep(STEP.TICKET);
      refetch();
    } catch {
      setStep(STEP.BUSCAR);
      setPreview(null);
    }
  };

  const handleNuevo = () => {
    setStep(STEP.BUSCAR);
    setPlaca('');
    setPlacaMeta({ valida: false });
    setPreview(null);
    setTicket(null);
    setMetodoPago('');
    setPagoError('');
    setTarjeta(null);
    setCanjear(false);
    clearError();
  };

  if (step === STEP.TICKET && ticket) {
    return (
      <div className={s.page}>
        <TicketRecibo
          ticketData={ticket}
          tipo="SALIDA"
          onAction={handleNuevo}
          actionLabel="Nueva salida"
          actionIcon={<Plus size={16} />}
        />
      </div>
    );
  }

  if (step === STEP.PREVIEW && preview) {
    const r = preview.registro;
    const c = preview.calculo;
    return (
      <div className={s.page}>
        <div className={s.formCard}>
          <div className={s.formHeader}>
            <h1 className={s.formTitle}><ArrowUp size={24} /> Confirmar Salida</h1>
            <p className={s.formSubtitle}>Verifica el cobro y selecciona el método de pago</p>
          </div>

          {error && <div className={s.errorBox}><AlertCircle size={16}/> {error}</div>}

          <div className={s.formBody}>
            <div className={s.previewCard}>
              {[
                ['Placa',         r.placa],
                ['Tipo vehículo', r.tipoVehiculo],
                ['Espacio',       r.espacio],
                ['Hora entrada',  formatFecha(r.horaEntrada)],
                ['Tiempo aprox.', formatDuracion(c.minutosTotales)],
                ['Tarifa / hora', formatMoneda(c.tarifaHora)],
                ['Fracción mín.', `${c.fraccionMinutos} min`],
              ].map(([k, v]) => (
                <div key={k} className={s.previewRow}>
                  <span>{k}</span><strong>{v}</strong>
                </div>
              ))}
            </div>

            {tarjeta && (
              <div className={s.pagoSection} style={{borderColor:'var(--brand-green)', marginBottom:'var(--space-4)'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                  <span className={s.pagoTitle} style={{color:'var(--brand-green)', margin:0}}>
                    <Trophy size={14} style={{display:'inline', marginRight:4}}/> Cliente {tarjeta.nivel}
                  </span>
                  <strong style={{color:'var(--brand-green)', fontSize:12}}>{tarjeta.puntos_acumulados} pts</strong>
                </div>
                
                <label className={s.tipoOption} style={{
                  flexDirection:'row', padding:'8px 12px', gap:12,
                  borderColor: canjear ? 'var(--brand-green)' : 'var(--color-border-base)',
                  background: canjear ? 'rgba(62, 207, 142, 0.05)' : 'var(--color-base)'
                }}>
                  <input 
                    type="checkbox" 
                    checked={canjear} 
                    onChange={e => setCanjear(e.target.checked)}
                    style={{width:18, height:18}}
                  />
                  <div style={{textAlign:'left', flex:1}}>
                    <div style={{fontSize:13, fontWeight:500, color:'var(--text-primary)'}}>Canjear beneficios</div>
                    <div style={{fontSize:11, color:'var(--text-muted)'}}>Aplica descuento de nivel en el total</div>
                  </div>
                  <Star size={18} color={canjear ? 'var(--brand-green)' : 'var(--text-muted)'} />
                </label>
              </div>
            )}

            <div className={s.totalPreview}>
              <span>Cobro estimado</span>
              <strong>{formatMoneda(c.totalEstimado)}</strong>
            </div>
            <p className={s.previewNota}>* El monto final se calcula al confirmar</p>

            <div className={s.pagoSection}>
              <p className={s.pagoTitle}>Método de pago</p>
              <div className={s.pagoGrid}>
                {METODOS_PAGO.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    className={`${s.pagoBtn} ${metodoPago === m.id ? s.pagoBtnActive : ''}`}
                    onClick={() => { setMetodoPago(m.id); setPagoError(''); }}
                  >
                    {m.icon}
                    <span className={s.pagoLabel}>{m.label}</span>
                  </button>
                ))}
              </div>
              {pagoError && <p className={s.pagoError}><AlertCircle size={12} style={{display:'inline', verticalAlign:'middle'}}/> {pagoError}</p>}
            </div>

            <div className={s.previewBtns}>
              <button className={s.btnCancelar} onClick={handleNuevo} disabled={loading}>
                <ArrowLeft size={16} /> Cancelar
              </button>
              <button className="btn-primary" onClick={handleConfirmar} disabled={loading} style={{flex:2}}>
                {loading ? <span className={s.spinner} /> : <><CheckCircle size={16}/> Confirmar y cobrar</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <div className={s.formCard}>
        <div className={s.formHeader}>
          <h1 className={s.formTitle}><ArrowUp size={24} /> Registrar Salida</h1>
          <p className={s.formSubtitle}>Busca el vehículo por placa para procesar la salida</p>
        </div>

        {error && <div className={s.errorBox}><AlertCircle size={16}/> {error}</div>}

        <div className={s.formBody}>
          <form onSubmit={handleBuscar} style={{ display:'flex', flexDirection:'column', gap:'var(--space-5)' }} noValidate>
            <div className={s.field}>
              <label className={s.label}>Placa del vehículo</label>
              <PlacaInput value={placa} onChange={handlePlacaChange} disabled={loading} autoFocus />
            </div>

            <button type="submit" className="btn-primary" disabled={loading || !placaMeta.valida}>
              {loading ? <span className={s.spinner} /> : <><Search size={16}/> Buscar vehículo</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
