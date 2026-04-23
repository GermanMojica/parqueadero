-- =============================================================================
-- SISTEMA DE CONTROL DE PARQUEADERO
-- Base de datos: parqueadero_db
-- Motor: MySQL 8.0+
-- Normalización: 3FN
-- =============================================================================

-- Crear y seleccionar base de datos
CREATE DATABASE IF NOT EXISTS parqueadero_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE parqueadero_db;

-- Desactivar checks temporalmente para crear tablas con FKs
SET FOREIGN_KEY_CHECKS = 0;


-- =============================================================================
-- TABLA: roles
-- Catálogo de roles del sistema. Valores: ADMIN, OPERADOR
-- =============================================================================
CREATE TABLE roles (
  id          TINYINT UNSIGNED    NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(30)         NOT NULL,
  descripcion VARCHAR(150)            NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_nombre (nombre)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Catálogo de roles del sistema';


-- =============================================================================
-- TABLA: usuarios
-- Operadores y administradores con acceso al sistema
-- =============================================================================
CREATE TABLE usuarios (
  id             INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  nombre         VARCHAR(100)     NOT NULL,
  email          VARCHAR(150)     NOT NULL,
  password_hash  VARCHAR(255)     NOT NULL,
  rol_id         TINYINT UNSIGNED NOT NULL,
  activo         TINYINT(1)       NOT NULL DEFAULT 1,
  created_at     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP
                                           ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email),
  INDEX idx_usuarios_rol (rol_id),

  CONSTRAINT fk_usuarios_rol
    FOREIGN KEY (rol_id)
    REFERENCES roles (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Usuarios del sistema: operadores y administradores';


-- =============================================================================
-- TABLA: tipos_vehiculo
-- Catálogo de tipos de vehículo con su capacidad total de cupos
-- =============================================================================
CREATE TABLE tipos_vehiculo (
  id               TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre           VARCHAR(50)      NOT NULL,
  descripcion      VARCHAR(150)         NULL,
  capacidad_total  TINYINT UNSIGNED NOT NULL COMMENT 'Total de cupos físicos para este tipo',

  PRIMARY KEY (id),
  UNIQUE KEY uq_tipos_vehiculo_nombre (nombre)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Tipos de vehículo permitidos y su capacidad total de espacios';


-- =============================================================================
-- TABLA: espacios
-- Representación física de cada cupo del parqueadero
-- Estado: DISPONIBLE | OCUPADO | MANTENIMIENTO
-- =============================================================================
CREATE TABLE espacios (
  id                INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  codigo            VARCHAR(10)      NOT NULL COMMENT 'Ej: A-01, M-15',
  tipo_vehiculo_id  TINYINT UNSIGNED NOT NULL,
  estado            ENUM(
                      'DISPONIBLE',
                      'OCUPADO',
                      'MANTENIMIENTO'
                    )                NOT NULL DEFAULT 'DISPONIBLE',
  created_at        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_espacios_codigo (codigo),
  INDEX idx_espacios_tipo_estado (tipo_vehiculo_id, estado),

  CONSTRAINT fk_espacios_tipo
    FOREIGN KEY (tipo_vehiculo_id)
    REFERENCES tipos_vehiculo (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Espacios físicos del parqueadero, uno por cupo real';


-- =============================================================================
-- TABLA: tarifas
-- Reglas de precio por tipo de vehículo. Soporte de versioning con vigente_desde
-- =============================================================================
CREATE TABLE tarifas (
  id                 INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  tipo_vehiculo_id   TINYINT UNSIGNED NOT NULL,
  precio_hora        DECIMAL(10,2)    NOT NULL COMMENT 'Precio por hora completa',
  fraccion_minutos   TINYINT UNSIGNED NOT NULL DEFAULT 15
                     COMMENT 'Mínimo cobrable en minutos. Ej: 15 = cobra en bloques de 15 min',
  vigente_desde      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP
                     COMMENT 'A partir de cuándo aplica esta tarifa',
  activo             TINYINT(1)       NOT NULL DEFAULT 1,
  created_at         DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_tarifas_tipo_vigencia (tipo_vehiculo_id, vigente_desde, activo),

  CONSTRAINT fk_tarifas_tipo
    FOREIGN KEY (tipo_vehiculo_id)
    REFERENCES tipos_vehiculo (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Tarifas por tipo de vehículo con historial de versiones';


-- =============================================================================
-- TABLA: registros
-- Evento transaccional central: entrada y salida de cada vehículo
-- Estado: ABIERTO | CERRADO | ANULADO
-- =============================================================================
CREATE TABLE registros (
  id                    INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  espacio_id            INT UNSIGNED      NOT NULL,
  placa                 VARCHAR(10)       NOT NULL COMMENT 'Placa del vehículo',
  tipo_vehiculo_id      TINYINT UNSIGNED  NOT NULL,
  usuario_entrada_id    INT UNSIGNED      NOT NULL COMMENT 'Operador que registró la entrada',
  usuario_salida_id     INT UNSIGNED          NULL COMMENT 'Operador que registró la salida (NULL si aún dentro)',
  hora_entrada          DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  hora_salida           DATETIME              NULL,
  minutos_total         INT UNSIGNED          NULL COMMENT 'Duración total en minutos al cerrar',
  tarifa_id             INT UNSIGNED          NULL COMMENT 'FK a la tarifa usada en el cierre',
  tarifa_valor_aplicado DECIMAL(10,2)         NULL COMMENT 'Snapshot del precio/hora al momento del cierre',
  total_cobrado         DECIMAL(10,2)         NULL COMMENT 'Total final calculado',
  estado                ENUM(
                          'ABIERTO',
                          'CERRADO',
                          'ANULADO'
                        )                 NOT NULL DEFAULT 'ABIERTO',
  observaciones         TEXT                  NULL COMMENT 'Notas del operador, anulaciones, etc.',
  created_at            DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  -- Índices para queries frecuentes
  INDEX idx_registros_placa        (placa),
  INDEX idx_registros_estado       (estado),
  INDEX idx_registros_hora_entrada (hora_entrada),
  INDEX idx_registros_espacio      (espacio_id),
  INDEX idx_registros_tipo         (tipo_vehiculo_id),

  -- Previene placa duplicada con registro abierto (segunda capa de protección)
  -- La lógica primaria vive en el service, pero la DB es la red de seguridad final
  -- Nota: MySQL no soporta partial indexes, se maneja en lógica + query de validación

  CONSTRAINT fk_registros_espacio
    FOREIGN KEY (espacio_id)
    REFERENCES espacios (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_registros_tipo
    FOREIGN KEY (tipo_vehiculo_id)
    REFERENCES tipos_vehiculo (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_registros_usuario_entrada
    FOREIGN KEY (usuario_entrada_id)
    REFERENCES usuarios (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_registros_usuario_salida
    FOREIGN KEY (usuario_salida_id)
    REFERENCES usuarios (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_registros_tarifa
    FOREIGN KEY (tarifa_id)
    REFERENCES tarifas (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Registro transaccional de entradas y salidas de vehículos';


-- =============================================================================
-- TABLA: tickets
-- Documento generado por cada evento de entrada o salida
-- Separado de registros: el registro es la transacción, el ticket es el documento
-- =============================================================================
CREATE TABLE tickets (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  registro_id    INT UNSIGNED  NOT NULL,
  codigo_ticket  VARCHAR(20)   NOT NULL COMMENT 'Código único imprimible. Ej: TK-20240101-00042',
  tipo           ENUM(
                   'ENTRADA',
                   'SALIDA'
                 )              NOT NULL,
  datos_json     JSON           NOT NULL COMMENT 'Snapshot completo del ticket al momento de generación',
  generado_at    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_tickets_registro_tipo (registro_id, tipo),
  UNIQUE KEY uq_tickets_codigo (codigo_ticket),
  INDEX idx_tickets_registro (registro_id),

  CONSTRAINT fk_tickets_registro
    FOREIGN KEY (registro_id)
    REFERENCES registros (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Tickets generados para entrada y salida. Inmutables una vez creados';


-- Reactivar checks
SET FOREIGN_KEY_CHECKS = 1;


-- =============================================================================
-- DATOS INICIALES (SEED)
-- =============================================================================

-- Roles del sistema
INSERT INTO roles (nombre, descripcion) VALUES
  ('ADMIN',    'Acceso total: configuración, reportes, usuarios y operación'),
  ('OPERADOR', 'Acceso operativo: registrar entradas, salidas y consultar disponibilidad');

-- Tipos de vehículo con su capacidad real
INSERT INTO tipos_vehiculo (nombre, descripcion, capacidad_total) VALUES
  ('SEDAN',     'Automóvil sedán estándar', 15),
  ('CAMIONETA', 'Camioneta o SUV',          15),
  ('MOTO',      'Motocicleta',              15);

-- Espacios para SEDAN (A-01 a A-15)
INSERT INTO espacios (codigo, tipo_vehiculo_id, estado)
SELECT
  CONCAT('A-', LPAD(n, 2, '0')),
  (SELECT id FROM tipos_vehiculo WHERE nombre = 'SEDAN'),
  'DISPONIBLE'
FROM (
  SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
  UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
  UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15
) nums;

-- Espacios para CAMIONETA (C-01 a C-15)
INSERT INTO espacios (codigo, tipo_vehiculo_id, estado)
SELECT
  CONCAT('C-', LPAD(n, 2, '0')),
  (SELECT id FROM tipos_vehiculo WHERE nombre = 'CAMIONETA'),
  'DISPONIBLE'
FROM (
  SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
  UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
  UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15
) nums;

-- Espacios para MOTO (M-01 a M-15)
INSERT INTO espacios (codigo, tipo_vehiculo_id, estado)
SELECT
  CONCAT('M-', LPAD(n, 2, '0')),
  (SELECT id FROM tipos_vehiculo WHERE nombre = 'MOTO'),
  'DISPONIBLE'
FROM (
  SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
  UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
  UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15
) nums;

-- Tarifas iniciales (precio_hora en la moneda local, fraccion_minutos = 15)
INSERT INTO tarifas (tipo_vehiculo_id, precio_hora, fraccion_minutos, activo)
SELECT id, 3000.00, 15, 1 FROM tipos_vehiculo WHERE nombre = 'SEDAN';

INSERT INTO tarifas (tipo_vehiculo_id, precio_hora, fraccion_minutos, activo)
SELECT id, 4000.00, 15, 1 FROM tipos_vehiculo WHERE nombre = 'CAMIONETA';

INSERT INTO tarifas (tipo_vehiculo_id, precio_hora, fraccion_minutos, activo)
SELECT id, 2000.00, 15, 1 FROM tipos_vehiculo WHERE nombre = 'MOTO';

-- Usuario administrador inicial
-- Contraseña: Admin2024! (este hash debe regenerarse con bcrypt en la app)
-- IMPORTANTE: Cambiar en primer login. Este hash es solo de ejemplo estructural.
INSERT INTO usuarios (nombre, email, password_hash, rol_id) VALUES (
  'Administrador',
  'admin@parqueadero.com',
  '$2b$12$PLACEHOLDER_REEMPLAZAR_CON_HASH_REAL_DE_BCRYPT',
  (SELECT id FROM roles WHERE nombre = 'ADMIN')
);


-- =============================================================================
-- VISTAS ÚTILES
-- =============================================================================

-- Vista: disponibilidad actual por tipo de vehículo
CREATE OR REPLACE VIEW v_disponibilidad AS
SELECT
  tv.id                                       AS tipo_id,
  tv.nombre                                   AS tipo,
  tv.capacidad_total,
  COUNT(CASE WHEN e.estado = 'DISPONIBLE' THEN 1 END) AS disponibles,
  COUNT(CASE WHEN e.estado = 'OCUPADO'    THEN 1 END) AS ocupados,
  COUNT(CASE WHEN e.estado = 'MANTENIMIENTO' THEN 1 END) AS en_mantenimiento,
  ROUND(
    COUNT(CASE WHEN e.estado = 'OCUPADO' THEN 1 END) * 100.0 / tv.capacidad_total,
    1
  )                                           AS porcentaje_ocupacion
FROM tipos_vehiculo tv
LEFT JOIN espacios e ON e.tipo_vehiculo_id = tv.id
GROUP BY tv.id, tv.nombre, tv.capacidad_total;


-- Vista: registros abiertos con tiempo transcurrido
CREATE OR REPLACE VIEW v_registros_activos AS
SELECT
  r.id                                                  AS registro_id,
  r.placa,
  tv.nombre                                             AS tipo_vehiculo,
  e.codigo                                              AS espacio,
  r.hora_entrada,
  TIMESTAMPDIFF(MINUTE, r.hora_entrada, NOW())         AS minutos_dentro,
  u.nombre                                              AS operador_entrada,
  t.precio_hora                                         AS tarifa_hora_vigente
FROM registros r
JOIN espacios      e  ON e.id  = r.espacio_id
JOIN tipos_vehiculo tv ON tv.id = r.tipo_vehiculo_id
JOIN usuarios      u  ON u.id  = r.usuario_entrada_id
LEFT JOIN tarifas  t  ON t.tipo_vehiculo_id = r.tipo_vehiculo_id
                      AND t.activo = 1
                      AND t.vigente_desde = (
                            SELECT MAX(t2.vigente_desde)
                            FROM tarifas t2
                            WHERE t2.tipo_vehiculo_id = r.tipo_vehiculo_id
                              AND t2.activo = 1
                              AND t2.vigente_desde <= NOW()
                          )
WHERE r.estado = 'ABIERTO'
ORDER BY r.hora_entrada ASC;


-- Vista: resumen financiero del día
CREATE OR REPLACE VIEW v_resumen_dia AS
SELECT
  DATE(r.hora_salida)      AS fecha,
  tv.nombre                AS tipo_vehiculo,
  COUNT(r.id)              AS vehiculos_atendidos,
  SUM(r.total_cobrado)     AS ingresos_total,
  AVG(r.minutos_total)     AS minutos_promedio,
  MAX(r.total_cobrado)     AS cobro_maximo
FROM registros r
JOIN tipos_vehiculo tv ON tv.id = r.tipo_vehiculo_id
WHERE r.estado = 'CERRADO'
  AND DATE(r.hora_salida) = CURDATE()
GROUP BY DATE(r.hora_salida), tv.nombre;


-- =============================================================================
-- ÍNDICES ADICIONALES DE RENDIMIENTO
-- =============================================================================

-- Búsqueda de registro activo por placa (operación más frecuente en taquilla)
CREATE INDEX idx_registros_placa_estado
  ON registros (placa, estado);

-- Reportes por rango de fechas
CREATE INDEX idx_registros_fecha_estado
  ON registros (hora_entrada, estado);

CREATE INDEX idx_registros_fecha_salida
  ON registros (hora_salida, estado);


-- =============================================================================
-- FIN DEL SCRIPT
-- Verificar con: SHOW TABLES; SELECT * FROM v_disponibilidad;
-- =============================================================================
