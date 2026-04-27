// src/pages/Entrada.jsx — con PlacaInput validado y ticket con QR
import { useState, useEffect }    from 'react';
import { useRegistros }           from '../hooks/useRegistros';
import { useParqueadero }         from '../context/ParqueaderoContext';
import { PlacaInput }             from '../components/shared/PlacaInput';
import { formatFecha }            from '../utils/format.utils';
import s from './Operacion.module.css';

export default function Entrada() {
  const { registrarEntrada, loading, error, clearError } = useRegistros();
  const { refetch, resumen }                             = useParqueadero();

  const [placa,       setPlaca]       = useState('');
  const [placaMeta,   setPlacaMeta]   = useState({ valida: false });
  const [tipoVId,     setTipoVId]     = useState('');
  const [tipoError,   setTipoError]   = useState('');
  const [ticket,      setTicket]      = useState(null);

  const cuposDisponibles = (id) =>
    resumen.find(t => t.id === Number(id))?.disponibles ?? '—';

  const handlePlacaChange = (val, meta) => {
    setPlaca(val);
    setPlacaMeta(meta);
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!placaMeta.valida) return;
    if (!tipoVId) { setTipoError('Selecciona el tipo de vehículo'); return; }
    if (cuposDisponibles(tipoVId) === 0) { setTipoError('No hay cupos disponibles'); return; }
    setTipoError('');
    try {
      const result = await registrarEntrada({ placa, tipoVehiculoId: Number(tipoVId) });
      setTicket(result);
      setPlaca('');
      setTipoVId('');
      refetch();
    } catch { /* error en hook */ }
  };

  const handleNuevo = () => { setTicket(null); clearError(); };

  // ── Ticket con QR ────────────────────────────────────────────────────────
  if (ticket) {
    const t = ticket.ticket;
    return (
      <div className={s.page}>
        <div className={s.ticketWrapper}>
          <div className={s.ticketSuccess}>✓</div>
          <h2 className={s.ticketTitle}>Entrada registrada</h2>

          <div className={s.ticket}>
            <div className={s.ticketHeader}>
              <span className={s.ticketLogo}>🅿</span>
              <div>
                <p className={s.ticketCodigo}>{t.codigoTicket}</p>
                <p className={s.ticketTipo}>TICKET DE ENTRADA</p>
              </div>
            </div>

            {/* Cuerpo: campos + QR lado a lado */}
            <div className={s.ticketBodyQR}>
              <div className={s.ticketGrid}>
                <div className={s.ticketField}><span>Placa</span><strong>{t.registro.placa}</strong></div>
                <div className={s.ticketField}><span>Espacio</span><strong>{t.espacio.codigo}</strong></div>
                <div className={s.ticketField}><span>Tipo</span><strong>{t.tipoVehiculo}</strong></div>
                <div className={s.ticketField}><span>Hora entrada</span><strong>{formatFecha(t.registro.horaEntrada)}</strong></div>
                <div className={s.ticketField}><span>Operador</span><strong>{t.operador.nombre}</strong></div>
                {t.qrPayload?.pais && t.qrPayload.pais !== 'CO' && (
                  <div className={s.ticketField}><span>País placa</span><strong>{t.qrPayload.pais}</strong></div>
                )}
              </div>

              {/* QR image */}
              {t.qrDataURL && (
                <div className={s.qrContainer}>
                  <img src={t.qrDataURL} alt="QR ticket" className={s.qrImg} />
                  <p className={s.qrLabel}>Escanear para salida</p>
                </div>
              )}
            </div>

            <p className={s.ticketNote}>Conserve este tiquete para reclamar su vehículo</p>
          </div>

          <div className={s.ticketActions}>
            <button className={s.btnPrint} onClick={() => window.print()}>🖨 Imprimir</button>
            <button className={s.btnNuevo} onClick={handleNuevo}>+ Nueva entrada</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulario ────────────────────────────────────────────────────────────
  return (
    <div className={s.page}>
      <div className={s.formCard}>
        <div className={s.formHeader}>
          <h1 className={s.formTitle}>↓ Registrar Entrada</h1>
          <p className={s.formSubtitle}>Ingresa los datos del vehículo que entra al parqueadero</p>
        </div>

        {error && <div className={s.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} className={s.form} noValidate>
          {/* PlacaInput inteligente */}
          <div className={s.field}>
            <label className={s.label}>Placa del vehículo</label>
            <PlacaInput
              value={placa}
              onChange={handlePlacaChange}
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Tipo de vehículo */}
          <div className={s.field}>
            <label className={s.label}>Tipo de vehículo</label>
            <div className={s.tiposGrid}>
              {resumen.map(tipo => (
                <label
                  key={tipo.id}
                  className={`${s.tipoOption} ${tipoVId == tipo.id ? s.tipoSelected : ''} ${tipo.disponibles === 0 ? s.tipoAgotado : ''}`}
                >
                  <input
                    type="radio"
                    name="tipoVId"
                    value={tipo.id}
                    checked={tipoVId == tipo.id}
                    onChange={e => { setTipoVId(e.target.value); setTipoError(''); }}
                    disabled={tipo.disponibles === 0}
                    className={s.radioHidden}
                  />
                  <span className={s.tipoNombre}>
                    {tipo.tipo_vehiculo === 'MOTO' ? '🏍' : tipo.tipo_vehiculo === 'CAMIONETA' ? '🚙' : '🚗'} {tipo.tipo_vehiculo}
                  </span>
                  <span className={s.tipoDisponibles} style={{
                    color: tipo.disponibles === 0 ? 'var(--color-danger)'
                         : tipo.disponibles <= 3  ? 'var(--color-warning)'
                         : 'var(--color-success)',
                  }}>
                    {tipo.disponibles === 0 ? 'LLENO' : `${tipo.disponibles} libre${tipo.disponibles !== 1 ? 's' : ''}`}
                  </span>
                </label>
              ))}
            </div>
            {tipoError && <span className={s.fieldError}>{tipoError}</span>}
          </div>

          <button
            type="submit"
            className={s.submitBtn}
            disabled={loading || !placaMeta.valida || !tipoVId}
          >
            {loading ? <span className={s.spinner} /> : '↓ Registrar entrada'}
          </button>
        </form>
      </div>
    </div>
  );
}
