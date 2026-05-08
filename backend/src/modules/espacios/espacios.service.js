// src/modules/espacios/espacios.service.js
const repo = require('./espacios.repository');

async function getAll(sedeId)     { return repo.findAll(sedeId); }
async function getResumen(sedeId) { return repo.countDisponibles(sedeId); }

async function updateEstado(id, estado, sedeId) {
  if (!['DISPONIBLE', 'MANTENIMIENTO'].includes(estado)) {
    throw new Error('Estado inválido para actualización manual');
  }
  await repo.setEstado(id, estado, sedeId);
  return { id, estado };
}

module.exports = { getAll, getResumen, updateEstado };
