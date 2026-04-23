/* src/components/ui/Button.jsx */
import styles from './Button.module.css';

const variants = { primary: 'primary', danger: 'danger', ghost: 'ghost', success: 'success' };

export function Button({ children, variant = 'primary', loading = false, disabled, ...props }) {
  return (
    <button
      className={`${styles.btn} ${styles[variants[variant] ?? 'primary']}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className={styles.spinner} /> : null}
      {children}
    </button>
  );
}
