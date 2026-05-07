import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, X, RefreshCcw, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import s from './LectorPlacaModal.module.css';

const API_URL = 'https://api.platerecognizer.com/v1/plate-reader/';
const API_TOKEN = import.meta.env.VITE_PLATE_RECOGNIZER_TOKEN;

/**
 * Validar formato placa colombiana
 * AUTO: ABC123  (3 letras + 3 dígitos)
 * MOTO: ABC12D  (3 letras + 2 dígitos + 1 letra)
 */
function validarPlacaCO(placa) {
  const p = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z]{3}\d{3}$/.test(p) || /^[A-Z]{3}\d{2}[A-Z]$/.test(p);
}

export function LectorPlacaModal({ onClose, onPlacaDetected }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const activoRef = useRef(true);

  const [estado,    setEstado]    = useState('INICIANDO');
  const [errorMsg,  setErrorMsg]  = useState('');
  const [placaOk,   setPlacaOk]   = useState('');
  const [confianza, setConfianza] = useState(0);
  const [flash,     setFlash]     = useState(false);
  const [debugText, setDebugText] = useState('');

  // ─── Limpieza ─────────────────────────────────────────────────
  const detener = useCallback(() => {
    activoRef.current = false;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => { detener(); }, [detener]);

  // ─── Capturar frame como base64 ───────────────────────────────
  const capturarFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return null;

    // Recortar solo la zona del marco guía (72% × 38%)
    const regionW = Math.round(w * 0.72);
    const regionH = Math.round(h * 0.38);
    const regionX = Math.round((w - regionW) / 2);
    const regionY = Math.round((h - regionH) / 2);

    canvas.width  = regionW;
    canvas.height = regionH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, regionX, regionY, regionW, regionH, 0, 0, regionW, regionH);

    // Extraer base64 (sin el prefijo data:image/jpeg;base64,)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    return dataUrl;
  };

  // ─── Llamar a Plate Recognizer API ────────────────────────────
  const reconocerPlaca = async (imageDataUrl) => {
    // Convertir dataURL a Blob para enviar como form-data
    const blob = await fetch(imageDataUrl).then(r => r.blob());

    const formData = new FormData();
    formData.append('upload', blob, 'placa.jpg');
    formData.append('regions', 'co');  // Colombia prioritario

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${API_TOKEN}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`API error ${response.status}: ${errBody}`);
    }

    return await response.json();
  };

  // ─── Capturar y procesar ──────────────────────────────────────
  const capturarAhora = async () => {
    if (estado !== 'ESPERANDO') return;

    if (!API_TOKEN) {
      setEstado('ERROR');
      setDebugText('Token de Plate Recognizer no configurado (VITE_PLATE_RECOGNIZER_TOKEN)');
      return;
    }

    // Flash visual
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
    setEstado('CAPTURANDO');
    setDebugText('');

    try {
      const dataUrl = capturarFrame();
      if (!dataUrl) throw new Error('No se pudo capturar la imagen');

      const resultado = await reconocerPlaca(dataUrl);
      console.log('[PlateRecognizer result]:', JSON.stringify(resultado, null, 2));

      if (!activoRef.current) return;

      const results = resultado.results || [];

      if (results.length > 0) {
        // Tomar el resultado con mayor confianza
        const mejor = results.reduce((a, b) => (a.score > b.score ? a : b));
        const placaRaw = mejor.plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const score = Math.round((mejor.score || 0) * 100);

        // Debug info
        const allPlates = results.map(r =>
          `${r.plate.toUpperCase()} (${Math.round((r.score || 0) * 100)}%)`
        ).join(', ');
        setDebugText(`Detectadas: ${allPlates}`);

        if (validarPlacaCO(placaRaw)) {
          setPlacaOk(placaRaw);
          setConfianza(score);
          setEstado('EXITO');
          setTimeout(() => {
            if (activoRef.current) {
              onPlacaDetected(placaRaw);
              cerrar();
            }
          }, 2000);
        } else {
          // La API detectó placa pero no es formato colombiano válido
          setDebugText(`Placa detectada: "${placaRaw}" (${score}%) — no coincide con formato colombiano`);
          setEstado('ERROR');
        }
      } else {
        setDebugText('La API no detectó ninguna placa en la imagen');
        setEstado('ERROR');
      }
    } catch (err) {
      console.error('[PlateRecognizer error]', err);
      if (activoRef.current) {
        setEstado('ERROR');
        setDebugText(err.message || 'Error de conexión con la API');
      }
    }
  };

  const reintentar = () => { setEstado('ESPERANDO'); setDebugText(''); };

  // ─── Iniciar cámara ───────────────────────────────────────────
  const iniciarCamara = useCallback(async () => {
    activoRef.current = true;
    try {
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
      console.error('[Camera init error]', e);
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

  useEffect(() => { iniciarCamara(); }, [iniciarCamara]);

  const cerrar = () => { detener(); onClose(); };

  // ─── RENDER ───────────────────────────────────────────────────
  return (
    <div className={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
      <div className={s.modal}>
        {/* Header */}
        <div className={s.header}>
          <div className={s.titleBox}>
            <Camera size={18} />
            <span>Lector de Placas IA</span>
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
              <span>Iniciando cámara...</span>
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
              <span>Reconociendo placa con IA...</span>
            </div>
          )}

          {estado === 'ERROR' && (
            <div className={s.overlayState} style={{ color: 'var(--color-crimson4)' }}>
              <span style={{ textAlign: 'center', lineHeight: 1.6, maxWidth: 320 }}>
                No se reconoció la placa, intenta de nuevo
              </span>
              {debugText && (
                <span style={{
                  fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
                  maxWidth: '100%', wordBreak: 'break-all', textAlign: 'center', lineHeight: 1.5,
                  padding: '4px 8px', background: 'rgba(0,0,0,0.3)', borderRadius: 4,
                }}>
                  {debugText}
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
                fontSize: 36, fontFamily: 'var(--font-mono)', fontWeight: 700,
                letterSpacing: 6, textShadow: '0 0 20px rgba(0,255,100,0.4)',
              }}>
                {placaOk}
              </span>
              <span style={{ fontSize: 13, opacity: 0.9 }}>
                Placa reconocida • {confianza}% confianza
              </span>
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
              <p className={s.hint}>Centra la placa dentro del recuadro</p>
            </>
          )}
        </div>

        {/* Footer */}
        {estado === 'ESPERANDO' && (
          <div className={s.footer}>
            <button className={s.captureBtn} onClick={capturarAhora}>
              <Camera size={16} /> Capturar
            </button>
            <p className={s.autoHint}>Powered by Plate Recognizer AI</p>
          </div>
        )}
      </div>
    </div>
  );
}
