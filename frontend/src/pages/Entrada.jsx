// src/pages/Entrada.jsx
import { useState, useEffect }  from 'react';
import { useRegistros }         from '../hooks/useRegistros';
import { useParqueadero }       from '../context/ParqueaderoContext';
import { espaciosApi }          from '../api/index';
import { normalizarPlaca, formatFecha } from '../utils/format.utils';
import s from './Operacion.module.css';

const TIPOS_INIT = [];

export default function Entrada() {
  const { registrarEntrada, loading, error, clearError } = useRegistros();
  const { refetch, resumen }                             = useParqueadero();

  const [tipos,   setTipos]   = useState(TIPOS_INIT);
  const [form,    setForm]    = useState({ placa: '', tipoVehiculoId: '' });
  const [errors,  setErrors]  = useState({});
  const [ticket,  setTicket]  = useState(null);   // resultado exitoso

  // Cargar tipos de vehículo desde el resumen de disponibilidad
  useEffect(() => {
    if (resumen.length) setTipos(resumen);
  }, [resumen]);

  const cuposDisponibles = (tipoId) =>
    tipos.find(t => t.id === Number(tipoId))?.disponibles ?? '—';

  const validate = () => {
    const e = {};
    if (!form.placa.trim()) e.placa = 'La placa es requerida';
    else if (!/^[A-Z0-9]{5,8}$/.test(normalizarPlaca(form.placa))) e.placa = 'Formato inválido (ej: ABC123)';
    if (!form.tipoVehiculoId) e.tipoVehiculoId = 'Selecciona el tipo de vehículo';
    else if (cuposDisponibles(form.tipoVehiculoId) === 0) e.tipoVehiculoId = 'No hay cupos disponibles';
    return e;
  };

  const handleChange = (e) => {
    clearError();
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    const val = e.target.name === 'placa'
      ? normalizarPlaca(e.target.value)
      : e.target.value;
    setForm(prev => ({ ...prev, [e.target.name]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    try {
      const result = await registrarEntrada({
        placa:          form.placa,
        tipoVehiculoId: Number(form.tipoVehiculoId),
      });
      setTicket(result);
      setForm({ placa: '', tipoVehiculoId: '' });
      refetch(); // actualiza cupos en sidebar
    } catch { /* error ya en hook */ }
  };

  const handleNuevo = () => { setTicket(null); clearError(); };

  // ── Vista ticket ─────────────────────────────────────────────────────────
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
            <div className={s.ticketGrid}>
              <div className={s.ticketField}><span>Placa</span><strong>{t.registro.placa}</strong></div>
              <div className={s.ticketField}><span>Espacio</span><strong>{t.espacio.codigo}</strong></div>
              <div className={s.ticketField}><span>Tipo</span><strong>{t.tipoVehiculo}</strong></div>
              <div className={s.ticketField}><span>Hora entrada</span><strong>{formatFecha(t.registro.horaEntrada)}</strong></div>
              <div className={s.ticketField}><span>Operador</span><strong>{t.operador.nombre}</strong></div>
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

  // ── Vista formulario ──────────────────────────────────────────────────────
  return (
    <div className={s.page}>
      <div className={s.formCard}>
        <div className={s.formHeader}>
          <h1 className={s.formTitle}>↓ Registrar Entrada</h1>
          <p className={s.formSubtitle}>Ingresa los datos del vehículo que entra al parqueadero</p>
        </div>

        {error && <div className={s.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} className={s.form} noValidate>
          {/* Placa */}
          <div className={s.field}>
            <label className={s.label}>Placa del vehículo</label>
            <input
              name="placa"
              className={`${s.input} ${errors.placa ? s.inputError : ''}`}
              placeholder="ABC123"
              value={form.placa}
              onChange={handleChange}
              maxLength={8}
              style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '1.25rem', fontWeight: 600 }}
              autoFocus
            />
            {errors.placa && <span className={s.fieldError}>{errors.placa}</span>}
          </div>

          {/* Tipo vehículo */}
          <div className={s.field}>
            <label className={s.label}>Tipo de vehículo</label>
            <div className={s.tiposGrid}>
              {tipos.map(tipo => (
                <label
                  key={tipo.id}
                  className={`${s.tipoOption} ${form.tipoVehiculoId == tipo.id ? s.tipoSelected : ''} ${tipo.disponibles === 0 ? s.tipoAgotado : ''}`}
                >
                  <input
                    type="radio"
                    name="tipoVehiculoId"
                    value={tipo.id}
                    checked={form.tipoVehiculoId == tipo.id}
                    onChange={handleChange}
                    disabled={tipo.disponibles === 0}
                    className={s.radioHidden}
                  />
                  <span className={s.tipoNombre}>{tipo.tipo_vehiculo}</span>
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
            {errors.tipoVehiculoId && <span className={s.fieldError}>{errors.tipoVehiculoId}</span>}
          </div>

          <button type="submit" className={s.submitBtn} disabled={loading}>
            {loading ? <span className={s.spinner} /> : '↓ Registrar entrada'}
          </button>
        </form>
      </div>
    </div>
  );
}
