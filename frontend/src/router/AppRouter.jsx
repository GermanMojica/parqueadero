// src/router/AppRouter.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute, AdminRoute } from '../components/layout/PrivateRoute';
import Login           from '../pages/Login';
import Dashboard       from '../pages/Dashboard';
import Entrada         from '../pages/Entrada';
import Salida          from '../pages/Salida';
import Registros       from '../pages/Registros';
import Tarifas         from '../pages/Tarifas';
import Usuarios        from '../pages/Usuarios';
import MapaParqueadero from '../pages/MapaParqueadero';
import EscanerQR       from '../pages/EscanerQR';
import TvDisplay       from '../pages/TvDisplay';
import Reportes        from '../pages/Reportes';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/tv"    element={<TvDisplay />} />
        <Route element={<PrivateRoute />}>
          <Route path="/dashboard"  element={<Dashboard />} />
          <Route path="/entrada"    element={<Entrada />} />
          <Route path="/salida"     element={<Salida />} />
          <Route path="/escaner"    element={<EscanerQR />} />
          <Route path="/mapa"       element={<MapaParqueadero />} />
          <Route path="/registros"  element={<Registros />} />
          <Route path="/reportes"   element={<Reportes />} />
          <Route element={<AdminRoute />}>
            <Route path="/tarifas"   element={<Tarifas />} />
            <Route path="/usuarios"  element={<Usuarios />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
