import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth }          from '../../context/AuthContext';
import { useParqueadero }   from '../../context/ParqueaderoContext';
import {
  LayoutDashboard, ArrowDownToLine, ArrowUpFromLine, ScanLine, Map,
  FileText, DollarSign, Users, LogOut, Menu, Car
} from 'lucide-react';
import s from './Layout.module.css';

const NAV = [
  { section: 'Operación' },
  { to: '/dashboard', label: 'Dashboard',       icon: <LayoutDashboard size={18} />, roles: ['ADMIN','OPERADOR'] },
  { to: '/entrada',   label: 'Registrar Entrada',icon: <ArrowDownToLine size={18} />, roles: ['ADMIN','OPERADOR'] },
  { to: '/salida',    label: 'Registrar Salida', icon: <ArrowUpFromLine size={18} />, roles: ['ADMIN','OPERADOR'] },
  { to: '/escaner',   label: 'Escáner QR',       icon: <ScanLine size={18} />, roles: ['ADMIN','OPERADOR'] },
  { to: '/mapa',      label: 'Mapa',             icon: <Map size={18} />, roles: ['ADMIN','OPERADOR'] },
  { section: 'Reportes' },
  { to: '/registros', label: 'Historial',        icon: <FileText size={18} />, roles: ['ADMIN','OPERADOR'] },
  { section: 'Admin' },
  { to: '/tarifas',   label: 'Tarifas',          icon: <DollarSign size={18} />, roles: ['ADMIN'] },
  { to: '/usuarios',  label: 'Usuarios',         icon: <Users size={18} />, roles: ['ADMIN'] },
];

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function Layout({ children }) {
  const { usuario, isAdmin, logout } = useAuth();
  const { resumen }                  = useParqueadero();
  const navigate                     = useNavigate();
  const [open, setOpen]              = useState(false);
  const now                          = useClock();

  const disponibles = resumen.reduce((a, r) => a + (r.disponibles ?? 0), 0);
  const ocupados    = resumen.reduce((a, r) => a + (r.ocupados    ?? 0), 0);
  const total       = resumen.reduce((a, r) => a + (r.capacidad_total ?? 0), 0);
  const pct         = total > 0 ? Math.round((ocupados / total) * 100) : 0;
  const barColor    = pct >= 90 ? 'var(--color-crimson4)' : pct >= 70 ? 'var(--color-yellowA7)' : 'var(--brand-green)';

  const initiales = (usuario?.nombre ?? 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

  const items = NAV.filter(item =>
    item.section ? true : isAdmin ? true : item.roles?.includes('OPERADOR')
  );

  const timeStr = now.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('es-CO', { weekday:'short', day:'numeric', month:'short' });

  return (
    <div className={s.shell}>
      {open && <div className={s.overlay} onClick={() => setOpen(false)} />}

      <aside className={`${s.sidebar} ${open ? s.sidebarOpen : ''}`}>
        {/* Logo */}
        <div className={s.sidebarHeader}>
          <div className={s.logoIcon}><Car size={20} /></div>
          <span className={s.logo}>Parqueadero</span>
        </div>

        {/* Reloj */}
        <div className={s.sidebarClock}>{dateStr} · {timeStr}</div>

        {/* Stats */}
        <div className={s.statsBar}>
          <div className={s.statItem}>
            <span className={s.statNum} style={{ color: 'var(--brand-green)' }}>{disponibles}</span>
            <span className={s.statLbl}>Libres</span>
          </div>
          <div className={s.statDivider} />
          <div className={s.statItem}>
            <span className={s.statNum} style={{ color: 'var(--color-crimson4)' }}>{ocupados}</span>
            <span className={s.statLbl}>Ocup.</span>
          </div>
          <div className={s.statDivider} />
          <div className={s.statItem}>
            <span className={s.statNum} style={{ color: barColor }}>{pct}%</span>
            <span className={s.statLbl}>Lleno</span>
          </div>
        </div>

        {/* Barra ocupación */}
        <div className={s.ocupacionBar}>
          <div className={s.ocupacionLabel}>
            <span>Ocupación global</span>
            <span>{ocupados}/{total}</span>
          </div>
          <div className={s.ocupacionTrack}>
            <div className={s.ocupacionFill} style={{ width:`${pct}%`, background: barColor }} />
          </div>
        </div>

        {/* Nav */}
        <nav className={s.nav}>
          {items.map((item, i) =>
            item.section ? (
              (!isAdmin && item.section === 'Admin') ? null :
              <div key={i} className={s.navSection}>{item.section}</div>
            ) : (
              <NavLink
                key={item.to} to={item.to}
                className={({ isActive }) => `${s.navLink} ${isActive ? s.navLinkActive : ''}`}
                onClick={() => setOpen(false)}
              >
                <span className={s.navIcon}>{item.icon}</span>
                {item.label}
              </NavLink>
            )
          )}
        </nav>

        {/* Footer */}
        <div className={s.sidebarFooter}>
          <div className={s.avatar}>{initiales}</div>
          <div className={s.userInfo}>
            <span className={s.userName}>{usuario?.nombre}</span>
            <span className={s.userRol}>{usuario?.rol}</span>
          </div>
          <button className={s.logoutBtn} onClick={() => { logout(); navigate('/login'); }} title="Cerrar sesión">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className={s.main}>
        {/* Topbar móvil */}
        <header className={s.topbar}>
          <button className={s.menuBtn} onClick={() => setOpen(true)}><Menu size={24} /></button>
          <div className={s.topbarCenter}>
            <Car size={20} />
            <span className={s.topbarTitle}>Parqueadero</span>
          </div>
          <div className={s.topbarRight}>
            <span className={s.topbarUser}>{usuario?.nombre}</span>
            <span className={s.topbarClock}>{timeStr}</span>
          </div>
        </header>
        <main className={s.content}>{children}</main>
      </div>
    </div>
  );
}
