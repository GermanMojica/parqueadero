// src/config/env.js
require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'staging', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  DB_HOST: z.string().min(1, 'DB_HOST es requerido'),
  DB_PORT: z.string().transform(Number).default('3306'),
  DB_USER: z.string().min(1, 'DB_USER es requerido'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD es requerido'),
  DB_NAME: z.string().min(1, 'DB_NAME es requerido'),
  DB_POOL_LIMIT: z.string().transform(Number).default('10'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET es requerido'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CORS_ORIGIN: z.string().url().or(z.string().min(1)),
  LOG_LEVEL: z.string().default('info'),
  REDIS_URL: z.string().url().optional(),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Error de validación en variables de entorno (FAIL FAST):');
  parsed.error.issues.forEach(issue => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

module.exports = { env: parsed.data };
