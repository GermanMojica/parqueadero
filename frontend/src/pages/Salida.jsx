// src/pages/Salida.jsx — con PlacaInput validado y ticket con QR
import { useState }       from 'react';
import { useRegistros }   from '../hooks/useRegistros';
import { useParqueadero } from '../context/ParqueaderoContext';
import { PlacaInput }     from '../components/shared/PlacaInput';
import { formatFecha, formatDuracion, formatMoneda } from '../utils/format.utils';
import s from './Operacion.module.css';

const STEP = { BUSCAR: 'BUSCAR', PREVIEW: 'PREVIEW', TICKET: 'TICKET' };

export default function Salida() {
  const { previewSalida, registrarSalida, loading, error, clearError } = useRegistros();
  const { refetch } = useParqueadero();

  const [step,      setStep]    = useState(STEP.BUSCAR);
  const [placa,     setPlaca]   = useState('');
  const [placaMeta, setPlacaMeta] = useState({ valida: false });
  const [preview,   setPreview] = useState(null);
  const [ticket,    setTicket]  = useState(null);

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
      setStep(STEP.PREVIEW);
    } catch { /* error en hook */ }
  };

  const handleConfirmar = async () => {
    clearError();
    try {
      const result = await registrarSalida({ placa });
      setTicket(result);
      setStep(STEP.TICKET);
      refetch();
    } catch { /* error en hook */ }
  };

  const handleNuevo = () => {
    setStep(STEP.BUSCAR);
    setPlaca('');
    setPlacaMeta({ valida: false });
    setPreview(null);
    setTicket(null);
    clearError();
  };

  // ── Ticket de salida con QR ──────────────────────────────────────────────
  if (step === STEP.TICKET && ticket) {
    const c = ticket.calculo;
    const t = ticket.ticket;
    return (
      <div className={s.page}>
        <div className={s.ticketWrapper}>
          <div className={s.ticketSuccess}>✓</div>
          <h2 className={s.ticketTitle}>Salida registrada</h2>

          <div className={s.ticket}>
            <div className={s.ticketHeader}>
              <span className={s.ticketLogo}>🅿</span>
              <div>
                <p className={s.ticketCodigo}>{t?.codigoTicket ?? `TK-SALIDA-${ticket.registroId}`}</p>
                <p className={s.ticketTipo}>TICKET DE SALIDA</p>
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
                  <p className={s.qrLabel}>Comprobante</p>
                </div>
              )}
            </div>

            <div className={s.totalCobro}>
              <span>TOTAL COBRADO</span>
              <strong>{formatMoneda(c.totalCobrado)}</strong>
            </div>

            <p className={s.ticketNote}>Gracias por usar nuestro parqueadero</p>
          </div>

          <div className={s.ticketActions}>
            <button className={s.btnPrint} onClick={() => window.print()}>🖨 Imprimir</button>
            <button className={s.btnNuevo} onClick={handleNuevo}>+ Nueva salida</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Preview de cobro ──────────────────────────────────────────────────────
  if (step === STEP.PREVIEW && preview) {
    const r = preview.registro;
    const c = preview.calculo;
    return (
      <div className={s.page}>
        <div className={s.formCard}>
          <div className={s.formHeader}>
            <h1 className={s.formTitle}>↑ Confirmar Salida</h1>
            <p className={s.formSubtitle}>Verifica los datos antes de registrar el cobro</p>
          </div>

          {error && <div className={s.errorBox}>{error}</div>}

          <div className={s.previewCard}>
            {[
              ['Placa',     r.placa],
              ['Tipo',      r.tipoVehiculo],
              ['Espacio',   r.espacio],
              ['Entrada',   formatFecha(r.horaEntrada)],
              ['Tiempo aprox.', formatDuracion(c.minutosTotales)],
              ['Tarifa/hora',   formatMoneda(c.tarifaHora)],
              ['Fracción mín.', `${c.fraccionMinutos} min`],
            ].map(([k, v]) => (
              <div key={k} className={s.previewRow}>
                <span>{k}</span><strong>{v}</strong>
              </div>
            ))}
          </div>

          <div className={s.totalPreview}>
            <span>COBRO ESTIMADO</span>
            <strong>{formatMoneda(c.totalEstimado)}</strong>
          </div>
          <p className={s.previewNota}>* El cobro final se calcula al momento exacto de confirmar</p>

          <div className={s.previewBtns}>
            <button className={s.btnCancelar} onClick={handleNuevo} disabled={loading}>← Cancelar</button>
            <button className={s.submitBtn} onClick={handleConfirmar} disabled={loading}>
              {loading ? <span className={s.spinner} /> : '✓ Confirmar y cobrar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Búsqueda por placa ────────────────────────────────────────────────────
  return (
    <div className={s.page}>
      <div className={s.formCard}>
        <div className={s.formHeader}>
          <h1 className={s.formTitle}>↑ Registrar Salida</h1>
          <p className={s.formSubtitle}>Busca el vehículo por su placa para procesar la salida</p>
        </div>

        {error && <div className={s.errorBox}>{error}</div>}

        <form onSubmit={handleBuscar} className={s.form} noValidate>
          <div className={s.field}>
            <label className={s.label}>Placa del vehículo</label>
            <PlacaInput value={placa} onChange={handlePlacaChange} disabled={loading} autoFocus />
          </div>

          <button type="submit" className={s.submitBtn} disabled={loading || !placaMeta.valida}>
            {loading ? <span className={s.spinner} /> : '🔍 Buscar vehículo'}
          </button>
        </form>
      </div>
    </div>
  );
}
