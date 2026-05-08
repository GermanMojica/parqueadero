import { useState, useEffect } from 'react';
import { fidelizacionApi } from '../api/index';
import { formatMoneda } from '../utils/format.utils';
import { Trophy, Users, Settings, Plus, Star, CreditCard, Sparkles, Loader2, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import s from './Fidelizacion.module.css';

export default function Fidelizacion() {
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [crearPlaca, setCrearPlaca] = useState('');

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
                      <div className={s.clientInfo}>
                        <span className={s.placaText}>{c.placa}</span>
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
                  </tr>
                </thead>
                <tbody>
                  {data?.tarjetas.map((t, idx) => (
                    <tr key={t.id} style={{ animationDelay: `${idx * 0.05}s` }}>
                      <td><code className={s.codeTag}>{t.codigo}</code></td>
                      <td><span className={s.placaCell}>{t.placa}</span></td>
                      <td><span className={`${s.nivelTag} ${s['nivel' + t.nivel]}`}>{t.nivel}</span></td>
                      <td><span className={s.pointsCell}>{t.puntos_acumulados}</span></td>
                      <td><span className={s.activeBadge}>Activo</span></td>
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
                  <ShieldCheck size={24} />
                </div>
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
                <div className={s.levelFooter}>
                  Beneficios Elite {r.nivel === 'PLATINO' ? 'Máximos' : 'Activos'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
