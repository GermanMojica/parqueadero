import { useState, useEffect, useRef, useCallback } from 'react';
import { createWorker, PSM } from 'tesseract.js';
import { Camera, X, RefreshCcw, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import s from './LectorPlacaModal.module.css';

/**
 * Extraer placa colombiana desde texto OCR.
 * Intenta múltiples estrategias: primero auto (ABC123), luego moto (ABC12D).
 * Es tolerante a errores comunes del OCR (O↔0, I↔1, S↔5, etc.)
 */
function extraerPlaca(textoOCR) {
  if (!textoOCR) return null;

  // Limpiar: solo mayúsculas y dígitos, sin espacios/guiones/puntos
  let limpio = textoOCR.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Corrección de confusiones comunes del OCR
  // En las primeras 3 posiciones esperamos LETRAS → reemplazar dígitos confusos
  // En las posiciones 4-6 depende del formato
  
  // Buscar patrón auto: 3 letras + 3 números (ABC123)
  const autoMatch = limpio.match(/([A-Z]{3})(\d{3})/);
  if (autoMatch) return `${autoMatch[1]}${autoMatch[2]}`;

  // Buscar patrón moto nueva: 3 letras + 2 números + 1 letra (ABC12D)
  const motoMatch = limpio.match(/([A-Z]{3})(\d{2})([A-Z])/);
  if (motoMatch) return `${motoMatch[1]}${motoMatch[2]}${motoMatch[3]}`;

  // --- Estrategia agresiva: tomar los primeros 6 chars y corregir ---
  if (limpio.length >= 6) {
    const candidato = limpio.substring(0, 6);
    
    // Intentar corregir confusiones comunes para formato auto
    const letras = candidato.substring(0, 3)
      .replace(/0/g, 'O')
      .replace(/1/g, 'I')
      .replace(/5/g, 'S')
      .replace(/8/g, 'B');
    const nums = candidato.substring(3, 6)
      .replace(/O/g, '0')
      .replace(/I/g, '1')
      .replace(/S/g, '5')
      .replace(/B/g, '8')
      .replace(/G/g, '6')
      .replace(/D/g, '0')
      .replace(/Z/g, '2');

    if (/^[A-Z]{3}$/.test(letras) && /^\d{3}$/.test(nums)) {
      return `${letras}${nums}`;
    }

    // Intentar formato moto corregido
    const letras2 = candidato.substring(0, 3)
      .replace(/0/g, 'O')
      .replace(/1/g, 'I')
      .replace(/5/g, 'S')
      .replace(/8/g, 'B');
    const nums2 = candidato.substring(3, 5)
      .replace(/O/g, '0')
      .replace(/I/g, '1')
      .replace(/S/g, '5')
      .replace(/B/g, '8');
    const letraFinal = candidato[5]
      ?.replace(/0/g, 'O')
      ?.replace(/1/g, 'I')
      ?.replace(/5/g, 'S')
      ?.replace(/8/g, 'B');

    if (/^[A-Z]{3}$/.test(letras2) && /^\d{2}$/.test(nums2) && /^[A-Z]$/.test(letraFinal)) {
      return `${letras2}${nums2}${letraFinal}`;
    }
  }

  return null;
}

export function LectorPlacaModal({ onClose, onPlacaDetected }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const workerRef = useRef(null);
  const activoRef = useRef(true);

  // ESTADOS: INICIANDO | ESPERANDO | CAPTURANDO | EXITO | ERROR | ERROR_CAMARA
  const [estado,    setEstado]   = useState('INICIANDO');
  const [errorMsg,  setErrorMsg] = useState('');
  const [placaOk,   setPlacaOk]  = useState('');
  const [flash,     setFlash]    = useState(false);
  const [debugText, setDebugText] = useState('');

  // ─── Limpieza ─────────────────────────────────────────────────
  const detener = useCallback(async () => {
    activoRef.current = false;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (workerRef.current) {
      await workerRef.current.terminate().catch(() => {});
      workerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => { detener(); };
  }, [detener]);

  // ─── Preprocesar imagen para OCR ──────────────────────────────
  const prepararImagen = (video, canvas) => {
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return null;

    // Recortar la zona del marco guía (72% ancho × 38% alto, centrado)
    const regionW = Math.round(w * 0.72);
    const regionH = Math.round(h * 0.38);
    const regionX = Math.round((w - regionW) / 2);
    const regionY = Math.round((h - regionH) / 2);

    // Escalar ×2 para mayor resolución al OCR
    canvas.width  = regionW * 2;
    canvas.height = regionH * 2;
    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, regionX, regionY, regionW, regionH, 0, 0, canvas.width, canvas.height);

    // Preprocesamiento: escala de grises + mejora de contraste (NO binarización dura)
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    // Calcular rango dinámico para normalización de contraste
    let minGray = 255, maxGray = 0;
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (gray < minGray) minGray = gray;
      if (gray > maxGray) maxGray = gray;
    }

    const range = maxGray - minGray || 1;

    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      // Normalizar contraste: estirar el histograma a 0..255
      let normalized = ((gray - minGray) / range) * 255;
      // Aplicar curva S suave para mejorar contraste sin binarizar
      normalized = 255 / (1 + Math.exp(-10 * ((normalized / 255) - 0.5)));
      d[i] = d[i + 1] = d[i + 2] = Math.round(normalized);
    }
    ctx.putImageData(imgData, 0, 0);

    return canvas.toDataURL('image/png');
  };

  // ─── Capturar y procesar ──────────────────────────────────────
  const capturarAhora = async () => {
    if (estado !== 'ESPERANDO' || !workerRef.current) return;

    // Flash visual
    setFlash(true);
    setTimeout(() => setFlash(false), 150);

    setEstado('CAPTURANDO');
    setDebugText('');

    try {
      const dataUrl = prepararImagen(videoRef.current, canvasRef.current);
      if (!dataUrl) throw new Error('No se pudo capturar la imagen');

      const { data: { text } } = await workerRef.current.recognize(dataUrl);

      if (!activoRef.current) return;

      console.log('[OCR raw]:', JSON.stringify(text));
      setDebugText(text.trim());

      const placa = extraerPlaca(text);
      if (placa) {
        setPlacaOk(placa);
        setEstado('EXITO');
        setTimeout(() => {
          if (activoRef.current) {
            onPlacaDetected(placa);
            cerrar();
          }
        }, 2000);
      } else {
        setEstado('ERROR');
      }
    } catch (err) {
      console.error('[OCR error]', err);
      if (activoRef.current) setEstado('ERROR');
    }
  };

  const reintentar = () => {
    setEstado('ESPERANDO');
    setDebugText('');
  };

  // ─── Iniciar cámara y worker OCR ──────────────────────────────
  const iniciarCamara = useCallback(async () => {
    activoRef.current = true;
    try {
      const worker = await createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
      });
      workerRef.current = worker;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
      });

      if (!activoRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setEstado('ESPERANDO');
    } catch (e) {
      console.error('[Camera/Worker init error]', e);
      if (!activoRef.current) return;
      setEstado('ERROR_CAMARA');
      setErrorMsg(
        e.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Habilita el acceso en la configuración del navegador.'
          : e.name === 'NotFoundError'
            ? 'No se encontró una cámara en este dispositivo.'
            : `Error al iniciar: ${e.message}`
      );
    }
  }, []);

  useEffect(() => {
    iniciarCamara();
  }, [iniciarCamara]);

  const cerrar = () => { detener(); onClose(); };

  return (
    <div className={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
      <div className={s.modal}>
        {/* Header */}
        <div className={s.header}>
          <div className={s.titleBox}>
            <Camera size={18} />
            <span>Lector de Placas OCR</span>
          </div>
          <button className={s.closeBtn} onClick={cerrar} title="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* Visor */}
        <div className={s.viewfinder}>
          <video ref={videoRef} className={s.video} playsInline muted autoPlay />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {flash && <div className={s.flashOverlay} />}

          {estado === 'INICIANDO' && (
            <div className={s.overlayState}>
              <Loader2 size={32} className="animate-spin" />
              <span>Iniciando cámara y motor OCR...</span>
            </div>
          )}

          {estado === 'ERROR_CAMARA' && (
            <div className={s.overlayState} style={{ color: 'var(--color-crimson4)' }}>
              <AlertCircle size={44} />
              <span style={{ textAlign: 'center', lineHeight: 1.6, maxWidth: 280 }}>{errorMsg}</span>
            </div>
          )}

          {estado === 'CAPTURANDO' && (
            <div className={s.overlayState}>
              <Loader2 size={32} className="animate-spin" />
              <span>Analizando placa...</span>
            </div>
          )}

          {estado === 'ERROR' && (
            <div className={s.overlayState} style={{ color: 'var(--color-crimson4)' }}>
              <span style={{ textAlign: 'center', lineHeight: 1.6, maxWidth: 300 }}>
                No se reconoció la placa, intenta de nuevo
              </span>
              {debugText && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  OCR leyó: "{debugText}"
                </span>
              )}
              <button className={s.retryBtn} onClick={reintentar}>
                <RefreshCcw size={16} /> Reintentar
              </button>
            </div>
          )}

          {estado === 'EXITO' && (
            <div className={s.overlayState} style={{ color: 'var(--brand-green)' }}>
              <CheckCircle size={44} />
              <span style={{
                fontSize: 32,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                letterSpacing: 4,
                textShadow: '0 0 20px rgba(0,255,100,0.4)',
              }}>
                {placaOk}
              </span>
              <span style={{ fontSize: 13, opacity: 0.9 }}>Placa reconocida ✓</span>
            </div>
          )}

          {estado === 'ESPERANDO' && (
            <>
              <div className={s.scanTarget}>
                <div className={`${s.corner} ${s.tl}`} />
                <div className={`${s.corner} ${s.tr}`} />
                <div className={`${s.corner} ${s.bl}`} />
                <div className={`${s.corner} ${s.br}`} />
                <div className={s.scanLine} />
              </div>
              <p className={s.hint}>Acerca la cámara a la placa con buena luz</p>
            </>
          )}
        </div>

        {/* Footer */}
        {estado === 'ESPERANDO' && (
          <div className={s.footer}>
            <button className={s.captureBtn} onClick={capturarAhora}>
              <Camera size={16} /> Capturar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
