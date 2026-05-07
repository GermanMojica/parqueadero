// src/modules/espacios/espacios.controller.js
const service = require('./espacios.service');
const { ok }  = require('../../utils/response.helper');

async function getAll(req, res, next) {
  try { ok(res, await service.getAll()); } catch (e) { next(e); }
}

async function getResumen(req, res, next) {
  try { ok(res, await service.getResumen()); } catch (e) { next(e); }
}

async function updateEstado(req, res, next) {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    ok(res, await service.updateEstado(id, estado));
  } catch (e) { next(e); }
}

module.exports = { getAll, getResumen, updateEstado };
