// src/modules/espacios/espacios.routes.js
const { Router } = require('express');
const ctrl       = require('./espacios.controller');
const auth       = require('../../middlewares/auth.middleware');

const router = Router();

router.use(auth);

router.get('/',         ctrl.getAll);
router.get('/resumen',  ctrl.getResumen);  // Dashboard: cupos por tipo

module.exports = router;
