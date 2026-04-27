// scripts/seed.admin.js
// Ejecutar una sola vez: node scripts/seed.admin.js
// Crea el usuario administrador con hash bcrypt real.

require('dotenv').config();
const bcrypt = require('bcrypt');
const mysql  = require('mysql2/promise');

const {
  DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
} = process.env;

async function main() {
  const conn = await mysql.createConnection({
    host: DB_HOST, port: DB_PORT || 3306,
    user: DB_USER, password: DB_PASSWORD, database: DB_NAME,
  });

  const password     = 'Admin2024!';
  const passwordHash = await bcrypt.hash(password, 12);

  const [roles] = await conn.execute("SELECT id FROM roles WHERE nombre = 'ADMIN' LIMIT 1");
  if (!roles[0]) { console.error('❌ Rol ADMIN no encontrado. Ejecuta primero el SQL.'); process.exit(1); }

  await conn.execute(
    `INSERT INTO usuarios (nombre, email, password_hash, rol_id)
     VALUES ('Administrador', 'admin@parqueadero.com', ?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [passwordHash, roles[0].id],
  );

  console.log('✅ Usuario admin creado.');
  console.log('   Email:    admin@parqueadero.com');
  console.log('   Password: Admin2024!');
  console.log('   ⚠️  Cambia la contraseña en el primer login.');

  await conn.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
