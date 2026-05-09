const { pool } = require('./src/config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const filename = process.argv[2] || 'parqueadero_sedes.sql';
  console.log(`Iniciando migración de ${filename} (sentencia por sentencia)...`);
  const sqlPath = path.join(__dirname, '..', filename);
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Regex para separar sentencias ignorando comentarios y manejando bloques correctamente
  const statements = sql
    .replace(/\/\*[\s\S]*?\*\/|--.*?\n/g, '') // Eliminar comentarios
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.toLowerCase().startsWith('use'));

  const conn = await pool.getConnection();
  try {
    for (const statement of statements) {
      console.log(`Ejecutando: ${statement.substring(0, 100)}...`);
      try {
        // Usamos query en lugar de execute para ALTER TABLE y sentencias complejas
        await conn.query(statement);
        console.log('  ✅ OK');
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_TABLE_EXISTS_ERROR' || e.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.warn(`  ⚠️ Ignorado: ${e.message}`);
        } else {
          console.error(`  ❌ Error: ${e.message}`);
          // Decidimos si continuar o no. Para migraciones de esquema, a veces es mejor continuar con el siguiente si falla un CONSTRAINT
        }
      }
    }
    console.log('✅ Proceso de migración finalizado');
  } catch (err) {
    console.error('❌ Error fatal:', err.message);
  } finally {
    conn.release();
    process.exit(0);
  }
}

runMigration();
