import { useState, useEffect } from 'react';
import { tarifasApi }          from '../api/index';
import { formatFecha, formatMoneda } from '../utils/format.utils';
import { Plus, X, Check, Edit2, Trash2, ShieldOff, Loader2, AlertCircle } from 'lucide-react';
import s from './Registros.module.css';
import f from './Operacion.module.css';

export default function Tarifas() {
  const [tarifas,   setTarifas]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState({ tipoVehiculoId: '', precioHora: '', fraccionMinutos: 15 });
  const [saving,    setSaving]    = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [editForm,  setEditForm]  = useState({ precioHora: '', fraccionMinutos: 15 });
  const [editSaving,setEditSaving]= useState(false);

  const fetchTarifas = async () => {
    setLoading(true);
    try { setTarifas(await tarifasApi.getAll()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTarifas(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await tarifasApi.create({
        tipoVehiculoId:  Number(form.tipoVehiculoId),
        precioHora:      Number(form.precioHora),
        fraccionMinutos: Number(form.fraccionMinutos),
      });
      setShowForm(false);
      setForm({ tipoVehiculoId: '', precioHora: '', fraccionMinutos: 15 });
      fetchTarifas();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('¿Desactivar esta tarifa?')) return;
    setError('');
    try { await tarifasApi.deactivate(id); fetchTarifas(); }
    catch (e) { setError(e.message); }
  };

  const abrirEdicion = (t) => {
    setEditId(t.id);
    setEditForm({ precioHora: t.precio_hora, fraccionMinutos: t.fraccion_minutos });
    setError('');
  };

  const cancelarEdicion = () => {
    setEditId(null);
    setEditForm({ precioHora: '', fraccionMinutos: 15 });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editForm.precioHora || Number(editForm.precioHora) <= 0) {
      setError('El precio por hora debe ser mayor a cero'); return;
    }
    setEditSaving(true);
    setError('');
    try {
      await tarifasApi.update(editId, {
        precioHora:      Number(editForm.precioHora),
        fraccionMinutos: Number(editForm.fraccionMinutos),
      });
      setEditId(null);
      fetchTarifas();
    } catch (e) { setError(e.message); }
    finally { setEditSaving(false); }
  };

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <h1 className={s.title}>Gestión de Tarifas</h1>
        <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 'var(--font-size-sm)' }}
          onClick={() => { setShowForm(v => !v); cancelarEdicion(); }}>
          {showForm ? <><X size={16}/> Cancelar</> : <><Plus size={16}/> Nueva tarifa</>}
        </button>
      </div>

      {error && <div className={s.errorMsg}><AlertCircle size={16} style={{display:'inline', verticalAlign:'middle'}}/> {error}</div>}

      {showForm && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-base)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
          <h3 style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--font-size-base)', fontWeight: 400, color: 'var(--text-primary)' }}>Nueva tarifa</h3>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className={f.field} style={{ minWidth: 160 }}>
              <label className={f.label}>Tipo vehículo (ID)</label>
              <input className="input-override" type="number" min="1" value={form.tipoVehiculoId}
                onChange={e => setForm(p => ({ ...p, tipoVehiculoId: e.target.value }))} required />
            </div>
            <div className={f.field} style={{ minWidth: 160 }}>
              <label className={f.label}>Precio por hora (COP)</label>
              <input className="input-override" type="number" min="1" value={form.precioHora}
                onChange={e => setForm(p => ({ ...p, precioHora: e.target.value }))} required />
            </div>
            <div className={f.field} style={{ minWidth: 130 }}>
              <label className={f.label}>Fracción mínima</label>
              <select className="input-override" value={form.fraccionMinutos}
                onChange={e => setForm(p => ({ ...p, fraccionMinutos: e.target.value }))}>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={60}>60 min</option>
              </select>
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16}/>} Guardar
            </button>
          </form>
        </div>
      )}

      <div className={s.tableWrapper}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>ID</th><th>Tipo Vehículo</th><th>Precio/hora</th>
              <th>Fracción</th><th>Vigente desde</th><th>Estado</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className={s.loadingRow}><Loader2 size={24} className="animate-spin" style={{margin:'0 auto'}}/></td></tr>
            ) : tarifas.map(t => (
              <tr key={t.id}>
                <td className={s.idCell}>{t.id}</td>
                <td><strong style={{color:'var(--text-primary)'}}>{t.tipo_vehiculo}</strong></td>
                <td className={s.totalCell}>
                  {editId === t.id ? (
                    <form onSubmit={handleEdit} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="number" min="1" step="100"
                        value={editForm.precioHora}
                        onChange={e => setEditForm(p => ({ ...p, precioHora: e.target.value }))}
                        className="input-override"
                        style={{ width: 100, padding: '4px 8px', fontSize: 13 }}
                        autoFocus required
                      />
                      <select
                        value={editForm.fraccionMinutos}
                        onChange={e => setEditForm(p => ({ ...p, fraccionMinutos: Number(e.target.value) }))}
                        className="input-override"
                        style={{ padding: '4px 6px', fontSize: 13 }}
                      >
                        <option value={15}>15 min</option>
                        <option value={30}>30 min</option>
                        <option value={60}>60 min</option>
                      </select>
                      <button type="submit" disabled={editSaving}
                        style={{ color: 'var(--brand-green)', background: 'none', border: 'none', cursor: 'pointer' }}
                        title="Guardar">
                        {editSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      </button>
                      <button type="button" onClick={cancelarEdicion}
                        style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                        title="Cancelar">
                        <X size={16} />
                      </button>
                    </form>
                  ) : (
                    formatMoneda(t.precio_hora)
                  )}
                </td>
                <td>{editId === t.id ? '—' : `${t.fraccion_minutos} min`}</td>
                <td>{formatFecha(t.vigente_desde)}</td>
                <td><span className={`${s.badge} ${t.activo ? s.badge_ABIERTO : s.badge_ANULADO}`}>{t.activo ? 'Activa' : 'Inactiva'}</span></td>
                <td style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {t.activo && editId !== t.id && (
                    <>
                      <button onClick={() => abrirEdicion(t)}
                        style={{ display:'flex', alignItems:'center', gap:4, fontSize: 12, color: 'var(--brand-green)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Edit2 size={14} /> Editar
                      </button>
                      <button onClick={() => handleDeactivate(t.id)}
                        style={{ display:'flex', alignItems:'center', gap:4, fontSize: 12, color: 'var(--color-crimson4)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <ShieldOff size={14} /> Desactivar
                      </button>
                    </>
                  )}
                  {!t.activo && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
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
