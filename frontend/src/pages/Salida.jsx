import { useState }       from 'react';
import { useRegistros }   from '../hooks/useRegistros';
import { useParqueadero } from '../context/ParqueaderoContext';
import { PlacaInput }     from '../components/shared/PlacaInput';
import { formatFecha, formatDuracion, formatMoneda } from '../utils/format.utils';
import { Search, Banknote, CreditCard, Smartphone, MoreHorizontal, ArrowUp, ArrowLeft, CheckCircle, Printer, Plus, AlertCircle } from 'lucide-react';
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
      setStep(STEP.PREVIEW);
    } catch { /* error en hook */ }
  };

  const handleConfirmar = async () => {
    if (!metodoPago) { setPagoError('Selecciona el método de pago para continuar'); return; }
    clearError();
    setPagoError('');
    try {
      const result = await registrarSalida({ placa, metodoPago });
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
    clearError();
  };

  if (step === STEP.TICKET && ticket) {
    const c = ticket.calculo;
    const t = ticket.ticket;
    const metodo = METODOS_PAGO.find(m => m.id === ticket.metodoPago) || METODOS_PAGO[0];
    return (
      <div className={s.page}>
        <div className={s.ticketWrapper}>
          <div className={s.ticketSuccessIcon}><CheckCircle size={32} /></div>
          <h2 className={s.ticketTitle}>Salida registrada</h2>

          <div className={s.ticket}>
            <div className={s.ticketHeader}>
              <div className={s.ticketLogo}><ArrowUp size={24} /></div>
              <div>
                <p className={s.ticketCodigo}>{t?.codigoTicket ?? `TK-${ticket.registroId}`}</p>
                <p className={s.ticketTipo}>Ticket de Salida</p>
              </div>
              <div className={s.ticketPagoBadge}>
                {metodo.icon}
                <span>{metodo.label}</span>
              </div>
            </div>

            <div className={s.ticketBodyQR}>
              <div className={s.ticketGrid}>
                <div className={s.ticketField}><span>Placa</span><strong>{ticket.placa}</strong></div>
                <div className={s.ticketField}><span>Espacio</span><strong>{ticket.espacio}</strong></div>
                <div className={s.ticketField}><span>Entrada</span><strong>{formatFecha(c.horaEntrada)}</strong></div>
                <div className={s.ticketField}><span>Salida</span><strong>{formatFecha(c.horaSalida)}</strong></div>
                <div className={s.ticketField}><span>Duración</span><strong>{formatDuracion(c.minutosTotales)}</strong></div>
                <div className={s.ticketField}><span>Tarifa/h</span><strong>{formatMoneda(c.tarifaHora)}</strong></div>
              </div>
              {t?.qrDataURL && (
                <div className={s.qrContainer}>
                  <img src={t.qrDataURL} alt="QR salida" className={s.qrImg} />
                  <p className={s.qrLabel}>Comprobante digital</p>
                </div>
              )}
            </div>

            <div className={s.totalCobro}>
              <span>Total cobrado</span>
              <div className={s.totalCobroPagoBadge}>
                <strong>{formatMoneda(c.totalCobrado)}</strong>
                <span className={s.totalCobroMethod} style={{display:'flex', alignItems:'center', gap:'4px'}}>{React.cloneElement(metodo.icon, {size:12})} {metodo.label}</span>
              </div>
            </div>

            <p className={s.ticketNote}>Gracias por usar nuestro parqueadero · {new Date().toLocaleDateString('es-CO')}</p>
          </div>

          <div className={s.ticketActions}>
            <button className={s.btnPrint} onClick={() => window.print()}><Printer size={16}/> Imprimir</button>
            <button className="btn-primary" onClick={handleNuevo} style={{flex:2}}><Plus size={16}/> Nueva salida</button>
          </div>
        </div>
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
