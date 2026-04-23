// src/pages/Login.jsx
import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { useAuth }             from '../context/AuthContext';
import s from './Login.module.css';

export default function Login() {
  const { login, isAuthenticated, loading, error } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [localError, setLocalError] = useState('');

  // Si ya hay sesión, redirigir
  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setLocalError('');
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setLocalError('Completa todos los campos');
      return;
    }
    try {
      await login(form.email, form.password);
      navigate('/dashboard', { replace: true });
    } catch {
      // El error ya está en el contexto
    }
  };

  const mensajeError = localError || error;

  return (
    <div className={s.page}>
      <div className={s.card}>
        {/* Header */}
        <div className={s.header}>
          <div className={s.logoMark}>🅿</div>
          <h1 className={s.title}>Control de Parqueadero</h1>
          <p className={s.subtitle}>Inicia sesión para continuar</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className={s.form} noValidate>
          <div className={s.field}>
            <label className={s.label} htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              className={s.input}
              placeholder="admin@parqueadero.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              className={s.input}
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
          </div>

          {mensajeError && (
            <div className={s.errorBox}>{mensajeError}</div>
          )}

          <button type="submit" className={s.submitBtn} disabled={loading}>
            {loading ? (
              <span className={s.spinner} />
            ) : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
