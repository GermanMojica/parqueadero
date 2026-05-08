const { Router } = require('express');
const ctrl       = require('./espacios.controller');
const auth       = require('../../middlewares/auth.middleware');
const sedeMiddleware = require('../../middlewares/sede.middleware');

const router = Router();

// Aplicar sedeMiddleware a todas las rutas (públicas y privadas)
router.use(sedeMiddleware);

// Dashboard público (para la vista de TV)
router.get('/resumen',  ctrl.getResumen);

router.use(auth);

router.get('/',         ctrl.getAll);
router.patch('/:id/estado', ctrl.updateEstado);

module.exports = router;
