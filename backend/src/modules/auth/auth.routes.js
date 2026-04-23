// src/modules/auth/auth.routes.js
const { Router }  = require('express');
const controller  = require('./auth.controller');
// const { validate } = require('../../middlewares/validate.middleware'); // Comenta esto

const router = Router();

// Quita el middleware validate(...) de la ruta
router.post('/login', controller.login); 

module.exports = router;