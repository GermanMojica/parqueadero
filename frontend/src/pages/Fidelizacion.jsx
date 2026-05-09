import { useState, useEffect } from 'react';
import { fidelizacionApi, registrosApi } from '../api/index';
import { formatFecha, formatDuracion, formatMoneda } from '../utils/format.utils';
import { Trophy, Users, Settings, Plus, Star, CreditCard, Sparkles, Loader2, ArrowRight, ShieldCheck, Zap, Clock, X, Calendar } from 'lucide-react';
import s from './Fidelizacion.module.css';

export default function Fidelizacion() {
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [crearPlaca, setCrearPlaca] = useState('');
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState({ puntos_por_hora: 0, descuento_pct: 0, puntos_minimo_canje: 0 });
  const [editingCard, setEditingCard] = useState(null);
  const [cardForm, setCardForm] = useState({ nivel: 'BRONCE', puntos_acumulados: 0, activo: true });
  const [historialPlaca, setHistorialPlaca] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [historialLoading, setHistorialLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fidelizacionApi.getDashboard();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearTarjeta = async (e) => {
    e.preventDefault();
    if (!crearPlaca) return;
    try {
      await fidelizacionApi.crearTarjeta(crearPlaca);
      setCrearPlaca('');
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditReglaClick = (r) => {
    setEditingRule(r.id);
    setRuleForm({ 
      puntos_por_hora: r.puntos_por_hora, 
      descuento_pct: r.descuento_pct, 
      puntos_minimo_canje: r.puntos_minimo_canje 
    });
  };

  const handleSaveRegla = async (id) => {
    try {
      await fidelizacionApi.updateRegla(id, {
        puntos_por_hora: Number(ruleForm.puntos_por_hora),
        descuento_pct: Number(ruleForm.descuento_pct),
        puntos_minimo_canje: Number(ruleForm.puntos_minimo_canje)
      });
      setEditingRule(null);
      fetchData();
    } catch (err) {
      alert(err.message || 'Error actualizando regla');
    }
  };

  const handleEditCardClick = (t) => {
    setEditingCard(t.id);
    setCardForm({
      nivel: t.nivel,
      puntos_acumulados: t.puntos_acumulados,
      activo: Boolean(t.activo)
    });
  };

  const handleSaveCard = async (id) => {
    try {
      await fidelizacionApi.updateTarjeta(id, {
        nivel: cardForm.nivel,
        puntos_acumulados: Number(cardForm.puntos_acumulados),
        activo: cardForm.activo
      });
      setEditingCard(null);
      fetchData();
    } catch (err) {
      alert(err.message || 'Error actualizando tarjeta');
    }
  };

  const handleVerHistorial = async (placa) => {
    setHistorialPlaca(placa);
    setHistorialLoading(true);
    try {
      const res = await registrosApi.getHistorial({ placa, limit: 50 });
      setHistorial(res.data || []);
    } catch (err) {
      console.error(err);
      setHistorial([]);
    } finally {
      setHistorialLoading(false);
    }
  };

  if (loading) return (
    <div className={s.loadingWrapper}>
      <div className={s.spinner}>
        <Sparkles className={s.spinningSparkle} size={48} />
      </div>
      <p>Cargando Programa de Recompensas</p>
    </div>
  );

  return (
    <div className={s.page}>
      <div className={s.hero}>
        <div className={s.heroContent}>
          <div className={s.badge}><ShieldCheck size={14} /> Sistema de Fidelización v2.0</div>
          <h1 className={s.heroTitle}>Recompensas que <span className={s.highlight}>Impulsan</span> tu Negocio</h1>
          <p className={s.heroSubtitle}>Gestiona niveles de clientes, puntos acumulados y beneficios exclusivos desde un solo lugar.</p>
          
          <div className={s.tabs}>
            <button className={`${s.tabBtn} ${activeTab === 'DASHBOARD' ? s.tabActive : ''}`} onClick={() => setActiveTab('DASHBOARD')}>
              <Zap size={16} /> Resumen
            </button>
            <button className={`${s.tabBtn} ${activeTab === 'GESTION' ? s.tabActive : ''}`} onClick={() => setActiveTab('GESTION')}>
              <CreditCard size={16} /> Tarjetas
            </button>
            <button className={`${s.tabBtn} ${activeTab === 'REGLAS' ? s.tabActive : ''}`} onClick={() => setActiveTab('REGLAS')}>
              <Settings size={16} /> Niveles
            </button>
          </div>
        </div>
      </div>

      <div className={s.contentArea}>
        {activeTab === 'DASHBOARD' && (
          <div className={s.dashboardLayout}>
            <div className={s.mainSection}>
              <div className={s.glassCard}>
                <div className={s.cardHeader}>
                  <div className={s.iconTitle}>
                    <Trophy size={20} className={s.goldIcon} />
                    <h3>Top 5 Clientes Elite</h3>
                  </div>
                  <ArrowRight size={18} className={s.fadeIcon} />
                </div>
                <div className={s.eliteTable}>
                  {data?.topClientes.slice(0, 5).map((c, idx) => (
                    <div key={c.id} className={s.eliteRow} style={{ animationDelay: `${idx * 0.1}s` }}>
                      <div className={s.rankBadge}>{idx + 1}</div>
                      <div className={s.clientInfo} onClick={() => handleVerHistorial(c.placa)} style={{ cursor: 'pointer' }}>
                        <span className={s.placaLink}>{c.placa}</span>
                        <span className={s.puntosText}>{c.puntos_acumulados} pts</span>
                      </div>
                      <div className={`${s.nivelBadge} ${s['nivel' + c.nivel]}`}>
                        {c.nivel}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={s.sideSection}>
              <div className={s.statsCard}>
                <div className={s.statBox}>
                  <Users size={24} />
                  <div className={s.statContent}>
                    <span className={s.statValue}>{data?.tarjetas.length}</span>
                    <span className={s.statLabel}>Clientes Registrados</span>
                  </div>
                </div>
                <div className={s.statBox}>
                  <Star size={24} />
                  <div className={s.statContent}>
                    <span className={s.statValue}>
                      {data?.tarjetas.filter(t => t.nivel === 'PLATINO' || t.nivel === 'ORO').length}
                    </span>
                    <span className={s.statLabel}>Miembros VIP</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'GESTION' && (
          <div className={s.glassCard}>
            <div className={s.cardHeader}>
              <div className={s.iconTitle}>
                <CreditCard size={20} />
                <h3>Directorio de Tarjetas</h3>
              </div>
              <form onSubmit={handleCrearTarjeta} className={s.createForm}>
                <input 
                  type="text" 
                  placeholder="NUEVA PLACA" 
                  className={s.minimalInput}
                  value={crearPlaca} 
                  onChange={e => setCrearPlaca(e.target.value.toUpperCase())}
                />
                <button type="submit" className={s.addBtn}><Plus size={18}/></button>
              </form>
            </div>
            <div className={s.tableContainer}>
              <table className={s.modernTable}>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Placa</th>
                    <th>Nivel</th>
                    <th>Puntos</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.tarjetas.map((t, idx) => (
                    <tr key={t.id} style={{ animationDelay: `${idx * 0.05}s` }}>
                      {editingCard === t.id ? (
                        <>
                          <td><code className={s.codeTag}>{t.codigo}</code></td>
                          <td><span className={s.placaCell}>{t.placa}</span></td>
                          <td>
                            <select className={s.editSelect} value={cardForm.nivel} onChange={e => setCardForm({...cardForm, nivel: e.target.value})}>
                              <option value="BRONCE">BRONCE</option>
                              <option value="PLATA">PLATA</option>
                              <option value="ORO">ORO</option>
                              <option value="PLATINO">PLATINO</option>
                            </select>
                          </td>
                          <td>
                            <input className={s.editInput} type="number" min="0" value={cardForm.puntos_acumulados} onChange={e => setCardForm({...cardForm, puntos_acumulados: e.target.value})} style={{width: '70px'}} />
                          </td>
                          <td>
                            <label style={{display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '12px'}}>
                              <input type="checkbox" checked={cardForm.activo} onChange={e => setCardForm({...cardForm, activo: e.target.checked})} />
                              Activo
                            </label>
                          </td>
                          <td>
                            <div style={{display: 'flex', gap: '4px'}}>
                              <button className={s.btnSaveCard} onClick={() => handleSaveCard(t.id)}>Guardar</button>
                              <button className={s.btnCancelCard} onClick={() => setEditingCard(null)}>Cancelar</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td><code className={s.codeTag}>{t.codigo}</code></td>
                          <td><span className={s.placaLink} onClick={() => handleVerHistorial(t.placa)} style={{ cursor: 'pointer' }}>{t.placa}</span></td>
                          <td><span className={`${s.nivelTag} ${s['nivel' + t.nivel]}`}>{t.nivel}</span></td>
                          <td><span className={s.pointsCell}>{t.puntos_acumulados}</span></td>
                          <td>
                            <span className={t.activo ? s.activeBadge : s.inactiveBadge}>{t.activo ? 'Activo' : 'Inactivo'}</span>
                          </td>
                          <td>
                            <button onClick={() => handleEditCardClick(t)} className={s.editRuleBtn} title="Editar Tarjeta">
                              <Settings size={16} />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'REGLAS' && (
          <div className={s.levelsGrid}>
            {data?.reglas.map((r, idx) => (
              <div key={r.id} className={`${s.levelCard} ${s['levelCard' + r.nivel]}`} style={{ animationDelay: `${idx * 0.2}s` }}>
                <div className={s.levelHeader}>
                  <span className={s.levelName}>{r.nivel}</span>
                  {editingRule !== r.id && (
                    <button onClick={() => handleEditReglaClick(r)} className={s.editRuleBtn} title="Editar Nivel">
                      <Settings size={16} />
                    </button>
                  )}
                </div>
                
                {editingRule === r.id ? (
                  <div className={s.editForm}>
                    <div className={s.editRow}>
                      <label>Pts / Hora</label>
                      <input type="number" min="0" value={ruleForm.puntos_por_hora} onChange={e => setRuleForm({...ruleForm, puntos_por_hora: e.target.value})} />
                    </div>
                    <div className={s.editRow}>
                      <label>Descuento (%)</label>
                      <input type="number" min="0" max="100" value={ruleForm.descuento_pct} onChange={e => setRuleForm({...ruleForm, descuento_pct: e.target.value})} />
                    </div>
                    <div className={s.editRow}>
                      <label>Min. Canje (pts)</label>
                      <input type="number" min="0" value={ruleForm.puntos_minimo_canje} onChange={e => setRuleForm({...ruleForm, puntos_minimo_canje: e.target.value})} />
                    </div>
                    <div className={s.editActions}>
                      <button className={s.btnSave} onClick={() => handleSaveRegla(r.id)}>Guardar</button>
                      <button className={s.btnCancel} onClick={() => setEditingRule(null)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className={s.levelBenefits}>
                    <div className={s.benefitItem}>
                      <span className={s.benefitValue}>{r.puntos_por_hora}</span>
                      <span className={s.benefitLabel}>Pts / Hora</span>
                    </div>
                    <div className={s.benefitItem}>
                      <span className={s.benefitValue}>{r.descuento_pct}%</span>
                      <span className={s.benefitLabel}>Descuento</span>
                    </div>
                    <div className={s.benefitItem}>
                      <span className={s.benefitValue}>{r.puntos_minimo_canje}</span>
                      <span className={s.benefitLabel}>Min. Canje</span>
                    </div>
                  </div>
                )}
                
                <div className={s.levelFooter}>
                  Beneficios Elite {r.nivel === 'PLATINO' ? 'Máximos' : 'Activos'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {historialPlaca && (
        <div className={s.historialOverlay} onClick={() => setHistorialPlaca(null)}>
          <div className={s.historialModal} onClick={e => e.stopPropagation()}>
            <div className={s.historialHeader}>
              <div>
                <h2 className={s.historialTitle}>
                  <Calendar size={20} /> Historial de <span className={s.highlight}>{historialPlaca}</span>
                </h2>
                <p className={s.historialSubtitle}>{historial.length} visita{historial.length !== 1 ? 's' : ''} registrada{historial.length !== 1 ? 's' : ''}</p>
              </div>
              <button className={s.historialClose} onClick={() => setHistorialPlaca(null)}><X size={20} /></button>
            </div>

            <div className={s.historialBody}>
              {historialLoading ? (
                <div className={s.loadingWrapper} style={{ height: 200 }}>
                  <Loader2 size={28} className={s.spinningSparkle} />
                  <p>Cargando historial...</p>
                </div>
              ) : historial.length === 0 ? (
                <div className={s.historialEmpty}>
                  <Clock size={32} />
                  <p>No hay registros para esta placa</p>
                </div>
              ) : (
                <div className={s.historialTimeline}>
                  {historial.map((r, idx) => (
                    <div key={r.id} className={s.timelineItem} style={{ animationDelay: `${idx * 0.05}s` }}>
                      <div className={`${s.timelineDot} ${s['dot' + r.estado]}`} />
                      <div className={s.timelineContent}>
                        <div className={s.timelineTop}>
                          <span className={s.timelineDate}>{formatFecha(r.hora_entrada)}</span>
                          <span className={`${s.timelineEstado} ${s['estado' + r.estado]}`}>{r.estado}</span>
                        </div>
                        <div className={s.timelineDetails}>
                          <span><strong>Espacio:</strong> {r.espacio_codigo}</span>
                          <span><strong>Tipo:</strong> {r.tipo_vehiculo}</span>
                          {r.estado === 'CERRADO' && (
                            <>
                              <span><strong>Salida:</strong> {formatFecha(r.hora_salida)}</span>
                              <span><strong>Duración:</strong> {formatDuracion(r.minutos_total)}</span>
                              <span><strong>Total:</strong> {formatMoneda(r.total_cobrado)}</span>
                            </>
                          )}
                          <span><strong>Operador:</strong> {r.operador_entrada}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
