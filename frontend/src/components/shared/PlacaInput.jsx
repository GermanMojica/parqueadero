// src/components/shared/PlacaInput.jsx
import { useState, useCallback } from 'react';
import { PAISES, validarPlaca, normalizarPlaca, aplicarMascaraCO } from '../../utils/placa.validator';
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

  const tiposDelPais = PAISES[pais]?.tipos ?? [];
  const tipoActual   = tiposDelPais[tipoIdx] ?? tiposDelPais[0];
  const esExtranjero = pais !== 'CO';

  const handlePlacaChange = useCallback((e) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, '');
    // Aplicar máscara solo para Colombia estándar (6 chars sin letra al final)
    if (pais === 'CO' && (tipoIdx === 0 || tipoIdx === 1)) {
      val = aplicarMascaraCO(val);
    }
    setRaw(val);
    const placa  = normalizarPlaca(val);
    const result = validarPlaca(placa, pais, tipoIdx);
    onChange?.(placa, { pais, tipoIdx, valida: result.valida, mensaje: result.mensaje });
  }, [pais, tipoIdx, onChange]);

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
      {/* Selector de país — solo muestra si se hace clic en "Extranjera" */}
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

      {/* Input principal */}
      <div className={s.inputWrapper}>
        <input
          className={`${s.input} ${validation?.valida === false ? s.inputError : ''} ${validation?.valida ? s.inputOk : ''}`}
          value={raw}
          onChange={handlePlacaChange}
          placeholder={tipoActual?.mascara ?? 'ABC-123'}
          maxLength={(tipoActual?.maxLen ?? 6) + (pais === 'CO' ? 1 : 2)} // +1 por el guión
          disabled={disabled}
          autoFocus={autoFocus}
          autoCapitalize="characters"
          spellCheck={false}
        />
        {validation && (
          <span className={`${s.icon} ${validation.valida ? s.iconOk : s.iconErr}`}>
            {validation.valida ? '✓' : '✕'}
          </span>
        )}
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
    </div>
  );
}
