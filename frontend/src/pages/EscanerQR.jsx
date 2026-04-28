// EscanerQR.jsx — Diseño moderno, centrado, cámara real con jsQR
import { useState, useEffect, useRef, useCallback } from 'react';
import { registrosApi }   from '../api/index';
import { useParqueadero } from '../context/ParqueaderoContext';
import { formatDuracion, formatMoneda, formatFecha } from '../utils/format.utils';
import s from './EscanerQR.module.css';

// Carga jsQR desde CDN dinámicamente
let jsQR = null;
async function cargarJsQR() {
  if (jsQR) return jsQR;
  return new Promise((resolve, reject) => {
    if (window.jsQR) { jsQR = window.jsQR; return resolve(jsQR); }
    const sc = document.createElement('script');
    sc.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
    sc.onload  = () => { jsQR = window.jsQR; resolve(jsQR); };
    sc.onerror = () => reject(new Error('No se pudo cargar jsQR'));
    document.head.appendChild(sc);
  });
}

const ST = { IDLE: 'IDLE', LOADING: 'LOADING', SCANNING: 'SCANNING', PROCESANDO: 'PROCESANDO', OK: 'OK', ERROR: 'ERROR' };

export default function EscanerQR() {
  const { refetch }  = useParqueadero();
  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);
  const streamRef    = useRef(null);
  const rafRef       = useRef(null);
  const lastQR       = useRef('');

  const [estado,    setEstado]    = useState(ST.IDLE);
  const [resultado, setResultado] = useState(null);
  const [error,     setError]     = useState('');
  const [camErr,    setCamErr]    = useState('');
  const [simVal,    setSimVal]    = useState('');
  const [qrDetected, setQrDetected] = useState(false);

  // Limpiar al desmontar
  useEffect(() => () => detener(), []);

  const detener = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setQrDetected(false);
  }, []);

  const procesarPayload = useCallback(async (raw) => {
    // Evitar procesar el mismo QR dos veces
    if (raw === lastQR.current) return;
    lastQR.current = raw;
    detener();
    setQrDetected(true);

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
      setError('Este QR ya corresponde a una salida — el vehículo no está registrado como activo');
      setEstado(ST.ERROR);
      return;
    }

    setEstado(ST.PROCESANDO);
    try {
      const res = await registrosApi.registrarSalida({ placa: payload.placa });
      setResultado(res);
      setEstado(ST.OK);
      refetch();
    } catch (e) {
      setError(e.message);
      setEstado(ST.ERROR);
    }
  }, [detener, refetch]);

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
    const code = jsQR?.(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
    if (code?.data) {
      await procesarPayload(code.data);
      return;
    }
    rafRef.current = requestAnimationFrame(escanearFrame);
  }, [procesarPayload]);

  const iniciarCamara = useCallback(async () => {
    setError(''); setCamErr(''); lastQR.current = '';
    setEstado(ST.LOADING);
    try {
      await cargarJsQR();
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

  const reiniciar = () => {
    setEstado(ST.IDLE); setResultado(null);
    setError(''); setCamErr(''); lastQR.current = '';
  };

  const simular = async () => {
    const raw = simVal.trim() || JSON.stringify({ sys:'PKG', rid:1, placa:'ABC123', tipo:'ENTRADA', tk:'TK-DEMO' });
    await procesarPayload(raw);
  };

  return (
    <div className={s.page}>
      <div className={s.container}>

        {/* ── Header ── */}
        <div className={s.pageHeader}>
          <div className={s.headerIcon}>▦</div>
          <div>
            <h1 className={s.title}>Escáner QR</h1>
            <p className={s.subtitle}>Escanea el ticket de entrada para registrar la salida automáticamente</p>
          </div>
        </div>

        {/* ── Visor de cámara ── */}
        <div className={s.scanCard}>
          <div className={s.viewfinder}>
            <video ref={videoRef} className={s.video} playsInline muted />
            <canvas ref={canvasRef} className={s.canvas} />

            {/* Overlay según estado */}
            {estado !== ST.SCANNING && (
              <div className={s.overlay}>
                {estado === ST.IDLE && (
                  <div className={s.idleContent}>
                    <div className={s.idleIcon}>📷</div>
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
                    <div className={s.procesandoAnim}>✓</div>
                    <p className={s.idleText} style={{ color: '#22c55e' }}>QR detectado</p>
                    <p className={s.idleHint}>Procesando salida...</p>
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
              <span>⚠</span> {camErr}
            </div>
          )}

          {/* Botones de control */}
          <div className={s.controls}>
            {estado === ST.IDLE || estado === ST.LOADING ? (
              <button className={s.btnActivar} onClick={iniciarCamara} disabled={estado === ST.LOADING}>
                <span>📷</span> Activar cámara
              </button>
            ) : estado === ST.SCANNING ? (
              <button className={s.btnDetener} onClick={pararCamara}>
                <span>⏹</span> Detener cámara
              </button>
            ) : null}
          </div>
        </div>

        {/* ── Resultado OK ── */}
        {estado === ST.OK && resultado && (
          <div className={s.resultCard}>
            <div className={s.resultHeader}>
              <div className={s.resultIcon}>✓</div>
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

            <button className={s.btnNuevo} onClick={reiniciar}>
              ↻ Escanear otro vehículo
            </button>
          </div>
        )}

        {/* ── Error ── */}
        {estado === ST.ERROR && (
          <div className={s.errorCard}>
            <div className={s.errorIcon}>✕</div>
            <p className={s.errorTitle}>No se pudo procesar</p>
            <p className={s.errorMsg}>{error}</p>
            <button className={s.btnNuevo} onClick={reiniciar}>← Reintentar</button>
          </div>
        )}

        {/* ── Simulación ── */}
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
            {estado === ST.PROCESANDO ? 'Procesando...' : '▶ Simular lectura de QR'}
          </button>
        </div>

      </div>
    </div>
  );
}
