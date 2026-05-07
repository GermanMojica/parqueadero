import { useState, useCallback } from 'react';
import { PAISES, validarPlaca, normalizarPlaca, aplicarMascaraCO } from '../../utils/placa.validator';
import { Check, X, Camera } from 'lucide-react';
import { LectorPlacaModal } from './LectorPlacaModal';
import s from './PlacaInput.module.css';

/**
 * Input de placa inteligente.
 * Props:
 *   value, onChange(placa, meta) — meta = { pais, tipoIdx, valida }
 *   disabled, autoFocus
 */
export function PlacaInput({ value = '', onChange, disabled, autoFocus }) {
  const [pais,    setPais]    = useState('CO');
  const [tipoIdx, setTipoIdx] = useState(0);
  const [raw,     setRaw]     = useState(value);
  const [showOcr, setShowOcr] = useState(false);

  const tiposDelPais = PAISES[pais]?.tipos ?? [];
  const tipoActual   = tiposDelPais[tipoIdx] ?? tiposDelPais[0];
  const esExtranjero = pais !== 'CO';

  const fireChange = useCallback((val, currentPais, currentTipo) => {
    let rawVal = val.toUpperCase().replace(/[^A-Z0-9\-]/g, '');
    if (currentPais === 'CO' && (currentTipo === 0 || currentTipo === 1)) {
      rawVal = aplicarMascaraCO(rawVal);
    }
    setRaw(rawVal);
    const placa  = normalizarPlaca(rawVal);
    const result = validarPlaca(placa, currentPais, currentTipo);
    onChange?.(placa, { pais: currentPais, tipoIdx: currentTipo, valida: result.valida, mensaje: result.mensaje });
  }, [onChange]);

  const handlePlacaChange = (e) => {
    fireChange(e.target.value, pais, tipoIdx);
  };

  const handlePaisChange = (e) => {
    const nuevoPais = e.target.value;
    setPais(nuevoPais);
    setTipoIdx(0);
    setRaw('');
    onChange?.('', { pais: nuevoPais, tipoIdx: 0, valida: false, mensaje: '' });
  };

  const handleTipoChange = (e) => {
    const idx = Number(e.target.value);
    setTipoIdx(idx);
    setRaw('');
    onChange?.('', { pais, tipoIdx: idx, valida: false, mensaje: '' });
  };

  const normal = normalizarPlaca(raw);
  const validation = normal ? validarPlaca(normal, pais, tipoIdx) : null;

  return (
    <div className={s.wrapper}>
      {/* Selector de país */}
      <div className={s.paisRow}>
        <select
          className={s.select}
          value={pais}
          onChange={handlePaisChange}
          disabled={disabled}
        >
          {Object.entries(PAISES).map(([code, p]) => (
            <option key={code} value={code}>{p.label}</option>
          ))}
        </select>

        {tiposDelPais.length > 1 && (
          <select className={s.select} value={tipoIdx} onChange={handleTipoChange} disabled={disabled}>
            {tiposDelPais.map((t, i) => (
              <option key={i} value={i}>{t.nombre}</option>
            ))}
          </select>
        )}
      </div>

      {/* Input principal y Botón OCR */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'stretch' }}>
        <div className={s.inputWrapper} style={{ flex: 1 }}>
          <input
            className={`${s.input} ${validation?.valida === false ? s.inputError : ''} ${validation?.valida ? s.inputOk : ''}`}
            value={raw}
            onChange={handlePlacaChange}
            placeholder={tipoActual?.mascara ?? 'ABC-123'}
            maxLength={(tipoActual?.maxLen ?? 6) + (pais === 'CO' ? 1 : 2)}
            disabled={disabled}
            autoFocus={autoFocus}
            autoCapitalize="characters"
            spellCheck={false}
          />
          
          <div className={s.inputActions}>
            {validation && (
              <span className={`${s.icon} ${validation.valida ? s.iconOk : s.iconErr}`}>
                {validation.valida ? <Check size={16} /> : <X size={16} />}
              </span>
            )}
          </div>
        </div>

        <button 
          type="button" 
          className="btn-secondary" 
          onClick={() => setShowOcr(true)}
          disabled={disabled}
          title="Escanear placa con la cámara"
          style={{ padding: '0 var(--space-4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', border: '1px solid var(--brand-green)', color: 'var(--brand-green)' }}
        >
          <Camera size={20} />
          <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Leer Placa</span>
        </button>
      </div>

      {/* Mensaje de validación */}
      {validation && !validation.valida && raw && (
        <p className={s.errorMsg}>{validation.mensaje}</p>
      )}

      {/* Formato esperado como hint */}
      {tipoActual && (
        <p className={s.hint}>
          {esExtranjero && <span className={s.extBadge}>Placa extranjera</span>}
          {tipoActual.mascara} — {tipoActual.desc}
        </p>
      )}

      {/* Modal OCR */}
      {showOcr && (
        <LectorPlacaModal 
          onClose={() => setShowOcr(false)} 
          onPlacaDetected={(placaDetectada) => {
            setShowOcr(false);
            fireChange(placaDetectada, pais, tipoIdx);
          }} 
        />
      )}
    </div>
  );
}
