// src/pages/EscanerQR.jsx
// Escáner de QR con cámara real (MediaDevices API) + modo simulación.
// Usa jsQR (CDN) para decodificar frames del video.
// Al leer un QR válido del sistema, registra la salida automáticamente.

import { useState, useEffect, useRef, useCallback } from 'react';
import { registrosApi } from '../api/index';
import { useParqueadero } from '../context/ParqueaderoContext';
import { formatFecha, formatMoneda, formatDuracion } from '../utils/format.utils';
import s from './EscanerQR.module.css';

// jsQR se carga dinámicamente desde CDN
let jsQR = null;

async function cargarJsQR() {
  if (jsQR) return jsQR;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
    script.onload  = () => { jsQR = window.jsQR; resolve(window.jsQR); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

const ESTADO = { IDLE: 'IDLE', SCANNING: 'SCANNING', PROCESANDO: 'PROCESANDO', RESULTADO: 'RESULTADO', ERROR: 'ERROR' };

export default function EscanerQR() {
  const { refetch } = useParqueadero();
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const streamRef   = useRef(null);
  const rafRef      = useRef(null);

  const [estado,     setEstado]     = useState(ESTADO.IDLE);
  const [resultado,  setResultado]  = useState(null);
  const [error,      setError]      = useState('');
  const [simInput,   setSimInput]   = useState('');
  const [camError,   setCamError]   = useState('');

  const detener = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setEstado(ESTADO.IDLE);
  }, []);

  useEffect(() => () => detener(), [detener]);

  const procesarQR = useCallback(async (payload) => {
    if (payload.sys !== 'PKG') {
      setError('QR no pertenece a este parqueadero');
      setEstado(ESTADO.ERROR);
      return;
    }
    if (payload.tipo !== 'ENTRADA') {
      setError('Este QR ya es de salida — vehículo no está dentro');
      setEstado(ESTADO.ERROR);
      return;
    }

    setEstado(ESTADO.PROCESANDO);
    try {
      const res = await registrosApi.registrarSalida({ placa: payload.placa });
      setResultado(res);
      setEstado(ESTADO.RESULTADO);
      refetch();
    } catch (e) {
      setError(e.message);
      setEstado(ESTADO.ERROR);
    }
  }, [refetch]);

  const escanearFrame = useCallback(async () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== 4) {
      rafRef.current = requestAnimationFrame(escanearFrame);
      return;
    }
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx  = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const img  = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR?.(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });

    if (code) {
      detener();
      try {
        const payload = JSON.parse(code.data);
        await procesarQR(payload);
      } catch {
        setError('QR con formato no reconocido');
        setEstado(ESTADO.ERROR);
      }
      return;
    }
    rafRef.current = requestAnimationFrame(escanearFrame);
  }, [detener, procesarQR]);

  const iniciarCamara = useCallback(async () => {
    setError('');
    setCamError('');
    try {
      await cargarJsQR();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setEstado(ESTADO.SCANNING);
      rafRef.current = requestAnimationFrame(escanearFrame);
    } catch (e) {
      setCamError(e.name === 'NotAllowedError'
        ? 'Permiso de cámara denegado. Permite el acceso en la configuración del navegador.'
        : `No se pudo acceder a la cámara: ${e.message}`);
    }
  }, [escanearFrame]);

  const simularEscaneo = async () => {
    setError('');
    try {
      const payload = simInput
        ? JSON.parse(simInput)
        : { sys: 'PKG', rid: 1, placa: 'ABC123', tipo: 'ENTRADA', tk: 'TK-DEMO' };
      await procesarQR(payload);
    } catch {
      setError('JSON inválido en el campo de simulación');
      setEstado(ESTADO.ERROR);
    }
  };

  const reiniciar = () => {
    setEstado(ESTADO.IDLE);
    setResultado(null);
    setError('');
  };

  return (
    <div className={s.page}>
      <h1 className={s.title}>📷 Escáner QR — Salida rápida</h1>
      <p className={s.subtitle}>Escanea el código QR del ticket de entrada para registrar la salida automáticamente</p>

      {/* Vista de cámara */}
      <div className={s.cameraCard}>
        <div className={s.viewfinder}>
          <video ref={videoRef} className={s.video} playsInline muted />
          <canvas ref={canvasRef} className={s.canvas} />

          {estado !== ESTADO.SCANNING && (
            <div className={s.overlay}>
              {estado === ESTADO.PROCESANDO && (
                <div className={s.procesando}><div className={s.spinner} />Procesando salida...</div>
              )}
              {estado === ESTADO.IDLE && (
                <div className={s.idleMsg}>Cámara inactiva</div>
              )}
            </div>
          )}

          {/* Esquinas del viewfinder */}
          {estado === ESTADO.SCANNING && (
            <>
              <div className={`${s.corner} ${s.tl}`} />
              <div className={`${s.corner} ${s.tr}`} />
              <div className={`${s.corner} ${s.bl}`} />
              <div className={`${s.corner} ${s.br}`} />
              <div className={s.scanLine} />
            </>
          )}
        </div>

        {camError && <div className={s.camError}>{camError}</div>}

        {estado === ESTADO.IDLE && (
          <button className={s.btnActivar} onClick={iniciarCamara}>📷 Activar cámara</button>
        )}
        {estado === ESTADO.SCANNING && (
          <button className={s.btnDetener} onClick={detener}>⏹ Detener cámara</button>
        )}
      </div>

      {/* Resultado exitoso */}
      {estado === ESTADO.RESULTADO && resultado && (
        <div className={s.resultCard}>
          <div className={s.resultIcon}>✓</div>
          <h2 className={s.resultTitle}>Salida registrada</h2>
          <div className={s.resultGrid}>
            <div className={s.resultField}><span>Placa</span><strong>{resultado.placa}</strong></div>
            <div className={s.resultField}><span>Espacio</span><strong>{resultado.espacio}</strong></div>
            <div className={s.resultField}><span>Duración</span><strong>{formatDuracion(resultado.calculo?.minutosTotales)}</strong></div>
            <div className={s.resultField}><span>Total cobrado</span><strong className={s.total}>{formatMoneda(resultado.calculo?.totalCobrado)}</strong></div>
          </div>
          <button className={s.btnNuevo} onClick={reiniciar}>Escanear otro vehículo</button>
        </div>
      )}

      {/* Error */}
      {estado === ESTADO.ERROR && (
        <div className={s.errorCard}>
          <p className={s.errorText}>⚠ {error}</p>
          <button className={s.btnNuevo} onClick={reiniciar}>Reintentar</button>
        </div>
      )}

      {/* Simulación (dev/demo) */}
      <div className={s.simCard}>
        <p className={s.simTitle}>Simulación de escaneo</p>
        <p className={s.simDesc}>Útil para pruebas sin cámara. Pega el JSON del QR o deja vacío para usar ejemplo.</p>
        <input
          className={s.simInput}
          placeholder='{"sys":"PKG","rid":1,"placa":"ABC123","tipo":"ENTRADA","tk":"TK-DEMO"}'
          value={simInput}
          onChange={e => setSimInput(e.target.value)}
        />
        <button className={s.btnSim} onClick={simularEscaneo} disabled={estado === ESTADO.PROCESANDO}>
          {estado === ESTADO.PROCESANDO ? 'Procesando...' : '▶ Simular QR leído'}
        </button>
      </div>
    </div>
  );
}
