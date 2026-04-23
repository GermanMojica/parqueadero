// src/components/layout/PrivateRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth }          from '../../context/AuthContext';
import { Layout }           from './Layout';

/** Protege rutas que requieren autenticación. */
export function PrivateRoute() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

/** Protege rutas que requieren rol ADMIN. */
export function AdminRoute() {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin)         return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
