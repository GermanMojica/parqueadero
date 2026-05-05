import { CheckCircle, Printer, ArrowDown, ArrowUp, Plus, ScanLine } from 'lucide-react';
import { formatFecha, formatDuracion, formatMoneda } from '../../utils/format.utils';
import s from './TicketRecibo.module.css';

/**
 * Componente unificado para dibujar tickets
 * Props:
 *   ticketData: El objeto "ticket" que retorna el backend en datosJson.
 *   tipo: 'ENTRADA' o 'SALIDA'
 *   onAction: Función al clickear el botón principal secundario (ej. "Nueva Salida")
 *   actionLabel: Etiqueta de ese botón
 *   actionIcon: Icono opcional para el botón
 */
export function TicketRecibo({ ticketData, tipo = 'ENTRADA', onAction, actionLabel, actionIcon }) {
  if (!ticketData) return null;

  const isSalida = tipo === 'SALIDA';
  const r = ticketData.registro;
  const c = ticketData.cobro;

  const handlePrint = () => window.print();

  return (
    <div className={s.ticketWrapper}>
      {isSalida ? (
        <div className={s.ticketSuccessIcon}><CheckCircle size={32} /></div>
      ) : (
        <div className={s.ticketSuccessIcon} style={{color: 'var(--brand-link)'}}><CheckCircle size={32} /></div>
      )}
      <h2 className={s.ticketTitle}>{isSalida ? 'Salida registrada' : 'Entrada registrada'}</h2>

      <div className={s.ticket}>
        {/* Cabecera del ticket */}
        <div className={s.ticketHeader}>
          <div className={s.ticketLogo}>
            {isSalida ? <ArrowUp size={24} /> : <ArrowDown size={24} />}
          </div>
          <div>
            <p className={s.ticketCodigo}>{ticketData.codigoTicket}</p>
            <p className={s.ticketTipo}>Ticket de {isSalida ? 'Salida' : 'Entrada'}</p>
          </div>
          {isSalida && c && (
            <div className={s.ticketPagoBadge}>
              <span>PAGADO</span>
            </div>
          )}
        </div>

        {/* Cuerpo del ticket (Info) */}
        <div className={s.ticketBody}>
          <div className={s.ticketGrid}>
            <div className={s.ticketField}><span>Placa</span><strong>{r?.placa}</strong></div>
            <div className={s.ticketField}><span>Espacio</span><strong>{ticketData.espacio?.codigo}</strong></div>
            <div className={s.ticketField}><span>Tipo</span><strong>{ticketData.tipoVehiculo}</strong></div>
            <div className={s.ticketField}><span>Operador</span><strong>{ticketData.operador?.nombre}</strong></div>
            
            <div className={s.ticketField} style={{ gridColumn: '1 / -1' }}>
              <span>Entrada</span><strong>{formatFecha(r?.horaEntrada)}</strong>
            </div>
            
            {isSalida && (
              <>
                <div className={s.ticketField} style={{ gridColumn: '1 / -1' }}>
                  <span>Salida</span><strong>{formatFecha(r?.horaSalida)}</strong>
                </div>
                <div className={s.ticketField}><span>Duración</span><strong>{formatDuracion(c?.minutosTotales)}</strong></div>
                <div className={s.ticketField}><span>Tarifa/h</span><strong>{formatMoneda(c?.tarifaHoraAplicada)}</strong></div>
              </>
            )}
          </div>

          {/* QR Code - Gigante */}
          {ticketData.qrDataURL && (
            <div className={s.qrContainer}>
              <img src={ticketData.qrDataURL} alt="QR del ticket" className={s.qrImg} />
              <p className={s.qrLabel}>
                {isSalida ? 'Comprobante digital' : 'Escanea al salir'}
              </p>
            </div>
          )}
        </div>

        {/* Totales (solo salida) */}
        {isSalida && c && (
          <div className={s.totalCobro}>
            <span>Total cobrado</span>
            <div className={s.totalCobroPagoBadge}>
              <strong>{formatMoneda(c.totalCobrado)}</strong>
            </div>
          </div>
        )}

        {/* Pie del ticket */}
        <p className={s.ticketNote}>
          Gracias por usar nuestro parqueadero<br/>
          {new Date(ticketData.generadoAt || Date.now()).toLocaleDateString('es-CO')}
        </p>
      </div>

      {/* Botones de acción (no se imprimen) */}
      <div className={s.ticketActions}>
        <button className={s.btnPrint} onClick={handlePrint}>
          <Printer size={16}/> Imprimir
        </button>
        {onAction && (
          <button className="btn-primary" onClick={onAction} style={{flex:2}}>
            {actionIcon} {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
