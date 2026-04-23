// src/config/db.js
// Pool de conexiones mysql2/promise.
// Exporta `pool` para queries normales y `withTransaction` para operaciones atómicas.
const mysql  = require('mysql2/promise');
const { env } = require('./env');
const logger = require('../utils/logger');

const pool = mysql.createPool({
  host:               env.DB_HOST,
  port:               env.DB_PORT,
  user:               env.DB_USER,
  password:           env.DB_PASSWORD,
  database:           env.DB_NAME,
  connectionLimit:    env.DB_POOL_LIMIT,
  waitForConnections: true,
  queueLimit:         0,
  timezone:           'Z',        // Almacena en UTC
  decimalNumbers:     true,       // DECIMAL columns como números JS, no strings
});

// Verificar conexión al iniciar
pool.getConnection()
  .then((conn) => {
    logger.info('✅ Conexión a MySQL establecida');
    conn.release();
  })
  .catch((err) => {
    logger.error('❌ Error al conectar con MySQL', { error: err.message });
    process.exit(1);
  });

/**
 * Ejecuta una función dentro de una transacción MySQL.
 * Si la función lanza, hace ROLLBACK automático.
 * Si termina bien, hace COMMIT.
 *
 * @param {(conn: import('mysql2/promise').PoolConnection) => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function withTransaction(fn) {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, withTransaction };
