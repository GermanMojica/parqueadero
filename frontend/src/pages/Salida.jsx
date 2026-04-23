// src/pages/Salida.jsx
import { useState }      from 'react';
import { useRegistros }  from '../hooks/useRegistros';
import { useParqueadero } from '../context/ParqueaderoContext';
import { normalizarPlaca, formatFecha, formatDuracion, formatMoneda } from '../utils/format.utils';
import s from './Operacion.module.css';

const STEP = { BUSCAR: 'BUSCAR', PREVIEW: 'PREVIEW', TICKET: 'TICKET' };

export default function Salida() {
  const { previewSalida, registrarSalida, loading, error, clearError } = useRegistros();
  const { refetch } = useParqueadero();

  const [step,    setStep]    = useState(STEP.BUSCAR);
  const [placa,   setPlaca]   = useState('');
  const [preview, setPreview] = useState(null);
  const [ticket,  setTicket]  = useState(null);
  const [placaErr, setPlacaErr] = useState('');

  const handleBuscar = async (e) => {
    e.preventDefault();
    const p = normalizarPlaca(placa);
    if (!p || !/^[A-Z0-9]{5,8}$/.test(p)) {
      setPlacaErr('Ingresa una placa válida (ej: ABC123)');
      return;
    }
    clearError();
    setPlacaErr('');
    try {
      const data = await previewSalida(p);
      setPreview(data);
      setStep(STEP.PREVIEW);
    } catch { /* error en hook */ }
  };

  const handleConfirmar = async () => {
    clearError();
    try {
      const result = await registrarSalida({ placa: normalizarPlaca(placa) });
      setTicket(result);
      setStep(STEP.TICKET);
      refetch();
    } catch { /* error en hook */ }
  };

  const handleNuevo = () => {
    setStep(STEP.BUSCAR);
    setPlaca('');
    setPreview(null);
    setTicket(null);
    clearError();
  };

  // ── Ticket final ────────────────────────────────────────────────────────
  if (step === STEP.TICKET && ticket) {
    const c = ticket.calculo;
    return (
      <div className={s.page}>
        <div className={s.ticketWrapper}>
          <div className={s.ticketSuccess}>✓</div>
          <h2 className={s.ticketTitle}>Salida registrada</h2>

          <div className={s.ticket}>
            <div className={s.ticketHeader}>
              <span className={s.ticketLogo}>🅿</span>
              <div>
                <p className={s.ticketCodigo}>{ticket.ticket?.codigoTicket}</p>
                <p className={s.ticketTipo}>TICKET DE SALIDA</p>
              </div>
            </div>
            <div className={s.ticketGrid}>
              <div className={s.ticketField}><span>Placa</span><strong>{ticket.placa}</strong></div>
              <div className={s.ticketField}><span>Espacio</span><strong>{ticket.espacio}</strong></div>
              <div className={s.ticketField}><span>Entrada</span><strong>{formatFecha(c.horaEntrada)}</strong></div>
              <div className={s.ticketField}><span>Salida</span><strong>{formatFecha(c.horaSalida)}</strong></div>
              <div className={s.ticketField}><span>Duración</span><strong>{formatDuracion(c.minutosTotales)}</strong></div>
              <div className={s.ticketField}><span>Tarifa/hora</span><strong>{formatMoneda(c.tarifaHora)}</strong></div>
            </div>

            <div className={s.totalCobro}>
              <span>TOTAL A COBRAR</span>
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

  // ── Preview de cobro ────────────────────────────────────────────────────
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

          {/* Resumen del vehículo */}
          <div className={s.previewCard}>
            <div className={s.previewRow}>
              <span>Placa</span><strong>{r.placa}</strong>
            </div>
            <div className={s.previewRow}>
              <span>Tipo</span><strong>{r.tipoVehiculo}</strong>
            </div>
            <div className={s.previewRow}>
              <span>Espacio</span><strong>{r.espacio}</strong>
            </div>
            <div className={s.previewRow}>
              <span>Entrada</span><strong>{formatFecha(r.horaEntrada)}</strong>
            </div>
            <div className={s.previewRow}>
              <span>Tiempo aprox.</span><strong>{formatDuracion(c.minutosTotales)}</strong>
            </div>
            <div className={s.previewRow}>
              <span>Tarifa/hora</span><strong>{formatMoneda(c.tarifaHora)}</strong>
            </div>
            <div className={s.previewRow}>
              <span>Fracción mín.</span><strong>{c.fraccionMinutos} min</strong>
            </div>
          </div>

          <div className={s.totalPreview}>
            <span>COBRO ESTIMADO</span>
            <strong>{formatMoneda(c.totalEstimado)}</strong>
          </div>

          <p className={s.previewNota}>
            * El cobro final se calcula al momento exacto de confirmar
          </p>

          <div className={s.previewBtns}>
            <button className={s.btnCancelar} onClick={handleNuevo} disabled={loading}>
              ← Cancelar
            </button>
            <button className={s.submitBtn} onClick={handleConfirmar} disabled={loading}>
              {loading ? <span className={s.spinner} /> : '✓ Confirmar y cobrar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Búsqueda por placa ──────────────────────────────────────────────────
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
            <input
              className={`${s.input} ${placaErr ? s.inputError : ''}`}
              placeholder="ABC123"
              value={placa}
              onChange={(e) => { setPlacaErr(''); setPlaca(normalizarPlaca(e.target.value)); }}
              maxLength={8}
              style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '1.25rem', fontWeight: 600 }}
              autoFocus
            />
            {placaErr && <span className={s.fieldError}>{placaErr}</span>}
          </div>

          <button type="submit" className={s.submitBtn} disabled={loading}>
            {loading ? <span className={s.spinner} /> : '🔍 Buscar vehículo'}
          </button>
        </form>
      </div>
    </div>
  );
}
