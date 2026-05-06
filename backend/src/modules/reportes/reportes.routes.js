// src/modules/reportes/reportes.routes.js
const { Router }     = require('express');
const ctrl           = require('./reportes.controller');
const auth           = require('../../middlewares/auth.middleware');
const { requireRol } = require('../../middlewares/roles.middleware');

const router = Router();
router.use(auth, requireRol('ADMIN'));

router.get('/financiero',        ctrl.getResumen);
router.get('/por-dia',           ctrl.getPorDia);
router.get('/horas-pico',        ctrl.getHorasPico);
router.get('/por-tipo',          ctrl.getPorTipo);
router.get('/resumen-periodo',    ctrl.getResumenPeriodo);
router.get('/kpis-hoy',         ctrl.getKpisHoy);
router.get('/alertas',          ctrl.getAlertas);           // ?horas=12
router.get('/placas-frecuentes', ctrl.getPlacasFrecuentes); // ?limite=10

module.exports = router;
