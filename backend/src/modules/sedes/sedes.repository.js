// src/modules/sedes/sedes.repository.js
const { pool } = require('../../config/db');

async function findAll() {
  const [rows] = await pool.execute('SELECT * FROM sedes ORDER BY id ASC');
  return rows;
}

async function findById(id) {
  const [[row]] = await pool.execute('SELECT * FROM sedes WHERE id = ?', [id]);
  return row;
}

async function create({ nombre, direccion, ciudad, telefono, capacidad_total }) {
  const [result] = await pool.execute(
    'INSERT INTO sedes (nombre, direccion, ciudad, telefono, capacidad_total) VALUES (?, ?, ?, ?, ?)',
    [nombre, direccion, ciudad, telefono, capacidad_total || 0]
  );
  return result.insertId;
}

async function update(id, { nombre, direccion, ciudad, telefono, capacidad_total, activo }) {
  await pool.execute(
    'UPDATE sedes SET nombre=?, direccion=?, ciudad=?, telefono=?, capacidad_total=?, activo=? WHERE id=?',
    [nombre, direccion, ciudad, telefono, capacidad_total, activo ? 1 : 0, id]
  );
}

module.exports = { findAll, findById, create, update };
