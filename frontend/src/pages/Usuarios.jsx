// src/pages/Usuarios.jsx
import { useState, useEffect } from 'react';
import { usuariosApi }         from '../api/index';
import { formatFecha }         from '../utils/format.utils';
import s from './Registros.module.css';
import f from './Operacion.module.css';

const FORM_INIT = { nombre: '', email: '', password: '', rolNombre: 'OPERADOR' };

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState(FORM_INIT);
  const [saving,   setSaving]   = useState(false);

  const fetchUsuarios = async () => {
    setLoading(true);
    try { setUsuarios(await usuariosApi.getAll()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsuarios(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await usuariosApi.create(form);
      setShowForm(false);
      setForm(FORM_INIT);
      fetchUsuarios();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleToggle = async (u) => {
    try {
      await usuariosApi.update(u.id, { nombre: u.nombre, activo: !u.activo, rolNombre: u.rol });
      fetchUsuarios();
    } catch (e) { setError(e.message); }
  };

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <h1 className={s.title}>Gestión de Usuarios</h1>
        <button className={f.submitBtn} style={{ minHeight: 36, padding: '8px 20px', fontSize: 14 }}
          onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ Cancelar' : '+ Nuevo usuario'}
        </button>
      </div>

      {error && <div className={s.errorMsg}>{error}</div>}

      {showForm && (
        <div style={{ background: '#fff', border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)' }}>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className={f.field} style={{ minWidth: 180 }}>
              <label className={f.label}>Nombre completo</label>
              <input className={f.input} value={form.nombre}
                onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} required />
            </div>
            <div className={f.field} style={{ minWidth: 200 }}>
              <label className={f.label}>Email</label>
              <input className={f.input} type="email" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div className={f.field} style={{ minWidth: 150 }}>
              <label className={f.label}>Contraseña</label>
              <input className={f.input} type="password" value={form.password} minLength={8}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
            </div>
            <div className={f.field} style={{ minWidth: 130 }}>
              <label className={f.label}>Rol</label>
              <select className={f.input} value={form.rolNombre}
                onChange={e => setForm(p => ({ ...p, rolNombre: e.target.value }))}>
                <option value="OPERADOR">Operador</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <button type="submit" className={f.submitBtn} style={{ minHeight: 40, padding: '8px 24px' }} disabled={saving}>
              {saving ? 'Guardando...' : '✓ Crear usuario'}
            </button>
          </form>
        </div>
      )}

      <div className={s.tableWrapper}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>ID</th><th>Nombre</th><th>Email</th><th>Rol</th>
              <th>Creado</th><th>Estado</th><th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className={s.loadingRow}>Cargando...</td></tr>
            ) : usuarios.map(u => (
              <tr key={u.id}>
                <td className={s.idCell}>#{u.id}</td>
                <td><strong>{u.nombre}</strong></td>
                <td className={s.operadorCell}>{u.email}</td>
                <td><span className={`${s.badge} ${u.rol === 'ADMIN' ? s.badge_CERRADO : s.badge_ABIERTO}`}>{u.rol}</span></td>
                <td>{formatFecha(u.created_at)}</td>
                <td><span className={`${s.badge} ${u.activo ? s.badge_ABIERTO : s.badge_ANULADO}`}>{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td>
                  <button onClick={() => handleToggle(u)}
                    style={{ fontSize: 12, color: u.activo ? 'var(--color-danger)' : 'var(--color-success)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    {u.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
