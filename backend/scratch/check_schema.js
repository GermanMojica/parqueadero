const { pool } = require('../src/config/db');

async function checkSchema() {
  const tables = ['registros', 'tarifas', 'espacios', 'usuarios', 'reservas'];
  for (const table of tables) {
    try {
      const [rows] = await pool.query(`DESCRIBE ${table}`);
      console.log(`Table: ${table}`);
      console.log(rows.map(r => `${r.Field} (${r.Type})`).join(', '));
    } catch (err) {
      console.error(`Error describing ${table}: ${err.message}`);
    }
  }
  process.exit(0);
}

checkSchema();
