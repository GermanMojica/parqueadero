USE parqueadero_db;

-- Tabla configuración (OK)
CREATE TABLE IF NOT EXISTS configuracion_parqueadero (
  id           TINYINT UNSIGNED NOT NULL DEFAULT 1,
  nombre       VARCHAR(100)     NOT NULL DEFAULT 'Mi Parqueadero',
  direccion    VARCHAR(200)     NULL,
  telefono     VARCHAR(20)      NULL,
  nit          VARCHAR(30)      NULL,
  logo_url     VARCHAR(300)     NULL,
  moneda       VARCHAR(10)      NOT NULL DEFAULT 'COP',
  ciudad       VARCHAR(80)      NOT NULL DEFAULT 'Bogotá',
  updated_at   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO configuracion_parqueadero (id, nombre, ciudad)
VALUES (1, 'Parqueadero Central', 'Bogotá');

-- 🔥 CORRECCIÓN: columnas SIN IF NOT EXISTS
ALTER TABLE espacios
  ADD COLUMN fila      TINYINT UNSIGNED NULL,
  ADD COLUMN columna   TINYINT UNSIGNED NULL,
  ADD COLUMN zona      VARCHAR(30)      NULL,
  ADD COLUMN orientacion ENUM('NORMAL','INVERTIDO') NOT NULL DEFAULT 'NORMAL';

-- SEDAN
UPDATE espacios e
JOIN (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) - 1 AS rn
  FROM espacios WHERE tipo_vehiculo_id = (SELECT id FROM tipos_vehiculo WHERE nombre='SEDAN')
) r ON e.id = r.id
SET e.fila    = FLOOR(r.rn / 5),
    e.columna = r.rn % 5,
    e.zona    = 'Zona A - Sedanes'
WHERE e.tipo_vehiculo_id = (SELECT id FROM tipos_vehiculo WHERE nombre='SEDAN');

-- CAMIONETA
UPDATE espacios e
JOIN (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) - 1 AS rn
  FROM espacios WHERE tipo_vehiculo_id = (SELECT id FROM tipos_vehiculo WHERE nombre='CAMIONETA')
) r ON e.id = r.id
SET e.fila    = 4 + FLOOR(r.rn / 5),
    e.columna = r.rn % 5,
    e.zona    = 'Zona B - Camionetas'
WHERE e.tipo_vehiculo_id = (SELECT id FROM tipos_vehiculo WHERE nombre='CAMIONETA');

-- MOTO
UPDATE espacios e
JOIN (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) - 1 AS rn
  FROM espacios WHERE tipo_vehiculo_id = (SELECT id FROM tipos_vehiculo WHERE nombre='MOTO')
) r ON e.id = r.id
SET e.fila    = 8 + FLOOR(r.rn / 5),
    e.columna = r.rn % 5,
    e.zona    = 'Zona C - Motos'
WHERE e.tipo_vehiculo_id = (SELECT id FROM tipos_vehiculo WHERE nombre='MOTO');

-- 🔥 CORRECCIÓN: índice sin IF NOT EXISTS
CREATE INDEX idx_espacios_zona ON espacios (zona, estado);