import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { useAuth }             from '../context/AuthContext';
import { Terminal, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import s from './Login.module.css';

export default function Login() {
  const { login, isAuthenticated, loading, error } = useAuth();
  const navigate = useNavigate();

  const [form,       setForm]       = useState({ email: '', password: '' });
  const [localError, setLocalError] = useState('');
  const [showPass,   setShowPass]   = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setLocalError('');
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim())    { setLocalError('Ingresa tu correo electrónico'); return; }
    if (!form.password.trim()) { setLocalError('Ingresa tu contraseña'); return; }
    if (form.password.length < 4) { setLocalError('La contraseña debe tener al menos 4 caracteres'); return; }
    try {
      await login(form.email.trim(), form.password);
      navigate('/dashboard', { replace: true });
    } catch { /* error ya en contexto */ }
  };

  const mensajeError = localError || error;

  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.header}>
          <div className={s.logoMark}>
            <Terminal size={24} />
          </div>
          <h1 className={s.title}>Acceso al Sistema</h1>
          <p className={s.subtitle}>Autenticación requerida</p>
        </div>

        <form onSubmit={handleSubmit} className={s.form} noValidate>
          <div className={s.field}>
            <label className={s.label} htmlFor="email">EMAIL</label>
            <div className={s.inputWrapper}>
              <input
                id="email" name="email" type="email"
                className={s.input}
                placeholder="operador@parqueadero.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                autoFocus
                maxLength={120}
              />
            </div>
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="password">CONTRASEÑA</label>
            <div className={s.inputWrapper}>
              <input
                id="password" name="password"
                type={showPass ? 'text' : 'password'}
                className={s.input}
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                maxLength={72}
                style={{ paddingRight: '40px' }}
              />
              <button type="button"
                className={s.iconBtn}
                onClick={() => setShowPass(v => !v)}
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {mensajeError && (
            <div className={s.errorBox}>
              <AlertCircle size={16} />
              <span>{mensajeError}</span>
            </div>
          )}

          <button type="submit" className={`btn-primary ${s.submitBtn}`} disabled={loading}>
            {loading ? <span className={s.spinner} /> : (
              <>
                <span>Iniciar sesión</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
