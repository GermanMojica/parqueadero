import { useState, useEffect, useRef, useCallback } from 'react';
import Tesseract from 'tesseract.js';
import { Camera, X, RefreshCcw, Loader2 } from 'lucide-react';
import s from './LectorPlacaModal.module.css';

export function LectorPlacaModal({ onClose, onPlacaDetected }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  
  const [estado, setEstado] = useState('LOADING'); // LOADING | SCANNING | PROCESANDO | ERROR
  const [errorMsg, setErrorMsg] = useState('');

  const detener = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  // Limpiar al desmontar
  useEffect(() => {
    return () => detener();
  }, [detener]);

  // Expresión regular para placas colombianas o genéricas: 3 letras, opcional guión, 3 letras/números
  // Se relaja un poco para permitir capturas sucias
  const validarTextoOCR = (texto) => {
    const limpio = texto.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const match = limpio.match(/[A-Z]{3}[0-9]{2}[A-Z0-9]/);
    return match ? match[0] : null;
  };

  const analizarFrame = useCallback(async () => {
    if (estado !== 'SCANNING') return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || video.readyState !== 4) {
      rafRef.current = requestAnimationFrame(analizarFrame);
      return;
    }

    // Tomar frame y prepararlo
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Mejorar contraste de la imagen para OCR
    ctx.filter = 'contrast(200%) grayscale(100%)';
    ctx.drawImage(canvas, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg');

    setEstado('PROCESANDO');
    try {
      const { data: { text } } = await Tesseract.recognize(
        dataUrl,
        'eng',
        { 
          logger: m => console.log(m),
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- '
        }
      );
      
      const placa = validarTextoOCR(text);
      if (placa) {
        detener();
        onPlacaDetected(placa);
        return;
      } else {
        // No se encontró placa, seguimos escaneando
        setEstado('SCANNING');
        rafRef.current = requestAnimationFrame(analizarFrame);
      }
    } catch (err) {
      console.error("Error OCR:", err);
      // Seguimos intentando a pesar de error esporádico
      setEstado('SCANNING');
      rafRef.current = requestAnimationFrame(analizarFrame);
    }
  }, [estado, detener, onPlacaDetected]);

  const iniciarCamara = useCallback(async () => {
    setErrorMsg('');
    setEstado('LOADING');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setEstado('SCANNING');
      rafRef.current = requestAnimationFrame(analizarFrame);
    } catch (e) {
      setEstado('ERROR');
      setErrorMsg(
        e.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado.'
          : 'Error al acceder a la cámara.'
      );
    }
  }, [analizarFrame]);

  useEffect(() => {
    iniciarCamara();
  }, [iniciarCamara]);

  return (
    <div className={s.overlay}>
      <div className={s.modal}>
        <div className={s.header}>
          <div className={s.titleBox}>
            <Camera size={18} />
            <span>Lector de Placas (IA)</span>
          </div>
          <button className={s.closeBtn} onClick={() => { detener(); onClose(); }}>
            <X size={20} />
          </button>
        </div>

        <div className={s.viewfinder}>
          <video ref={videoRef} className={s.video} playsInline muted />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {estado === 'LOADING' && (
            <div className={s.overlayState}>
              <Loader2 size={32} className="animate-spin" />
              <span>Iniciando cámara...</span>
            </div>
          )}

          {estado === 'PROCESANDO' && (
            <div className={s.overlayState}>
              <Loader2 size={32} className="animate-spin" />
              <span>Analizando imagen...</span>
            </div>
          )}

          {estado === 'ERROR' && (
            <div className={s.overlayState} style={{ color: 'var(--color-crimson4)' }}>
              <span>{errorMsg}</span>
              <button className={s.retryBtn} onClick={iniciarCamara}>
                <RefreshCcw size={16} /> Reintentar
              </button>
            </div>
          )}

          {estado === 'SCANNING' && (
            <>
              <div className={s.scanTarget}>
                <div className={`${s.corner} ${s.tl}`} />
                <div className={`${s.corner} ${s.tr}`} />
                <div className={`${s.corner} ${s.bl}`} />
                <div className={`${s.corner} ${s.br}`} />
              </div>
              <p className={s.hint}>Ubica la placa dentro del recuadro</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
