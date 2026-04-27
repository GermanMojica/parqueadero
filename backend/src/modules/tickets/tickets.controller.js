// src/modules/tickets/tickets.controller.js
const service = require('./tickets.service');
const { ok }  = require('../../utils/response.helper');

async function getByRegistro(req, res, next) {
  try { ok(res, await service.getByRegistro(Number(req.params.registroId))); } catch (e) { next(e); }
}

async function getByCodigo(req, res, next) {
  try { ok(res, await service.getByCodigo(req.params.codigo)); } catch (e) { next(e); }
}

async function getQR(req, res, next) {
  try {
    ok(res, await service.getQR(Number(req.params.registroId), req.query.tipo || 'ENTRADA'));
  } catch (e) { next(e); }
}

module.exports = { getByRegistro, getByCodigo, getQR };

