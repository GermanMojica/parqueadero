require('dotenv').config();
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function resetPassword() {
  const email = process.argv[2] || 'admin@parqueadero.com';
  const newPassword = process.argv[3] || 'admin123';

  console.log(`Intentando restablecer la contraseña de: ${email}`);

  let connection;
  try {
    // Usamos las credenciales desde el archivo .env de tu backend
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('✅ Conexión a la base de datos establecida.');

    // Verificar si el usuario existe
    const [rows] = await connection.execute('SELECT id, email FROM usuarios WHERE email = ?', [email]);
    
    if (rows.length === 0) {
      console.error(`❌ Error: No se encontró ningún usuario con el correo '${email}'`);
      console.log('👉 Uso alternativo: node reset-password.js <correo> <nueva_contraseña>');
      return;
    }

    // Hashear la nueva contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar en la base de datos
    await connection.execute(
      'UPDATE usuarios SET password_hash = ? WHERE email = ?',
      [hashedPassword, email]
    );

    console.log(`🎉 ¡Éxito! La contraseña de ${email} ha sido actualizada a: ${newPassword}`);
    console.log('Ya puedes iniciar sesión en el sistema.');

  } catch (err) {
    console.error('❌ Error al restablecer la contraseña:', err.message);
  } finally {
    if (connection) {
      await connection.end();
    }
    process.exit(0);
  }
}

resetPassword();
