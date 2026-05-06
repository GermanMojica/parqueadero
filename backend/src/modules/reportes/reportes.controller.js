// src/modules/reportes/reportes.controller.js
const service = require('./reportes.service');
const { ok }  = require('../../utils/response.helper');

async function getResumen(req, res, next) {
  try { ok(res, await service.getResumenFinanciero(req.query)); } catch (e) { next(e); }
}
async function getOcupacion(req, res, next) {
  try { ok(res, await service.getOcupacionPorHora(req.query.fecha)); } catch (e) { next(e); }
}
async function getPorDia(req, res, next) {
  try { ok(res, await service.getPorDia(req.query)); } catch (e) { next(e); }
}
async function getHorasPico(req, res, next) {
  try { ok(res, await service.getHorasPico()); } catch (e) { next(e); }
}
async function getPorTipo(req, res, next) {
  try { ok(res, await service.getPorTipo()); } catch (e) { next(e); }
}
async function getResumenPeriodo(req, res, next) {
  try { ok(res, await service.getResumenPeriodo(req.query)); } catch (e) { next(e); }
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

module.exports = { 
  getResumen, getOcupacion, getKpisHoy, getAlertas, getPlacasFrecuentes,
  getPorDia, getHorasPico, getPorTipo, getResumenPeriodo 
};
