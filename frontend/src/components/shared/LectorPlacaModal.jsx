import { useState, useEffect, useRef, useCallback } from 'react';
import { createWorker } from 'tesseract.js';
import { Camera, X, RefreshCcw, Loader2, CheckCircle } from 'lucide-react';
import s from './LectorPlacaModal.module.css';

/**
 * Modal para escanear placas usando la cámara + OCR (Tesseract.js v7).
 * - Usa refs para evitar closures stale
 * - Worker reutilizable (no se crea uno nuevo por cada captura)
 * - Intervalo controlado de 2.5s (Tesseract es pesado)
 * - Pre-procesa la imagen: recorte central + binarización
 */
export function LectorPlacaModal({ onClose, onPlacaDetected }) {
  const videoRef      = useRef(null);
  const canvasRef     = useRef(null);
  const streamRef     = useRef(null);
  const intervalRef   = useRef(null);
  const workerRef     = useRef(null);   // worker Tesseract reutilizable
  const procesandoRef = useRef(false);  // mutex: evita llamadas OCR simultáneas
  const activoRef     = useRef(true);   // false cuando se desmonta

  const [estado,   setEstado]   = useState('LOADING'); // LOADING | SCANNING | PROCESANDO | ERROR | ENCONTRADO
  const [errorMsg, setErrorMsg] = useState('');
  const [intentos, setIntentos] = useState(0);
  const [placaOk,  setPlacaOk]  = useState('');

  // ─── Limpieza completa ────────────────────────────────────────────────────
  const detener = useCallback(async () => {
    activoRef.current = false;
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    procesandoRef.current = false;
    if (workerRef.current) {
      await workerRef.current.terminate().catch(() => {});
      workerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => { detener(); };
  }, [detener]);

  // ─── Patrones de placas colombianas ──────────────────────────────────────
  // Auto:  ABC123  (3 letras + 3 dígitos)
  // Moto:  AB12C   (2 letras + 2 dígitos + 1 letra)
  const extraerPlaca = (texto) => {
    // Limpiar: solo A-Z y 0-9
    const limpio = texto.toUpperCase().replace(/[^A-Z0-9]/g, '');
    // Auto: exactamente 3 letras seguidas de 3 dígitos
    const auto = limpio.match(/([A-Z]{3})([0-9]{3})/);
    if (auto) return `${auto[1]}${auto[2]}`;
    // Moto: 2 letras + 2 dígitos + 1 letra/número
    const moto = limpio.match(/([A-Z]{2})([0-9]{2})([A-Z0-9])/);
    if (moto) return `${moto[1]}${moto[2]}${moto[3]}`;
    return null;
  };

  // ─── Pre-procesamiento de imagen ──────────────────────────────────────────
  // Recorta la zona central (el recuadro guía) y binariza para mejorar OCR
  const prepararImagen = (video, canvas) => {
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return null;

    // Mismas proporciones que el recuadro visual (72% ancho, 38% alto, centrado)
    const regionW = Math.round(w * 0.72);
    const regionH = Math.round(h * 0.38);
    const regionX = Math.round((w - regionW) / 2);
    const regionY = Math.round((h - regionH) / 2);

    // Escalar x2 para darle más resolución al OCR
    canvas.width  = regionW * 2;
    canvas.height = regionH * 2;
    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, regionX, regionY, regionW, regionH, 0, 0, canvas.width, canvas.height);

    // Binarización (escala de grises + umbral adaptativo simple)
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const bin  = gray > 120 ? 255 : 0;
      d[i] = d[i + 1] = d[i + 2] = bin;
    }
    ctx.putImageData(imgData, 0, 0);

    return canvas.toDataURL('image/png');
  };

  // ─── Un ciclo de análisis OCR ─────────────────────────────────────────────
  const analizarUnaVez = useCallback(async () => {
    if (procesandoRef.current || !activoRef.current) return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 4) return;
    if (!workerRef.current) return;

    procesandoRef.current = true;
    if (activoRef.current) setEstado('PROCESANDO');

    try {
      const dataUrl = prepararImagen(video, canvas);
      if (!dataUrl) { procesandoRef.current = false; setEstado('SCANNING'); return; }

      const { data: { text } } = await workerRef.current.recognize(dataUrl);
      console.log('[OCR raw]', JSON.stringify(text));

      if (!activoRef.current) return;

      const placa = extraerPlaca(text);
      if (placa) {
        detener();
        setPlacaOk(placa);
        setEstado('ENCONTRADO');
        // Pequeña pausa para mostrar confirmación visual
        setTimeout(() => { onPlacaDetected(placa); }, 1000);
      } else {
        setIntentos(n => n + 1);
        setEstado('SCANNING');
      }
    } catch (err) {
      console.error('[OCR error]', err);
      if (activoRef.current) setEstado('SCANNING');
    } finally {
      procesandoRef.current = false;
    }
  }, [detener, onPlacaDetected]);

  // ─── Iniciar cámara + worker ──────────────────────────────────────────────
  const iniciarCamara = useCallback(async () => {
    // Limpiar estado previo
    activoRef.current = true;
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    procesandoRef.current = false;
    if (workerRef.current) {
      await workerRef.current.terminate().catch(() => {});
      workerRef.current = null;
    }

    setErrorMsg('');
    setIntentos(0);
    setPlacaOk('');
    setEstado('LOADING');

    try {
      // Inicializar Tesseract worker
      const worker = await createWorker('eng', 1, {
        // logger: m => console.log('[Tesseract]', m),
      });
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        tessedit_pageseg_mode: '8', // tratar como palabra única
      });
      workerRef.current = worker;

      // Acceder a la cámara
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width:  { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (!activoRef.current) { stream.getTracks().forEach(t => t.stop()); return; }

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setEstado('SCANNING');

      // Analizar cada 2.5 s
      intervalRef.current = setInterval(analizarUnaVez, 2500);
    } catch (e) {
      if (!activoRef.current) return;
      setEstado('ERROR');
      setErrorMsg(
        e.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Habilítalo en la configuración del navegador.'
          : `Error: ${e.message}`
      );
    }
  }, [analizarUnaVez]);

  useEffect(() => {
    iniciarCamara();
  }, [iniciarCamara]);

  // ─── Captura manual ───────────────────────────────────────────────────────
  const capturarAhora = () => {
    if (estado === 'SCANNING') analizarUnaVez();
  };

  const cerrar = () => { detener(); onClose(); };

  return (
    <div className={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
      <div className={s.modal}>
        {/* Header */}
        <div className={s.header}>
          <div className={s.titleBox}>
            <Camera size={18} />
            <span>Lector de Placas (IA)</span>
          </div>
          <button className={s.closeBtn} onClick={cerrar} title="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* Visor */}
        <div className={s.viewfinder}>
          <video ref={videoRef} className={s.video} playsInline muted autoPlay />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Cargando */}
          {estado === 'LOADING' && (
            <div className={s.overlayState}>
              <Loader2 size={32} className="animate-spin" />
              <span>Iniciando cámara y motor OCR...</span>
            </div>
          )}

          {/* Procesando OCR */}
          {estado === 'PROCESANDO' && (
            <div className={s.overlayState}>
              <Loader2 size={32} className="animate-spin" />
              <span>Analizando imagen...</span>
              {intentos > 0 && (
                <span style={{ fontSize: 11, opacity: 0.65 }}>Intento #{intentos + 1}</span>
              )}
            </div>
          )}

          {/* Error */}
          {estado === 'ERROR' && (
            <div className={s.overlayState} style={{ color: 'var(--color-crimson4)' }}>
              <span style={{ textAlign: 'center', lineHeight: 1.6, maxWidth: 280 }}>{errorMsg}</span>
              <button className={s.retryBtn} onClick={iniciarCamara}>
                <RefreshCcw size={16} /> Reintentar
              </button>
            </div>
          )}

          {/* Placa encontrada */}
          {estado === 'ENCONTRADO' && (
            <div className={s.overlayState} style={{ color: 'var(--brand-green)' }}>
              <CheckCircle size={44} />
              <span style={{
                fontSize: 28,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                letterSpacing: 6,
                textShadow: '0 0 20px rgba(0,255,100,0.4)',
              }}>
                {placaOk}
              </span>
              <span style={{ fontSize: 13, opacity: 0.9 }}>¡Placa detectada!</span>
            </div>
          )}

          {/* Escaneando — encuadre guía */}
          {estado === 'SCANNING' && (
            <>
              <div className={s.scanTarget}>
                <div className={`${s.corner} ${s.tl}`} />
                <div className={`${s.corner} ${s.tr}`} />
                <div className={`${s.corner} ${s.bl}`} />
                <div className={`${s.corner} ${s.br}`} />
                <div className={s.scanLine} />
              </div>
              <p className={s.hint}>
                {intentos === 0
                  ? 'Ubica la placa dentro del recuadro'
                  : `Reintentando… (${intentos} intento${intentos !== 1 ? 's' : ''})`}
              </p>
            </>
          )}
        </div>

        {/* Footer: botón de captura manual */}
        {(estado === 'SCANNING' || estado === 'PROCESANDO') && (
          <div className={s.footer}>
            <button
              className={s.captureBtn}
              onClick={capturarAhora}
              disabled={estado === 'PROCESANDO'}
            >
              {estado === 'PROCESANDO'
                ? <><Loader2 size={16} className="animate-spin" /> Analizando...</>
                : <><Camera size={16} /> Capturar ahora</>}
            </button>
            <p className={s.autoHint}>Analiza automáticamente cada 2.5 s</p>
          </div>
        )}
      </div>
    </div>
  );
}
