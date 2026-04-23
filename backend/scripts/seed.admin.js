// scripts/seed.admin.js
// Ejecutar: npm run seed:admin
// Crea/actualiza el usuario administrador con hash bcrypt real.

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const bcrypt = require('bcrypt');
const mysql  = require('mysql2/promise');

const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME
} = process.env;

async function main() {
  // 🔍 Validación básica de variables de entorno
  if (!DB_HOST || !DB_USER || !DB_NAME) {
    console.error('❌ Variables de entorno incompletas. Revisa el .env');
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT || 3306,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  const password     = 'Admin2024!';
  const passwordHash = await bcrypt.hash(password, 12);

  // 🔍 Buscar rol ADMIN
  const [roles] = await conn.execute(
    "SELECT id FROM roles WHERE nombre = 'ADMIN' LIMIT 1"
  );

  if (!roles[0]) {
    console.error('❌ Rol ADMIN no encontrado. Ejecuta primero el SQL.');
    process.exit(1);
  }

  // 🧠 Insertar o actualizar admin (compatible con MySQL 8)
  await conn.execute(
    `INSERT INTO usuarios (nombre, email, password_hash, rol_id)
     VALUES ('Administrador', 'admin@parqueadero.com', ?, ?)
     ON DUPLICATE KEY UPDATE password_hash = ?`,
    [passwordHash, roles[0].id, passwordHash]
  );

  console.log('✅ Usuario admin creado o actualizado.');
  console.log('   Email:    admin@parqueadero.com');
  console.log('   Password: Admin2024!');
  console.log('   ⚠️  Cambia la contraseña en el primer login.');

  await conn.end();
}

main().catch((err) => {
  console.error('❌ Error ejecutando seed:', err.message);
  process.exit(1);
});