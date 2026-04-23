// src/components/ui/Badge.jsx
import s from './Badge.module.css';

const colorMap = {
  success: s.success, danger: s.danger,
  warning: s.warning, info:   s.info,
  gray:    s.gray,    primary: s.primary,
};

export function Badge({ children, color = 'gray' }) {
  return <span className={`${s.badge} ${colorMap[color] ?? s.gray}`}>{children}</span>;
}

// src/components/ui/Alert.jsx
export function Alert({ type = 'info', children, onClose }) {
  const alertStyles = {
    info:    { bg: 'var(--color-info-light)',    border: 'var(--color-info)',    color: '#0e7490' },
    success: { bg: 'var(--color-success-light)', border: 'var(--color-success)', color: '#15803d' },
    danger:  { bg: 'var(--color-danger-light)',  border: 'var(--color-danger)',  color: '#b91c1c' },
    warning: { bg: 'var(--color-warning-light)', border: 'var(--color-warning)', color: '#92400e' },
  };
  const st = alertStyles[type] ?? alertStyles.info;
  return (
    <div style={{
      background: st.bg, border: `1px solid ${st.border}`, color: st.color,
      borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)',
      fontSize: 'var(--font-size-sm)', display: 'flex',
      justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)',
    }}>
      <span>{children}</span>
      {onClose && (
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}>✕</button>
      )}
    </div>
  );
}

// src/components/ui/Card.jsx
export function Card({ children, style }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-gray-200)',
      padding: 'var(--space-6)', ...style,
    }}>
      {children}
    </div>
  );
}

// src/components/ui/Spinner.jsx
export function Spinner({ size = 32, color = 'var(--color-primary)' }) {
  return (
    <div style={{
      width: size, height: size,
      border: `3px solid ${color}22`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  );
}
