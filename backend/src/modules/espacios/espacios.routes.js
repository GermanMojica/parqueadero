// src/modules/espacios/espacios.routes.js
const { Router } = require('express');
const ctrl       = require('./espacios.controller');
const auth       = require('../../middlewares/auth.middleware');

const router = Router();

// Dashboard público (para la vista de TV)
router.get('/resumen',  ctrl.getResumen);

router.use(auth);

router.get('/',         ctrl.getAll);
router.patch('/:id/estado', ctrl.updateEstado);

module.exports = router;
