// src/modules/reportes/reportes.controller.js
const service = require('./reportes.service');
const { ok }  = require('../../utils/response.helper');

async function getResumen(req, res, next) {
  try { ok(res, await service.getResumenFinanciero(req.query)); } catch (e) { next(e); }
}
async function getOcupacion(req, res, next) {
  try { ok(res, await service.getOcupacionPorHora(req.query.fecha)); } catch (e) { next(e); }
}
async function getKpisHoy(req, res, next) {
  try { ok(res, await service.getKpisHoy()); } catch (e) { next(e); }
}
async function getAlertas(req, res, next) {
  try { ok(res, await service.getAlertas(Number(req.query.horas))); } catch (e) { next(e); }
}
async function getPlacasFrecuentes(req, res, next) {
  try { ok(res, await service.getPlacasFrecuentes(Number(req.query.limite))); } catch (e) { next(e); }
}

module.exports = { getResumen, getOcupacion, getKpisHoy, getAlertas, getPlacasFrecuentes };
