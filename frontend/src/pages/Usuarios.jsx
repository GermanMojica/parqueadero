import { useState, useEffect } from 'react';
import { usuariosApi }         from '../api/index';
import { formatFecha }         from '../utils/format.utils';
import { Plus, X, Check, Edit2, Trash2, Power, PowerOff, Loader2, AlertCircle } from 'lucide-react';
import s from './Registros.module.css';
import f from './Operacion.module.css';

const FORM_INIT = { nombre: '', email: '', password: '', rolNombre: 'OPERADOR' };

export default function Usuarios() {
  const [usuarios,    setUsuarios]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [showForm,    setShowForm]    = useState(false);
  const [form,        setForm]        = useState(FORM_INIT);
  const [saving,      setSaving]      = useState(false);
  const [editId,      setEditId]      = useState(null);
  const [editForm,    setEditForm]    = useState({ nombre: '', rolNombre: 'OPERADOR' });
  const [editSaving,  setEditSaving]  = useState(false);
  const [deleteId,    setDeleteId]    = useState(null);

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

  const abrirEdicion = (u) => {
    setEditId(u.id);
    setEditForm({ nombre: u.nombre, rolNombre: u.rol });
    setDeleteId(null);
    setError('');
  };

  const cancelarEdicion = () => {
    setEditId(null);
    setDeleteId(null);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editForm.nombre.trim()) { setError('El nombre no puede estar vacío'); return; }
    setEditSaving(true);
    setError('');
    try {
      await usuariosApi.update(editId, { nombre: editForm.nombre.trim(), rolNombre: editForm.rolNombre });
      setEditId(null);
      fetchUsuarios();
    } catch (e) { setError(e.message); }
    finally { setEditSaving(false); }
  };

  const handleToggle = async (u) => {
    setError('');
    try {
      await usuariosApi.update(u.id, { nombre: u.nombre, activo: !u.activo, rolNombre: u.rol });
      fetchUsuarios();
    } catch (e) { setError(e.message); }
  };

  const handleDelete = async (id) => {
    setError('');
    try {
      await usuariosApi.delete(id);
      setDeleteId(null);
      fetchUsuarios();
    } catch (e) { setError(e.message); }
  };

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <h1 className={s.title}>Gestión de Usuarios</h1>
        <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 'var(--font-size-sm)' }}
          onClick={() => { setShowForm(v => !v); cancelarEdicion(); }}>
          {showForm ? <><X size={16}/> Cancelar</> : <><Plus size={16}/> Nuevo usuario</>}
        </button>
      </div>

      {error && <div className={s.errorMsg}><AlertCircle size={16} style={{display:'inline', verticalAlign:'middle'}}/> {error}</div>}

      {showForm && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-base)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
          <h3 style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--font-size-base)', fontWeight: 400, color: 'var(--text-primary)' }}>Nuevo usuario</h3>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className={f.field} style={{ minWidth: 180 }}>
              <label className={f.label}>Nombre completo</label>
              <input className="input-override" value={form.nombre}
                onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} required />
            </div>
            <div className={f.field} style={{ minWidth: 200 }}>
              <label className={f.label}>Email</label>
              <input className="input-override" type="email" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div className={f.field} style={{ minWidth: 150 }}>
              <label className={f.label}>Contraseña</label>
              <input className="input-override" type="password" value={form.password} minLength={8}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
            </div>
            <div className={f.field} style={{ minWidth: 130 }}>
              <label className={f.label}>Rol</label>
              <select className="input-override" value={form.rolNombre}
                onChange={e => setForm(p => ({ ...p, rolNombre: e.target.value }))}>
                <option value="OPERADOR">Operador</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16}/>} Crear usuario
            </button>
          </form>
        </div>
      )}

      <div className={s.tableWrapper}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>ID</th><th>Nombre</th><th>Email</th><th>Rol</th>
              <th>Creado</th><th>Estado</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className={s.loadingRow}><Loader2 size={24} className="animate-spin" style={{margin:'0 auto'}}/></td></tr>
            ) : usuarios.map(u => (
              <tr key={u.id} style={{ background: deleteId === u.id ? 'rgba(220, 38, 38, 0.05)' : undefined }}>
                <td className={s.idCell}>{u.id}</td>
                <td>
                  {editId === u.id ? (
                    <input
                      value={editForm.nombre}
                      onChange={e => setEditForm(p => ({ ...p, nombre: e.target.value }))}
                      className="input-override"
                      style={{ padding: '4px 8px', fontSize: 13, width: 140 }}
                      autoFocus
                    />
                  ) : (
                    <strong style={{color:'var(--text-primary)'}}>{u.nombre}</strong>
                  )}
                </td>
                <td className={s.operadorCell}>{u.email}</td>
                <td>
                  {editId === u.id ? (
                    <select
                      value={editForm.rolNombre}
                      onChange={e => setEditForm(p => ({ ...p, rolNombre: e.target.value }))}
                      className="input-override"
                      style={{ padding: '4px 6px', fontSize: 13 }}
                    >
                      <option value="OPERADOR">Operador</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  ) : (
                    <span className={`${s.badge} ${u.rol === 'ADMIN' ? s.badge_CERRADO : s.badge_ABIERTO}`}>{u.rol}</span>
                  )}
                </td>
                <td>{formatFecha(u.created_at)}</td>
                <td>
                  <span className={`${s.badge} ${u.activo ? s.badge_ABIERTO : s.badge_ANULADO}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  {/* Confirmación de eliminación */}
                  {deleteId === u.id ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--color-crimson4)', fontWeight: 500 }}>¿Eliminar?</span>
                      <button onClick={() => handleDelete(u.id)}
                        style={{ fontSize: 12, color: 'var(--color-base)', background: 'var(--color-crimson4)', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>
                        Sí
                      </button>
                      <button onClick={() => setDeleteId(null)}
                        style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        No
                      </button>
                    </div>
                  ) : editId === u.id ? (
                    /* Modo edición: guardar / cancelar */
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button onClick={handleEdit} disabled={editSaving}
                        style={{ display:'flex', alignItems:'center', gap:4, fontSize: 12, color: 'var(--brand-green)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Guardar
                      </button>
                      <button onClick={cancelarEdicion}
                        style={{ display:'flex', alignItems:'center', gap:4, fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={14} /> Cancelar
                      </button>
                    </div>
                  ) : (
                    /* Acciones normales: editar, activar/desactivar, eliminar */
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <button onClick={() => abrirEdicion(u)}
                        style={{ display:'flex', alignItems:'center', gap:4, fontSize: 12, color: 'var(--brand-green)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Edit2 size={14} /> Editar
                      </button>
                      <button onClick={() => handleToggle(u)}
                        style={{ display:'flex', alignItems:'center', gap:4, fontSize: 12, color: u.activo ? 'var(--color-yellowA7)' : 'var(--brand-green)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        {u.activo ? <><PowerOff size={14} /> Desactivar</> : <><Power size={14} /> Activar</>}
                      </button>
                      <button onClick={() => setDeleteId(u.id)}
                        style={{ display:'flex', alignItems:'center', gap:4, fontSize: 12, color: 'var(--color-crimson4)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Trash2 size={14} /> Eliminar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
