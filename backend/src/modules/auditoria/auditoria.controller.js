// src/modules/auditoria/auditoria.controller.js
const repo = require('./auditoria.repository');
const { ok } = require('../../utils/response.helper');

async function findRecent(req, res, next) {
  try {
    const { limit, usuarioId, accion } = req.query;
    ok(res, await repo.findRecent({ limit: Number(limit) || 50, usuarioId, accion }));
  } catch (e) { next(e); }
}

module.exports = { findRecent };
