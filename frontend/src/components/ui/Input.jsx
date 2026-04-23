/* ── Input ────────────────────────────────────────────────────────────── */
/* src/components/ui/Input.jsx */
import s from './Input.module.css';

export function Input({ label, error, ...props }) {
  return (
    <div className={s.wrapper}>
      {label && <label className={s.label}>{label}</label>}
      <input className={`${s.input} ${error ? s.inputError : ''}`} {...props} />
      {error && <span className={s.errorMsg}>{error}</span>}
    </div>
  );
}

/* src/components/ui/Select.jsx */
export function Select({ label, error, children, ...props }) {
  return (
    <div className={s.wrapper}>
      {label && <label className={s.label}>{label}</label>}
      <select className={`${s.input} ${error ? s.inputError : ''}`} {...props}>
        {children}
      </select>
      {error && <span className={s.errorMsg}>{error}</span>}
    </div>
  );
}
