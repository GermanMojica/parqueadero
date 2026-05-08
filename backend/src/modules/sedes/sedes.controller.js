// src/modules/sedes/sedes.controller.js
const service = require('./sedes.service');
const { ok, created } = require('../../utils/response.helper');

async function listar(req, res, next) {
  try { ok(res, await service.listarSedes()); } catch (e) { next(e); }
}

async function obtener(req, res, next) {
  try { ok(res, await service.obtenerSede(req.params.id)); } catch (e) { next(e); }
}

async function crear(req, res, next) {
  try { created(res, await service.crearSede(req.body)); } catch (e) { next(e); }
}

async function actualizar(req, res, next) {
  try { ok(res, await service.actualizarSede(req.params.id, req.body)); } catch (e) { next(e); }
}

module.exports = { listar, obtener, crear, actualizar };
