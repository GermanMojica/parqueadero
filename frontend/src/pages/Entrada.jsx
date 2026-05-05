import { useState, useEffect } from 'react';
import { useRegistros }   from '../hooks/useRegistros';
import { useParqueadero } from '../context/ParqueaderoContext';
import { PlacaInput }     from '../components/shared/PlacaInput';
import { formatFecha }    from '../utils/format.utils';
import { AlertCircle, CheckCircle, Printer, Plus, Car, Bike, Truck, ArrowDown } from 'lucide-react';
import { TicketRecibo } from '../components/shared/TicketRecibo';
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

  const cuposDisponibles = (id) =>
    resumen.find(t => t.id === Number(id))?.disponibles ?? 0;

  const handlePlacaChange = (val, meta) => {
    setPlaca(val);
    setPlacaMeta(meta);
    clearError();

    // Auto-selección y limpieza basada en el tipo de placa (Colombia)
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
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'var(--space-5)' }} noValidate>

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

            <div className={s.field}>
              <label className={s.label}>Tipo de vehículo</label>
              <div className={s.tiposGrid}>
                {resumen.map(tipo => {
                  const seleccionado = tipoVId == tipo.id;
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
                <button type="button" onClick={() => { 
                  // Solo permitimos limpiar si no está forzado por la placa
                  if (esMotoPlaca && resumen.find(t => t.id == tipoVId)?.tipo_vehiculo === 'MOTO') return;
                  setTipoVId(''); 
                  setTipoError(''); 
                }}
                  style={{ 
                    marginTop:6, fontFamily:'var(--font-mono)', fontSize:10, textTransform:'uppercase', letterSpacing:'1px', 
                    color:'var(--text-muted)', background:'none', border:'none', 
                    cursor: (esMotoPlaca && resumen.find(t => t.id == tipoVId)?.tipo_vehiculo === 'MOTO') ? 'not-allowed' : 'pointer', 
                    padding:0, alignSelf:'flex-start',
                    opacity: (esMotoPlaca && resumen.find(t => t.id == tipoVId)?.tipo_vehiculo === 'MOTO') ? 0.5 : 1
                  }}>
                  ✕ Cambiar tipo
                </button>
              )}
              {tipoError && <span className={s.fieldError}><AlertCircle size={12} style={{display:'inline', verticalAlign:'middle'}}/> {tipoError}</span>}
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
