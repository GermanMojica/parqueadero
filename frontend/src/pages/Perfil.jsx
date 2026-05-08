import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { notificacionesApi } from '../api/index';
import { AlertCircle, CheckCircle2, Save, Bell, Smartphone } from 'lucide-react';
import s from './Perfil.module.css';

export default function Perfil() {
  const { usuario } = useAuth();
  const [prefs, setPrefs] = useState({ canal_telegram: false, canal_push: false, chat_id_telegram: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    notificacionesApi.getPreferencias()
      .then(data => {
        if (data) {
          setPrefs({
            canal_telegram: !!data.canal_telegram,
            canal_push: !!data.canal_push,
            chat_id_telegram: data.chat_id_telegram || ''
          });
        }
      })
      .catch(() => setMsg({ text: 'Error al cargar preferencias.', type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ text: '', type: '' });
    try {
      await notificacionesApi.updatePreferencias({
        canalTelegram: prefs.canal_telegram,
        canalPush: prefs.canal_push,
        chatIdTelegram: prefs.chat_id_telegram
      });
      setMsg({ text: 'Preferencias guardadas correctamente.', type: 'success' });
    } catch (err) {
      setMsg({ text: err.message || 'Error al guardar.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const solicitarPermisoPush = async () => {
    if (!('Notification' in window)) {
      alert('Tu navegador no soporta notificaciones push.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      alert('Permiso concedido. Se activarán en el próximo login o recarga.');
      setPrefs(p => ({ ...p, canal_push: true }));
    } else {
      alert('Permiso denegado.');
      setPrefs(p => ({ ...p, canal_push: false }));
    }
  };

  if (loading) return <div className={s.page}>Cargando perfil...</div>;

  return (
    <div className={s.page}>
      <h1 className={s.title}>Mi Perfil y Preferencias</h1>
      
      <div className={s.card}>
        <h2 className={s.cardTitle}>Datos del Usuario</h2>
        <p className={s.userInfo}><strong>Nombre:</strong> {usuario?.nombre}</p>
        <p className={s.userInfo}><strong>Email:</strong> {usuario?.email}</p>
        <p className={s.userInfo}><strong>Rol:</strong> {usuario?.rol}</p>
      </div>

      <div className={s.card}>
        <h2 className={s.cardTitle}><Bell size={20} /> Notificaciones</h2>
        <p className={s.cardSubtitle}>Configura cómo deseas recibir alertas y recordatorios.</p>

        {msg.text && (
          <div className={`${s.msg} ${msg.type === 'error' ? s.msgError : s.msgSuccess}`}>
            {msg.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSave} className={s.form}>
          {/* Telegram */}
          <div className={s.toggleRow}>
            <label className={s.toggleLabel}>
              <input 
                type="checkbox" 
                checked={prefs.canal_telegram} 
                onChange={e => setPrefs(p => ({ ...p, canal_telegram: e.target.checked }))} 
                className={s.checkbox}
              />
              Recibir notificaciones por Telegram
            </label>
            {prefs.canal_telegram && (
              <div className={s.inputGroup}>
                <label>Chat ID de Telegram</label>
                <input 
                  type="text" 
                  value={prefs.chat_id_telegram} 
                  onChange={e => setPrefs(p => ({ ...p, chat_id_telegram: e.target.value }))}
                  placeholder="Ej. 123456789"
                  required={prefs.canal_telegram}
                />
                <span className={s.helpText}>Abre el bot de Telegram y usa el comando /start para obtener tu ID.</span>
              </div>
            )}
          </div>

          {/* Web Push */}
          <div className={s.toggleRow}>
            <label className={s.toggleLabel}>
              <input 
                type="checkbox" 
                checked={prefs.canal_push} 
                onChange={e => setPrefs(p => ({ ...p, canal_push: e.target.checked }))} 
                className={s.checkbox}
              />
              Recibir Notificaciones Web (Push)
            </label>
            {prefs.canal_push && Notification.permission !== 'granted' && (
              <button type="button" className={s.btnSecondary} onClick={solicitarPermisoPush}>
                <Smartphone size={16} /> Solicitar Permiso al Navegador
              </button>
            )}
          </div>

          <button type="submit" className={s.btnPrimary} disabled={saving}>
            <Save size={18} />
            {saving ? 'Guardando...' : 'Guardar Preferencias'}
          </button>
        </form>
      </div>
    </div>
  );
}
