-- =============================================================================
-- MIGRACIÓN: Múltiples Sedes (Parqueaderos)
-- =============================================================================

USE parqueadero_db;

-- Desactivar checks temporalmente
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Tabla de Sedes
CREATE TABLE IF NOT EXISTS sedes (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre          VARCHAR(100) NOT NULL,
  direccion       VARCHAR(150) NOT NULL,
  ciudad          VARCHAR(100) NOT NULL,
  telefono        VARCHAR(20)  NULL,
  capacidad_total INT UNSIGNED NOT NULL DEFAULT 0,
  activo          TINYINT(1)   NOT NULL DEFAULT 1,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar la sede principal por defecto (para retrocompatibilidad)
INSERT IGNORE INTO sedes (id, nombre, direccion, ciudad, capacidad_total, activo) 
VALUES (1, 'Sede Principal (Default)', 'Dirección Central', 'Ciudad Principal', 45, 1);

-- 2. Añadir sede_id a las tablas existentes
-- ESPACIOS
ALTER TABLE espacios ADD COLUMN sede_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id;
ALTER TABLE espacios ADD CONSTRAINT fk_espacios_sede FOREIGN KEY (sede_id) REFERENCES sedes(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- REGISTROS
ALTER TABLE registros ADD COLUMN sede_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id;
ALTER TABLE registros ADD CONSTRAINT fk_registros_sede FOREIGN KEY (sede_id) REFERENCES sedes(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- TARIFAS
ALTER TABLE tarifas ADD COLUMN sede_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id;
ALTER TABLE tarifas ADD CONSTRAINT fk_tarifas_sede FOREIGN KEY (sede_id) REFERENCES sedes(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- USUARIOS (sede principal o asignación directa)
ALTER TABLE usuarios ADD COLUMN sede_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id;
ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_sede FOREIGN KEY (sede_id) REFERENCES sedes(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- RESERVAS (opcional, si aplica)
ALTER TABLE reservas ADD COLUMN sede_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id;
ALTER TABLE reservas ADD CONSTRAINT fk_reservas_sede FOREIGN KEY (sede_id) REFERENCES sedes(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- 3. Tabla de Relación N:M (usuarios <-> sedes)
-- Esto permite que un operador trabaje en varias sedes
CREATE TABLE IF NOT EXISTS usuarios_sedes (
  usuario_id INT UNSIGNED NOT NULL,
  sede_id    INT UNSIGNED NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (usuario_id, sede_id),
  CONSTRAINT fk_us_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_us_sede    FOREIGN KEY (sede_id) REFERENCES sedes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar relaciones iniciales para los usuarios existentes
INSERT IGNORE INTO usuarios_sedes (usuario_id, sede_id)
SELECT id, 1 FROM usuarios;

-- Reactivar checks
SET FOREIGN_KEY_CHECKS = 1;
