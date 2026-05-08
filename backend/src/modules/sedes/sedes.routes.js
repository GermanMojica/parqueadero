// src/modules/sedes/sedes.routes.js
const { Router } = require('express');
const ctrl = require('./sedes.controller');
const auth = require('../../middlewares/auth.middleware');
const { requireRol: roles } = require('../../middlewares/roles.middleware');

const router = Router();

// Todas las rutas requieren auth
router.use(auth);

// Listar sedes (todos pueden ver, o al menos los admin/superadmin, y los operadores la lista para el select)
router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);

// Solo ADMIN o SUPERADMIN pueden crear/editar
router.post('/', roles('ADMIN', 'SUPERADMIN'), ctrl.crear);
router.put('/:id', roles('ADMIN', 'SUPERADMIN'), ctrl.actualizar);

module.exports = router;
