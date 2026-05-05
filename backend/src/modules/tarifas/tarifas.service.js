// src/modules/tarifas/tarifas.service.js
const repo     = require('./tarifas.repository');
const { pool } = require('../../config/db');
const AppError = require('../../utils/AppError');

async function getAll() { return repo.findAll(); }

async function create({ tipoVehiculoId, precioHora, fraccionMinutos, vigenteDesde }) {
  // Verificar que el tipo de vehículo exista
  const [tipos] = await pool.execute(
    'SELECT id FROM tipos_vehiculo WHERE id = ?', [tipoVehiculoId],
  );
  if (!tipos[0]) throw new AppError('Tipo de vehículo no encontrado', 404);

  if (precioHora <= 0) throw new AppError('El precio por hora debe ser mayor a cero', 400);
  if (![15, 30, 60].includes(fraccionMinutos)) {
    throw new AppError('La fracción mínima debe ser 15, 30 o 60 minutos', 400);
  }

  const id = await repo.create({ tipoVehiculoId, precioHora, fraccionMinutos, vigenteDesdе: vigenteDesde });
  return { id, message: 'Tarifa creada correctamente' };
}

async function update(id, { precioHora, fraccionMinutos }) {
  const [rows] = await pool.execute('SELECT id, activo FROM tarifas WHERE id = ?', [id]);
  if (!rows[0]) throw new AppError('Tarifa no encontrada', 404);
  if (!rows[0].activo) throw new AppError('No se puede editar una tarifa inactiva', 409);

  if (precioHora <= 0) throw new AppError('El precio por hora debe ser mayor a cero', 400);
  if (![15, 30, 60].includes(fraccionMinutos)) {
    throw new AppError('La fracción mínima debe ser 15, 30 o 60 minutos', 400);
  }

  await pool.execute(
    'UPDATE tarifas SET precio_hora = ?, fraccion_minutos = ? WHERE id = ?',
    [precioHora, fraccionMinutos, id],
  );
  return { message: 'Tarifa actualizada correctamente' };
}

async function deactivate(id) {
  // No se puede desactivar si es la única tarifa activa del tipo
  const [rows] = await pool.execute(
    `SELECT t.tipo_vehiculo_id,
            COUNT(*) AS activas
     FROM tarifas t
     WHERE t.tipo_vehiculo_id = (SELECT tipo_vehiculo_id FROM tarifas WHERE id = ?)
       AND t.activo = 1`,
    [id],
  );
  if (rows[0]?.activas <= 1) {
    throw new AppError('No se puede desactivar la única tarifa activa de este tipo de vehículo', 409);
  }
  await repo.deactivate(id);
  return { message: 'Tarifa desactivada' };
}

module.exports = { getAll, create, update, deactivate };
