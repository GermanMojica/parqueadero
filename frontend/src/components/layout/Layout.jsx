// src/components/layout/Layout.jsx
import { useState }     from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth }      from '../../context/AuthContext';
import { useParqueadero } from '../../context/ParqueaderoContext';
import s from './Layout.module.css';

const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Dashboard',   icon: '⊞',  roles: ['ADMIN','OPERADOR'] },
  { to: '/entrada',    label: 'Registrar Entrada', icon: '↓', roles: ['ADMIN','OPERADOR'] },
  { to: '/salida',     label: 'Registrar Salida',  icon: '↑', roles: ['ADMIN','OPERADOR'] },
  { to: '/registros',  label: 'Historial',   icon: '☰',  roles: ['ADMIN','OPERADOR'] },
  { to: '/tarifas',    label: 'Tarifas',     icon: '$',  roles: ['ADMIN'] },
  { to: '/usuarios',   label: 'Usuarios',    icon: '👤', roles: ['ADMIN'] },
];

export function Layout({ children }) {
  const { usuario, isAdmin, logout } = useAuth();
  const { resumen }                  = useParqueadero();
  const navigate                     = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const totalDisponibles = resumen.reduce((acc, r) => acc + (r.disponibles ?? 0), 0);
  const totalOcupados    = resumen.reduce((acc, r) => acc + (r.ocupados    ?? 0), 0);

  const handleLogout = () => { logout(); navigate('/login'); };

  const navItems = NAV_ITEMS.filter(item =>
    isAdmin ? true : item.roles.includes('OPERADOR')
  );

  return (
    <div className={s.shell}>
      {/* ── Overlay móvil ── */}
      {sidebarOpen && (
        <div className={s.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`${s.sidebar} ${sidebarOpen ? s.sidebarOpen : ''}`}>
        <div className={s.sidebarHeader}>
          <span className={s.logo}>🅿 Parqueadero</span>
        </div>

        {/* Resumen rápido de cupos */}
        <div className={s.cuposResumen}>
          <div className={s.cupoItem}>
            <span className={s.cupoNum} style={{ color: 'var(--color-success)' }}>{totalDisponibles}</span>
            <span className={s.cupoLabel}>Disponibles</span>
          </div>
          <div className={s.cupoItem}>
            <span className={s.cupoNum} style={{ color: 'var(--color-danger)' }}>{totalOcupados}</span>
            <span className={s.cupoLabel}>Ocupados</span>
          </div>
        </div>

        {/* Navegación */}
        <nav className={s.nav}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `${s.navLink} ${isActive ? s.navLinkActive : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className={s.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer del sidebar */}
        <div className={s.sidebarFooter}>
          <div className={s.userInfo}>
            <span className={s.userName}>{usuario?.nombre}</span>
            <span className={s.userRol}>{usuario?.rol}</span>
          </div>
          <button className={s.logoutBtn} onClick={handleLogout} title="Cerrar sesión">
            ⏻
          </button>
        </div>
      </aside>

      {/* ── Contenido principal ── */}
      <div className={s.main}>
        {/* Topbar móvil */}
        <header className={s.topbar}>
          <button className={s.menuBtn} onClick={() => setSidebarOpen(true)}>☰</button>
          <span className={s.topbarTitle}>🅿 Parqueadero</span>
          <span className={s.topbarUser}>{usuario?.nombre}</span>
        </header>

        <main className={s.content}>
          {children}
        </main>
      </div>
    </div>
  );
}
