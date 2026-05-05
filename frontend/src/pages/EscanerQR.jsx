import { useState, useEffect, useRef, useCallback } from 'react';
import { useRegistros } from '../hooks/useRegistros';
import { useParqueadero } from '../context/ParqueaderoContext';
import { formatDuracion, formatMoneda, formatFecha } from '../utils/format.utils';
import jsQR from 'jsqr';
import { ScanLine, Camera, StopCircle, RefreshCcw, CheckCircle, XCircle, AlertTriangle, Play, Banknote, CreditCard, Smartphone, MoreHorizontal } from 'lucide-react';
import s from './EscanerQR.module.css';

const ST = { IDLE: 'IDLE', LOADING: 'LOADING', SCANNING: 'SCANNING', PROCESANDO: 'PROCESANDO', PREVIEW: 'PREVIEW', OK: 'OK', ERROR: 'ERROR' };

const METODOS_PAGO = [
  { id: 'EFECTIVO',      label: 'Efectivo',      icon: <Banknote size={20}/> },
  { id: 'TARJETA',       label: 'Tarjeta',       icon: <CreditCard size={20}/> },
  { id: 'TRANSFERENCIA', label: 'Transferencia', icon: <Smartphone size={20}/> },
  { id: 'OTRO',          label: 'Otro',          icon: <MoreHorizontal size={20}/> },
];

