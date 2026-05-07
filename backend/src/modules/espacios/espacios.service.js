// src/modules/espacios/espacios.service.js
const repo = require('./espacios.repository');

async function getAll()     { return repo.findAll(); }
async function getResumen() { return repo.countDisponibles(); }

async function updateEstado(id, estado) {
  if (!['DISPONIBLE', 'MANTENIMIENTO'].includes(estado)) {
    throw new Error('Estado inválido para actualización manual');
  }
  await repo.setEstado(id, estado);
  return { id, estado };
}

module.exports = { getAll, getResumen, updateEstado };
