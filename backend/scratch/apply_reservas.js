const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

async function applyMigration() {
  try {
    const sqlPath = path.join(__dirname, '../../parqueadero_reservas.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolon, but be careful with ENUMs and comments
    // A simple split might work if there are no semicolons inside strings
    const statements = sql
      .replace(/--.*$/gm, '') // Remove comments
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('USE')); // Skip USE as it's handled by pool config

    console.log(`Executing ${statements.length} statements...`);

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      await pool.query(statement);
    }

    console.log('✅ Migration applied successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();