export default function EscanerQR() {
  const { previewSalida, registrarSalida, loading } = useRegistros();
  const { refetch }  = useParqueadero();
  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);
  const streamRef    = useRef(null);
  const rafRef       = useRef(null);
  const lastQR       = useRef('');

  const [estado,     setEstado]     = useState(ST.IDLE);
  const [resultado,  setResultado]  = useState(null);
  const [preview,    setPreview]    = useState(null);
  const [metodoPago, setMetodoPago] = useState('');
  const [pagoError,  setPagoError]  = useState('');
  const [error,      setError]      = useState('');
  const [camErr,     setCamErr]     = useState('');
  const [simVal,     setSimVal]     = useState('');

  // Limpiar al desmontar
  useEffect(() => () => detener(), []);

  const detener = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const procesarPayload = useCallback(async (raw) => {
    if (raw === lastQR.current) return;
    lastQR.current = raw;
    detener();

    let payload;
    try { payload = JSON.parse(raw); } catch {
      setError('El QR escaneado no tiene un formato válido');
      setEstado(ST.ERROR);
      return;
    }
    if (payload.sys !== 'PKG') {
      setError('Este QR no pertenece a este sistema de parqueadero');
      setEstado(ST.ERROR);
      return;
    }
    if (payload.tipo !== 'ENTRADA') {
      setError('Este QR corresponde a una salida — el vehículo ya fue dado de baja');
      setEstado(ST.ERROR);
      return;
    }

    setEstado(ST.PROCESANDO);
    try {
      const data = await previewSalida(payload.placa);
      setPreview(data);
      setMetodoPago('');
      setPagoError('');
      setEstado(ST.PREVIEW);
    } catch (e) {
      setError(e.message || 'Error al procesar el QR. Verifica que el vehículo tenga registro activo.');
      setEstado(ST.ERROR);
    }
  }, [detener, previewSalida]);

  const escanearFrame = useCallback(async () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== 4) {
      rafRef.current = requestAnimationFrame(escanearFrame);
      return;
    }
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const img  = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
    if (code?.data) {
      await procesarPayload(code.data);
      return;
    }
    rafRef.current = requestAnimationFrame(escanearFrame);
  }, [procesarPayload]);

  const iniciarCamara = useCallback(async () => {
    setError(''); setCamErr(''); lastQR.current = '';
    setResultado(null);
    setPreview(null);
    setEstado(ST.LOADING);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
      });
      streamRef.current  = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setEstado(ST.SCANNING);
      rafRef.current = requestAnimationFrame(escanearFrame);
    } catch (e) {
      setEstado(ST.IDLE);
      setCamErr(
        e.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Habilítalo en la configuración del navegador.'
          : e.name === 'NotFoundError'
          ? 'No se encontró ninguna cámara en este dispositivo.'
          : `Error al acceder a la cámara: ${e.message}`
      );
    }
  }, [escanearFrame]);

  const pararCamara = () => { detener(); setEstado(ST.IDLE); };

  const reiniciar = useCallback(() => {
    detener();
    setEstado(ST.IDLE);
    setResultado(null);
    setPreview(null);
    setError('');
    setCamErr('');
    lastQR.current = '';
  }, [detener]);

  const simular = async () => {
    if (estado === ST.PROCESANDO) return;
    lastQR.current = '';
    const raw = simVal.trim() || JSON.stringify({ sys:'PKG', rid:1, placa:'ABC123', tipo:'ENTRADA', tk:'TK-DEMO' });
    await procesarPayload(raw);
  };

  const confirmarSalida = async () => {
    if (!metodoPago) { setPagoError('Selecciona el método de pago'); return; }
    setPagoError('');
    try {
      const res = await registrarSalida({ placa: preview.registro.placa, metodoPago });
      setResultado(res);
      setEstado(ST.OK);
      refetch();
    } catch (e) {
      setError(e.message || 'Error al registrar la salida.');
      setEstado(ST.ERROR);
    }
  };

  const estadoFinal = estado === ST.OK || estado === ST.ERROR || estado === ST.PREVIEW;

  return (
    <div className={s.page}>
      <div className={s.container}>

        {/* ── Header ── */}
        <div className={s.pageHeader}>
          <div className={s.headerIcon}><ScanLine size={32} /></div>
          <div>
            <h1 className={s.title}>Escáner QR</h1>
            <p className={s.subtitle}>Escanea el ticket de entrada para registrar la salida automáticamente</p>
          </div>
        </div>

        {/* ── Visor de cámara ── */}
        {estado !== ST.PREVIEW && estado !== ST.OK && (
        <div className={s.scanCard}>
          <div className={s.viewfinder}>
            <video ref={videoRef} className={s.video} playsInline muted />
            <canvas ref={canvasRef} className={s.canvas} />

            {/* Overlay según estado */}
            {estado !== ST.SCANNING && (
              <div className={s.overlay}>
                {estado === ST.IDLE && (
                  <div className={s.idleContent}>
                    <Camera size={48} color="rgba(255,255,255,0.8)" />
                    <p className={s.idleText}>Cámara inactiva</p>
                    <p className={s.idleHint}>Presiona el botón para activar</p>
                  </div>
                )}
                {estado === ST.LOADING && (
                  <div className={s.idleContent}>
                    <div className={s.loadingSpinner} />
                    <p className={s.idleText}>Iniciando cámara...</p>
                  </div>
                )}
                {estado === ST.PROCESANDO && (
                  <div className={s.idleContent}>
                    <CheckCircle size={48} className={s.procesandoAnim} />
                    <p className={s.idleText} style={{ color: 'var(--brand-green)' }}>QR detectado</p>
                    <p className={s.idleHint}>Calculando salida...</p>
                  </div>
                )}
                {estado === ST.ERROR && (
                  <div className={s.idleContent}>
                    <XCircle size={48} color="var(--color-crimson4)" />
                    <p className={s.idleText} style={{ color: 'var(--color-crimson4)', fontSize: 14 }}>{error}</p>
                  </div>
                )}
              </div>
            )}

            {/* Marco de escaneo animado */}
            {estado === ST.SCANNING && (
              <>
                <div className={`${s.corner} ${s.tl}`} />
                <div className={`${s.corner} ${s.tr}`} />
                <div className={`${s.corner} ${s.bl}`} />
                <div className={`${s.corner} ${s.br}`} />
                <div className={s.scanLine} />
                <div className={s.scanHint}>Apunta al código QR del ticket</div>
              </>
            )}
          </div>

          {/* Error de cámara */}
          {camErr && (
            <div className={s.camErrorBox}>
              <AlertTriangle size={16} /> {camErr}
            </div>
          )}

          {/* Botones de control */}
          <div className={s.controls}>
            {(estado === ST.IDLE || estado === ST.LOADING) && (
              <button className={s.btnActivar} onClick={iniciarCamara} disabled={estado === ST.LOADING}>
                <Camera size={16} /> {estado === ST.LOADING ? 'Iniciando...' : 'Activar cámara'}
              </button>
            )}
            {estado === ST.SCANNING && (
              <button className={s.btnDetener} onClick={pararCamara}>
                <StopCircle size={16} /> Detener cámara
              </button>
            )}
            {estadoFinal && (
              <button className={s.btnActivar} onClick={reiniciar}>
                <RefreshCcw size={16} /> Nuevo escaneo
              </button>
            )}
          </div>
        </div>
        )}

        {/* ── Previsualización ── */}
        {estado === ST.PREVIEW && preview && (
          <div className={s.resultCard}>
            <div className={s.resultHeader}>
              <div className={s.resultIcon}><CheckCircle size={32} /></div>
              <div>
                <h2 className={s.resultTitle}>QR Validado - Confirme salida</h2>
                <p className={s.resultSub}>Seleccione el método de pago</p>
              </div>
            </div>

            <div className={s.resultGrid}>
              <div className={s.resultField}>
                <span>Placa</span>
                <strong>{preview.registro.placa}</strong>
              </div>
              <div className={s.resultField}>
                <span>Espacio</span>
                <strong>{preview.registro.espacio}</strong>
              </div>
              <div className={s.resultField}>
                <span>Hora entrada</span>
                <strong>{formatFecha(preview.registro.horaEntrada)}</strong>
              </div>
              <div className={s.resultField}>
                <span>Tiempo aprox.</span>
                <strong>{formatDuracion(preview.calculo?.minutosTotales)}</strong>
              </div>
            </div>

            <div className={s.resultTotal}>
              <span>Cobro estimado</span>
              <strong>{formatMoneda(preview.calculo?.totalEstimado)}</strong>
            </div>

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
              {pagoError && <p className={s.pagoError}><AlertTriangle size={12} style={{display:'inline', verticalAlign:'middle'}}/> {pagoError}</p>}
            </div>

            <div className={s.actionBtns}>
              <button className={s.btnCancelar} onClick={reiniciar} disabled={loading}>
                Cancelar
              </button>
              <button className={s.btnConfirmar} onClick={confirmarSalida} disabled={loading}>
                {loading ? 'Procesando...' : 'Confirmar y Cobrar'}
              </button>
            </div>
          </div>
        )}

        {/* ── Resultado OK ── */}
        {estado === ST.OK && resultado && (
          <div className={s.resultCard}>
            <div className={s.resultHeader}>
              <div className={s.resultIcon}><CheckCircle size={32} /></div>
              <div>
                <h2 className={s.resultTitle}>Salida registrada correctamente</h2>
                <p className={s.resultSub}>El vehículo ha sido dado de baja del sistema</p>
              </div>
            </div>

            <div className={s.resultGrid}>
              <div className={s.resultField}>
                <span>Placa</span>
                <strong>{resultado.placa}</strong>
              </div>
              <div className={s.resultField}>
                <span>Espacio</span>
                <strong>{resultado.espacio}</strong>
              </div>
              <div className={s.resultField}>
                <span>Tiempo dentro</span>
                <strong>{formatDuracion(resultado.calculo?.minutosTotales)}</strong>
              </div>
              <div className={s.resultField}>
                <span>Hora salida</span>
                <strong>{formatFecha(resultado.calculo?.horaSalida)}</strong>
              </div>
            </div>

            <div className={s.resultTotal}>
              <span>Total cobrado</span>
              <strong>{formatMoneda(resultado.calculo?.totalCobrado)}</strong>
            </div>

            <button className={s.btnDetener} onClick={reiniciar} style={{marginTop: 'var(--space-4)', width: '100%'}}>
              <ScanLine size={16}/> Escanear otro QR
            </button>
          </div>
        )}

        {/* ── Simulación ── */}
        {estado !== ST.PREVIEW && estado !== ST.OK && (
        <div className={s.simCard}>
          <div className={s.simHeader}>
            <span className={s.simBadge}>DEV</span>
            <span className={s.simTitle}>Simulación de escaneo</span>
          </div>
          <p className={s.simDesc}>
            Usa esto si no tienes cámara o para pruebas. Deja vacío para usar datos de ejemplo.
          </p>
          <textarea
            className={s.simInput}
            rows={2}
            placeholder='{"sys":"PKG","rid":1,"placa":"ABC123","tipo":"ENTRADA","tk":"TK-DEMO"}'
            value={simVal}
            onChange={e => setSimVal(e.target.value)}
          />
          <button
            className={s.btnSim}
            onClick={simular}
            disabled={estado === ST.PROCESANDO}
          >
            {estado === ST.PROCESANDO ? 'Procesando...' : <span style={{display:'flex', alignItems:'center', justifyContent:'center', gap:8}}><Play size={14}/> Simular lectura de QR</span>}
          </button>
        </div>
        )}

      </div>
    </div>
  );
}
