// src/modules/usuarios/usuarios.routes.js
const { Router }     = require('express');
const ctrl           = require('./usuarios.controller');
const auth           = require('../../middlewares/auth.middleware');
const { requireRol } = require('../../middlewares/roles.middleware');
const { validate }   = require('../../middlewares/validate.middleware');

const router = Router();

// Todos los endpoints de usuarios requieren auth + rol ADMIN
router.use(auth, requireRol('ADMIN'));

router.get('/',                                          ctrl.getAll);
router.get('/:id',                                       ctrl.getById);
router.post('/',    validate(ctrl.createSchema),         ctrl.create);
router.put('/:id',  validate(ctrl.updateSchema),         ctrl.update);
router.delete('/:id',                                    ctrl.remove);
router.patch('/:id/password', validate(ctrl.passwordSchema), ctrl.cambiarPassword);

module.exports = router;
