// src/modules/sedes/sedes.service.js
const repo = require('./sedes.repository');
const AppError = require('../../utils/AppError');

async function listarSedes() {
  return repo.findAll();
}

async function obtenerSede(id) {
  const sede = await repo.findById(id);
  if (!sede) throw new AppError('Sede no encontrada', 404);
  return sede;
}

async function crearSede(data) {
  const insertId = await repo.create(data);
  return obtenerSede(insertId);
}

async function actualizarSede(id, data) {
  await obtenerSede(id);
  await repo.update(id, data);
  return obtenerSede(id);
}

module.exports = { listarSedes, obtenerSede, crearSede, actualizarSede };
