import { useState, useEffect } from 'react';
import { espaciosApi, registrosApi }  from '../api/index';
import { Car, Bike, Truck, Clock, Calendar, ArrowRightLeft, LayoutGrid, Loader2 } from 'lucide-react';
import { formatFecha }   from '../utils/format.utils';
import s from './TvDisplay.module.css';
import { io }           from 'socket.io-client';

const TIPO_ICONS = {
  'MOTO':      <Bike size={48} />,
  'SEDAN':     <Car size={48} />,
  'CAMIONETA': <Truck size={48} />
};

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function TvDisplay() {
  const [resumen, setResumen] = useState([]);
  const [lastRegistros, setLastRegistros] = useState([]);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Reloj en tiempo real
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadData = async () => {
    try {
      const [res, movs] = await Promise.all([
        espaciosApi.getResumen(),
        registrosApi.getPublicMovimientos()
      ]);
      setResumen(res);
      setLastRegistros(movs.data || []);
      setLoading(false);
    } catch (err) {
      console.error("Error cargando datos TV:", err);
    }
  };

  // Socket setup
  useEffect(() => {
    const socket = io(SOCKET_URL);
    
    socket.on('parqueadero_update', () => {
      console.log('📺 TV: Actualización recibida');
      loadData();
    });

    return () => socket.disconnect();
  }, []);

  // Fetch inicial + Fallback de seguridad cada 30s (por si falla el socket)
  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 30000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading && resumen.length === 0) {
    return (
      <div className={s.tvPage} style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Loader2 className="animate-spin" size={48} color="var(--brand-green)" />
        <p style={{ marginTop: 20, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>INICIALIZANDO MONITOR...</p>
      </div>
    );
  }

  return (
    <div className={s.tvPage}>
      {/* ── Header ─────────────────────────────────── */}
      <header className={s.header}>
        <div className={s.brand}>
          <div className={s.logoContainer}>
            <LayoutGrid className={s.logoIcon} size={32} />
          </div>
          <div>
            <h1 className={s.parqueaderoNombre}>PARKING SYSTEM</h1>
            <p className={s.parqueaderoSub}>MONITOREO DE RECEPCIÓN</p>
          </div>
        </div>

        <div className={s.clockBox}>
          <div className={s.time}>{formatTime(now)}</div>
          <div className={s.date}><Calendar size={14} /> {formatDate(now)}</div>
        </div>
      </header>

      {/* ── Main Grid: Disponibilidad ──────────────── */}
      <main className={s.mainGrid}>
        {resumen.map(tipo => {
          const ocupacionPct = Math.round((tipo.ocupados / tipo.capacidad_total) * 100);
          const isFull = tipo.disponibles === 0;

          return (
            <div key={tipo.id} className={`${s.card} ${isFull ? s.cardFull : ''}`}>
              <div className={s.cardHeader}>
                <span className={s.tipoIcon}>{TIPO_ICONS[tipo.tipo_vehiculo] || <Car size={48} />}</span>
                <h2 className={s.tipoNombre}>{tipo.tipo_vehiculo}</h2>
              </div>

              <div className={s.numbers}>
                <div className={s.disponiblesBox}>
                  <span className={s.dispValue}>{tipo.disponibles}</span>
                  <span className={s.dispLabel}>LIBRES</span>
                </div>
                <div className={s.totalBox}>
                  <span className={s.totalValue}>/ {tipo.capacidad_total}</span>
                  <span className={s.totalLabel}>TOTAL</span>
                </div>
              </div>

              <div className={s.progressContainer}>
                <div 
                  className={s.progressBar} 
                  style={{ 
                    width: `${ocupacionPct}%`,
                    background: isFull ? 'var(--color-crimson4)' : ocupacionPct > 85 ? 'var(--color-yellowA7)' : 'var(--brand-green)'
                  }} 
                />
                <span className={s.pctText}>{ocupacionPct}% OCUPADO</span>
              </div>
            </div>
          );
        })}
      </main>

      {/* ── Footer: Últimos Movimientos ────────────── */}
      <footer className={s.footer}>
        <div className={s.footerTitle}>
          <ArrowRightLeft size={18} /> ÚLTIMOS MOVIMIENTOS
        </div>
        <div className={s.movementsList}>
          {lastRegistros.map((reg, i) => (
            <div key={reg.id} className={s.movementRow} style={{ animationDelay: `${i * 0.1}s` }}>
              <span className={`${s.movTipo} ${reg.fecha_salida ? s.movSalida : s.movEntrada}`}>
                {reg.fecha_salida ? 'SALIDA' : 'ENTRADA'}
              </span>
              <span className={s.movPlaca}>{reg.placa}</span>
              <span className={s.movVehiculo}>{reg.tipo_vehiculo}</span>
              <span className={s.movHora}>
                <Clock size={12} /> {formatFecha(reg.fecha_salida || reg.fecha_entrada, 'HH:mm:ss')}
              </span>
            </div>
          ))}
          {lastRegistros.length === 0 && <p className={s.noMovs}>Esperando movimientos...</p>}
        </div>
      </footer>
    </div>
  );
}
