import { useState, useEffect, useRef, useCallback } from 'react';
import { createWorker } from 'tesseract.js';
import { Camera, X, RefreshCcw, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import s from './LectorPlacaModal.module.css';

export function LectorPlacaModal({ onClose, onPlacaDetected }) {
  const videoRef      = useRef(null);
  const canvasRef     = useRef(null);
  const streamRef     = useRef(null);
  const workerRef     = useRef(null);
  const activoRef     = useRef(true);

  // ESTADOS: INICIANDO | ESPERANDO | CAPTURANDO | EXITO | ERROR | ERROR_CAMARA
  const [estado,   setEstado]   = useState('INICIANDO');
  const [errorMsg, setErrorMsg] = useState('');
  const [placaOk,  setPlacaOk]  = useState('');
  const [flash,    setFlash]    = useState(false);

  // ─── Limpieza ─────────────────────────────────────────────────────────────
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

  // ─── Validar placa colombiana ─────────────────────────────────────────────
  // Auto: ABC123 (3 letras + 3 dígitos)
  // Moto: ABC12D (3 letras + 2 dígitos + 1 letra)
  const extraerPlaca = (texto) => {
    const limpio = texto.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const moto = limpio.match(/([A-Z]{3})([0-9]{2})([A-Z])/);
    if (moto) return `${moto[1]}${moto[2]}${moto[3]}`;
    const auto = limpio.match(/([A-Z]{3})([0-9]{3})/);
    if (auto) return `${auto[1]}${auto[2]}`;
    return null;
  };

  // ─── Capturar frame y procesar ────────────────────────────────────────────
  const prepararImagen = (video, canvas) => {
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return null;

    // Recortar la zona del marco guía (72% w, 38% h)
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

    // Binarización (aumentar contraste y escala de grises)
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

  const capturarAhora = async () => {
    if (estado !== 'ESPERANDO' || !workerRef.current) return;
    
    // Flash effect
    setFlash(true);
    setTimeout(() => setFlash(false), 150);

    setEstado('CAPTURANDO');
    
    try {
      const dataUrl = prepararImagen(videoRef.current, canvasRef.current);
      if (!dataUrl) throw new Error("No se pudo capturar la imagen");

      const { data: { text } } = await workerRef.current.recognize(dataUrl);

      if (!activoRef.current) return;

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
  };

  // ─── Iniciar ──────────────────────────────────────────────────────────────
  const iniciarCamara = useCallback(async () => {
    activoRef.current = true;
    try {
      const worker = await createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        tessedit_pageseg_mode: '7',
      });
      workerRef.current = worker;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });

      if (!activoRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setEstado('ESPERANDO');
    } catch (e) {
      if (!activoRef.current) return;
      setEstado('ERROR_CAMARA');
      setErrorMsg('Permiso de cámara denegado o dispositivo sin cámara.');
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
              <span style={{ textAlign: 'center', lineHeight: 1.6, maxWidth: 280 }}>No se reconoció la placa, intenta de nuevo</span>
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
              <span style={{ fontSize: 13, opacity: 0.9 }}>Placa reconocida</span>
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
