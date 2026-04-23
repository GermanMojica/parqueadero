// src/router/AppRouter.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute, AdminRoute } from '../components/layout/PrivateRoute';

import Login      from '../pages/Login';
import Dashboard  from '../pages/Dashboard';
import Entrada    from '../pages/Entrada';
import Salida     from '../pages/Salida';
import Registros  from '../pages/Registros';
import Tarifas    from '../pages/Tarifas';
import Usuarios   from '../pages/Usuarios';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pública */}
        <Route path="/login" element={<Login />} />

        {/* Privadas — envueltas en Layout */}
        <Route element={<PrivateRoute />}>
          <Route path="/dashboard"  element={<Dashboard />} />
          <Route path="/entrada"    element={<Entrada />} />
          <Route path="/salida"     element={<Salida />} />
          <Route path="/registros"  element={<Registros />} />

          {/* Solo admin */}
          <Route element={<AdminRoute />}>
            <Route path="/tarifas"  element={<Tarifas />} />
            <Route path="/usuarios" element={<Usuarios />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
