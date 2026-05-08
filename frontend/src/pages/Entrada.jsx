import { useState } from 'react';
import { useRegistros }   from '../hooks/useRegistros';
import { useParqueadero } from '../context/ParqueaderoContext';
import { PlacaInput }     from '../components/shared/PlacaInput';
import { AlertCircle, Printer, Plus, Car, Bike, Truck, ArrowDown, Sparkles, Trophy } from 'lucide-react';
import { TicketRecibo } from '../components/shared/TicketRecibo';
import { fidelizacionApi } from '../api/index';
import s from './Operacion.module.css';

const tipoIcon = (t) =>
  t === 'MOTO' ? <Bike size={16}/> : t === 'CAMIONETA' ? <Truck size={16}/> : <Car size={16}/>;

export default function Entrada() {
  const { registrarEntrada, loading, error, clearError } = useRegistros();
  const { refetch, resumen }                             = useParqueadero();

  const [placa,     setPlaca]     = useState('');
  const [placaMeta, setPlacaMeta] = useState({ valida: false, pais: 'CO', tipoIdx: 0 });
  const [tipoVId,   setTipoVId]   = useState('');
  const [tipoError, setTipoError] = useState('');
  const [ticket,    setTicket]    = useState(null);
  const [tarjeta,   setTarjeta]   = useState(null);

  const cuposDisponibles = (id) =>
    resumen.find(t => t.id === Number(id))?.disponibles ?? 0;

  const handlePlacaChange = (val, meta) => {
    setPlaca(val);
    setPlacaMeta(meta);
    clearError();

    if (meta.pais === 'CO') {
      const esMotoPlaca = meta.tipoIdx === 1 || meta.tipoIdx === 2;
      const esAutoPlaca = meta.tipoIdx === 0;

      if (esMotoPlaca) {
        const motoTipo = resumen.find(t => t.tipo_vehiculo === 'MOTO');
        if (motoTipo && tipoVId != motoTipo.id) {
          setTipoVId(motoTipo.id);
          setTipoError('');
        }
      } else if (esAutoPlaca) {
        const isMotoSelected = resumen.find(t => t.id == tipoVId)?.tipo_vehiculo === 'MOTO';
        if (isMotoSelected) {
          setTipoVId('');
        }
      }

      if (meta.valida) {
        fidelizacionApi.getTarjeta(val)
          .then(t => setTarjeta(t))
          .catch(() => setTarjeta(null));
      } else {
        setTarjeta(null);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!placaMeta.valida) return;
    if (!tipoVId) { setTipoError('Selecciona el tipo de vehículo'); return; }
    if (cuposDisponibles(tipoVId) === 0) { setTipoError('No hay cupos disponibles para este tipo'); return; }
    setTipoError('');
    try {
      const result = await registrarEntrada({ placa, tipoVehiculoId: Number(tipoVId) });
      setTicket(result);
      setPlaca('');
      setTipoVId('');
      refetch();
    } catch { /* error capturado en hook */ }
  };

  const handleNuevo = () => { setTicket(null); clearError(); };

  if (ticket) {
    return (
      <div className={s.page}>
        <TicketRecibo
          ticketData={ticket.ticket}
          tipo="ENTRADA"
          onAction={handleNuevo}
          actionLabel="Nueva entrada"
          actionIcon={<Plus size={16} />}
        />
      </div>
    );
  }

  const esMotoPlaca = placaMeta.pais === 'CO' && (placaMeta.tipoIdx === 1 || placaMeta.tipoIdx === 2);
  const esAutoPlaca = placaMeta.pais === 'CO' && placaMeta.tipoIdx === 0;

  return (
    <div className={s.page}>
      <div className={s.formCard}>
        <div className={s.formHeader}>
          <h1 className={s.formTitle}><ArrowDown size={24} /> Registrar Entrada</h1>
          <p className={s.formSubtitle}>Ingresa los datos del vehículo que entra al parqueadero</p>
        </div>

        {error && <div className={s.errorBox}><AlertCircle size={16}/> {error}</div>}

        <div className={s.formBody}>
          <form onSubmit={handleSubmit} className={s.formWrapper} noValidate>
            
            <div className={s.field}>
              <label className={s.label}>Placa del vehículo</label>
              <div className="input-override">
                <PlacaInput
                  value={placa}
                  onChange={handlePlacaChange}
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>

            {tarjeta && (
              <div className={s.welcomeBox} style={{
                background: 'rgba(62, 207, 142, 0.1)', 
                border: '1px solid var(--brand-border)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: 'var(--brand-green)',
                margin: '0 0 20px 0',
                animation: 'slideDown 0.3s ease'
              }}>
                <Sparkles size={18} />
                <div style={{flex:1}}>
                  <div style={{fontWeight:600}}>¡Bienvenido de nuevo!</div>
                  <div style={{fontSize:12, opacity:0.8}}>Cliente {tarjeta.nivel} con {tarjeta.puntos_acumulados} puntos.</div>
                </div>
                <Trophy size={20} />
              </div>
            )}

            <div className={s.field}>
              <label className={s.label}>Tipo de vehículo</label>
              <div className={s.tiposGrid}>
                {resumen.map(tipo => {
                  const seleccionado = String(tipoVId) === String(tipo.id);
                  const esTipoMoto   = tipo.tipo_vehiculo === 'MOTO';
                  
                  let bloqueadoPorPlaca = false;
                  if (esMotoPlaca && !esTipoMoto) bloqueadoPorPlaca = true;
                  if (esAutoPlaca && esTipoMoto)  bloqueadoPorPlaca = true;

                  const bloqueado    = (tipoVId && !seleccionado) || bloqueadoPorPlaca;
                  const agotado      = tipo.disponibles === 0;

                  return (
                    <label
                      key={tipo.id}
                      className={`${s.tipoOption} ${seleccionado ? s.tipoSelected : ''} ${agotado || bloqueado ? s.tipoAgotado : ''}`}
                      style={{ opacity: bloqueado ? 0.4 : 1, cursor: bloqueado || agotado ? 'not-allowed' : 'pointer' }}
                    >
                      <input
                        type="radio"
                        name="tipoVId"
                        value={tipo.id}
                        checked={seleccionado}
                        onChange={e => { setTipoVId(e.target.value); setTipoError(''); }}
                        disabled={agotado || bloqueado}
                        className={s.radioHidden}
                      />
                      <span className={s.tipoNombre}>{tipoIcon(tipo.tipo_vehiculo)} {tipo.tipo_vehiculo}</span>
                      <span className={s.tipoDisponibles} style={{
                        color: agotado ? 'var(--color-crimson4)'
                             : tipo.disponibles <= 3 ? 'var(--color-yellowA7)'
                             : 'var(--brand-green)',
                      }}>
                        {agotado ? 'LLENO' : `${tipo.disponibles} libre${tipo.disponibles !== 1 ? 's' : ''}`}
                      </span>
                    </label>
                  );
                })}
              </div>
              
              {tipoVId && (
                <button type="button" className={s.clearBtn} onClick={() => { 
                  if (esMotoPlaca && resumen.find(t => t.id == tipoVId)?.tipo_vehiculo === 'MOTO') return;
                  setTipoVId(''); 
                  setTipoError(''); 
                }}
                  disabled={esMotoPlaca && resumen.find(t => t.id == tipoVId)?.tipo_vehiculo === 'MOTO'}
                >
                  ✕ Cambiar tipo
                </button>
              )}
              {tipoError && <span className={s.fieldError}><AlertCircle size={12} /> {tipoError}</span>}
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !placaMeta.valida || !tipoVId}
            >
              {loading ? <span className={s.spinner} /> : <><ArrowDown size={16}/> Registrar entrada</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
