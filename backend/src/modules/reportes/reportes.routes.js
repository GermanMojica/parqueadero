// src/modules/reportes/reportes.routes.js
const { Router }     = require('express');
const ctrl           = require('./reportes.controller');
const auth           = require('../../middlewares/auth.middleware');
const sedeMiddleware = require('../../middlewares/sede.middleware');

const router = Router();

// Todas las rutas requieren autenticación y middleware de sede
router.use(auth);
router.use(sedeMiddleware);

router.get('/listado',            ctrl.getListado);
router.get('/resumen',            ctrl.getResumen);
router.get('/ocupacion-hora',     ctrl.getOcupacion);
router.get('/kpis',               ctrl.getKpisHoy);
router.get('/alertas',            ctrl.getAlertas);
router.get('/placas-frecuentes',  ctrl.getPlacasFrecuentes);
router.get('/exportar',           ctrl.exportarReporte);

module.exports = router;
