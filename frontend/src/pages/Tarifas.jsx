// src/pages/Tarifas.jsx
import { useState, useEffect } from 'react';
import { tarifasApi }          from '../api/index';
import { formatFecha, formatMoneda } from '../utils/format.utils';
import s from './Registros.module.css';
import f from './Operacion.module.css';

export default function Tarifas() {
  const [tarifas,  setTarifas]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tipoVehiculoId: '', precioHora: '', fraccionMinutos: 15 });
  const [saving, setSaving] = useState(false);

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
    try { await tarifasApi.deactivate(id); fetchTarifas(); }
    catch (e) { setError(e.message); }
  };

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <h1 className={s.title}>Gestión de Tarifas</h1>
        <button className={f.submitBtn} style={{ minHeight: 36, padding: '8px 20px', fontSize: 14 }}
          onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ Cancelar' : '+ Nueva tarifa'}
        </button>
      </div>

      {error && <div className={s.errorMsg}>{error}</div>}

      {showForm && (
        <div style={{ background: '#fff', border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)' }}>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className={f.field} style={{ minWidth: 160 }}>
              <label className={f.label}>Tipo vehículo (ID)</label>
              <input className={f.input} type="number" min="1" value={form.tipoVehiculoId}
                onChange={e => setForm(p => ({ ...p, tipoVehiculoId: e.target.value }))} required />
            </div>
            <div className={f.field} style={{ minWidth: 160 }}>
              <label className={f.label}>Precio por hora (COP)</label>
              <input className={f.input} type="number" min="0" value={form.precioHora}
                onChange={e => setForm(p => ({ ...p, precioHora: e.target.value }))} required />
            </div>
            <div className={f.field} style={{ minWidth: 130 }}>
              <label className={f.label}>Fracción mínima (min)</label>
              <select className={f.input} value={form.fraccionMinutos}
                onChange={e => setForm(p => ({ ...p, fraccionMinutos: e.target.value }))}>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={60}>60 min</option>
              </select>
            </div>
            <button type="submit" className={f.submitBtn} style={{ minHeight: 40, padding: '8px 24px' }} disabled={saving}>
              {saving ? 'Guardando...' : '✓ Guardar'}
            </button>
          </form>
        </div>
      )}

      <div className={s.tableWrapper}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>ID</th><th>Tipo Vehículo</th><th>Precio/hora</th>
              <th>Fracción</th><th>Vigente desde</th><th>Estado</th><th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className={s.loadingRow}>Cargando...</td></tr>
            ) : tarifas.map(t => (
              <tr key={t.id}>
                <td className={s.idCell}>#{t.id}</td>
                <td><strong>{t.tipo_vehiculo}</strong></td>
                <td className={s.totalCell}>{formatMoneda(t.precio_hora)}</td>
                <td>{t.fraccion_minutos} min</td>
                <td>{formatFecha(t.vigente_desde)}</td>
                <td><span className={`${s.badge} ${t.activo ? s.badge_ABIERTO : s.badge_ANULADO}`}>{t.activo ? 'Activa' : 'Inactiva'}</span></td>
                <td>
                  {t.activo && (
                    <button onClick={() => handleDeactivate(t.id)}
                      style={{ fontSize: 12, color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Desactivar
                    </button>
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
