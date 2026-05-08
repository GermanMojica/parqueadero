// src/modules/notificaciones/notificaciones.controller.js
const service = require('./notificaciones.service');
const { ok } = require('../../utils/response.helper');

async function suscribirPush(req, res, next) {
  try {
    const result = await service.guardarSuscripcionPush(req.user.id, req.body);
    ok(res, result);
  } catch (e) { next(e); }
}

async function obtenerPreferencias(req, res, next) {
  try {
    const prefs = await service.obtenerPreferencias(req.user.id);
    ok(res, prefs);
  } catch (e) { next(e); }
}

async function actualizarPreferencias(req, res, next) {
  try {
    const result = await service.actualizarPreferencias(req.user.id, req.body);
    ok(res, result);
  } catch (e) { next(e); }
}

module.exports = { suscribirPush, obtenerPreferencias, actualizarPreferencias };
