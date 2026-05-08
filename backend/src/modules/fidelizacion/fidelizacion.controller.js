// src/modules/fidelizacion/fidelizacion.controller.js
const service = require('./fidelizacion.service');
const { ok, created } = require('../../utils/response.helper');

async function getReglas(req, res, next) {
  try { ok(res, await service.getReglas()); } catch (e) { next(e); }
}

async function crearTarjeta(req, res, next) {
  try { created(res, await service.crearTarjeta(req.body.placa)); } catch (e) { next(e); }
}

async function consultarTarjeta(req, res, next) {
  try { ok(res, await service.consultarPorCodigoOPlaca(req.params.idOrPlaca)); } catch (e) { next(e); }
}

async function canjearPuntos(req, res, next) {
  try { 
    const { placa, puntos, registroId } = req.body;
    ok(res, await service.aplicarCanje(placa, puntos, registroId)); 
  } catch (e) { next(e); }
}

async function getDashboard(req, res, next) {
  try { ok(res, await service.getDashboardData()); } catch (e) { next(e); }
}

module.exports = {
  getReglas,
  crearTarjeta,
  consultarTarjeta,
  canjearPuntos,
  getDashboard
};
