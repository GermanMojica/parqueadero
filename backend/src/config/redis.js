// src/config/redis.js
const Redis = require('ioredis');
const { env } = require('./env');
const logger = require('../utils/logger');

// Para entorno de desarrollo sin Redis configurado, hacemos un mock básico
// o instanciamos si tenemos REDIS_URL.
let redisClient;

if (env.REDIS_URL || process.env.REDIS_URL) {
  redisClient = new Redis(env.REDIS_URL || process.env.REDIS_URL);
  
  redisClient.on('connect', () => {
    logger.info('✅ Conectado a Redis Cache');
  });

  redisClient.on('error', (err) => {
    logger.error('❌ Error de Redis', { error: err.message });
  });
} else {
  logger.warn('⚠️ REDIS_URL no definido. Usando mock en memoria para cache.');
  // Mock en memoria muy básico para que no rompa si no tienen redis server
  const memoryCache = new Map();
  redisClient = {
    get: async (key) => memoryCache.get(key),
    setex: async (key, seconds, value) => {
      memoryCache.set(key, value);
      setTimeout(() => memoryCache.delete(key), seconds * 1000);
    },
    del: async (key) => memoryCache.delete(key),
    keys: async (pattern) => {
      // Mock básico, solo si el patrón termina en * o es exacto
      const keys = [];
      const prefix = pattern.replace('*', '');
      for (const k of memoryCache.keys()) {
        if (k.startsWith(prefix) || pattern === '*') keys.push(k);
      }
      return keys;
    }
  };
}

module.exports = redisClient;
