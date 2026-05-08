// src/app.js — Configuración central de Express
const express  = require('express');
const cors     = require('cors');
const morgan   = require('morgan');

const { env }          = require('./config/env');
const errorMiddleware  = require('./middlewares/error.middleware');
const logger           = require('./utils/logger');

// Rutas
const authRoutes       = require('./modules/auth/auth.routes');
const usuariosRoutes   = require('./modules/usuarios/usuarios.routes');
const espaciosRoutes   = require('./modules/espacios/espacios.routes');
const registrosRoutes  = require('./modules/registros/registros.routes');
const tarifasRoutes    = require('./modules/tarifas/tarifas.routes');
const ticketsRoutes    = require('./modules/tickets/tickets.routes');
const descuentosRoutes = require('./modules/descuentos/descuentos.routes');
const reportesRoutes   = require('./modules/reportes/reportes.routes');
const reservasRoutes   = require('./modules/reservas/reservas.routes');
const notificacionesRoutes = require('./modules/notificaciones/notificaciones.routes');
const auditoriaRoutes  = require('./modules/auditoria/auditoria.routes');
const sedesRoutes      = require('./modules/sedes/sedes.routes');
const fidelizacionRoutes = require('./modules/fidelizacion/fidelizacion.routes');

const app = express();

// ── Middlewares globales ────────────────────────────────────────────────────
app.use(cors({
  origin: env.CORS_ORIGIN.includes(',') ? env.CORS_ORIGIN.split(',') : env.CORS_ORIGIN,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// HTTP logging solo en desarrollo
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Rutas del dominio ───────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/usuarios',   usuariosRoutes);
app.use('/api/espacios',   espaciosRoutes);
app.use('/api/registros',  registrosRoutes);
app.use('/api/tarifas',    tarifasRoutes);
app.use('/api/tickets',    ticketsRoutes);
app.use('/api/descuentos', descuentosRoutes);
app.use('/api/reportes',   reportesRoutes);
app.use('/api/reservas',   reservasRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/auditoria',  auditoriaRoutes);
app.use('/api/sedes',      sedesRoutes);
app.use('/api/fidelizacion', fidelizacionRoutes);

// ── Ruta no encontrada ──────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 404, message: 'Ruta no encontrada' } });
});

// ── Manejador global de errores (debe ir ÚLTIMO) ────────────────────────────
app.use(errorMiddleware);

module.exports = app;
