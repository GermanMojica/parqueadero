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

// ============================================================================
// MONKEY PATCHING PARA DEBUGGING Y PREVENCIÓN DE CRASHES (REQUISITO 4, 6, 8)
// ============================================================================
function validateAndLogQuery(sql, values) {
  console.log('------ SQL EXECUTE ------');
  console.log('QUERY:', sql.replace(/\s+/g, ' ').trim());
  console.log('PARAMS:', values);
  
  if (values && Array.isArray(values)) {
    const undefinedIndex = values.findIndex(v => v === undefined);
    if (undefinedIndex !== -1) {
      const errorMsg = `[SQL_ERROR] Parametro 'undefined' detectado en la posición [${undefinedIndex}]`;
      console.error('❌', errorMsg);
      throw new Error(`${errorMsg}. No se ejecutó la query para prevenir un crash.`);
    }

    const questionMarks = (sql.match(/\?/g) || []).length;
    if (questionMarks !== values.length) {
       console.warn(`⚠️ [SQL_WARNING] La cantidad de '?' (${questionMarks}) no coincide con los parámetros (${values.length})`);
    }
  } else if (values && typeof values === 'object' && !Array.isArray(values)) {
    console.warn(`⚠️ [SQL_WARNING] Se están enviando objetos en lugar de arrays como parámetros. Esto puede causar fallos.`);
  }
  console.log('-------------------------');
}

const originalPoolExecute = pool.execute;
pool.execute = async function (sql, values) {
  validateAndLogQuery(sql, values);
  return originalPoolExecute.apply(this, arguments);
};

const originalGetConnection = pool.getConnection;
pool.getConnection = async function () {
  const conn = await originalGetConnection.call(this);
  if (!conn._isPatched) {
    const origConnExecute = conn.execute;
    conn.execute = async function (sql, values) {
      validateAndLogQuery(sql, values);
      return origConnExecute.apply(this, arguments);
    };
    conn._isPatched = true;
  }
  return conn;
};

module.exports = { pool, withTransaction };
