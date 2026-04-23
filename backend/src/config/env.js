// src/config/env.js
// Valida que todas las variables críticas existan al arrancar.
// Si falta una, el proceso falla de forma explícita con mensaje claro.
require('dotenv').config();

const required = [
  'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME',
  'JWT_SECRET', 'CORS_ORIGIN',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`❌ Variables de entorno faltantes: ${missing.join(', ')}`);
  process.exit(1);
}

const env = {
  NODE_ENV:      process.env.NODE_ENV    || 'development',
  PORT:          Number(process.env.PORT) || 3000,

  DB_HOST:       process.env.DB_HOST,
  DB_PORT:       Number(process.env.DB_PORT) || 3306,
  DB_USER:       process.env.DB_USER,
  DB_PASSWORD:   process.env.DB_PASSWORD,
  DB_NAME:       process.env.DB_NAME,
  DB_POOL_LIMIT: Number(process.env.DB_POOL_LIMIT) || 10,

  JWT_SECRET:    process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',

  CORS_ORIGIN:   process.env.CORS_ORIGIN,
  LOG_LEVEL:     process.env.LOG_LEVEL || 'info',
};

module.exports = { env };
