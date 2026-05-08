-- =============================================================================
-- MIGRACIÓN: Tabla de Reservas Anticipadas
-- Motor: MySQL 8.0+
-- Ejecutar después de parqueadero_db.sql
-- =============================================================================

USE railway;

-- =============================================================================
-- TABLA: reservas
-- Reservas anticipadas de espacios de parqueadero.
-- Estado: PENDIENTE | CONFIRMADA | CANCELADA | EXPIRADA | CONVERTIDA
-- =============================================================================
CREATE TABLE IF NOT EXISTS reservas (
  id                 INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  sede_id            INT UNSIGNED      NOT NULL COMMENT 'Sede a la que pertenece la reserva',
  espacio_id         INT UNSIGNED      NOT NULL,
  placa              VARCHAR(10)       NOT NULL COMMENT 'Placa del vehículo reservante',
  tipo_vehiculo_id   TINYINT UNSIGNED  NOT NULL,
  usuario_id         INT UNSIGNED      NOT NULL COMMENT 'Usuario/operador que creó la reserva',
  fecha_reserva      DATE              NOT NULL COMMENT 'Fecha para la cual se reserva',
  hora_inicio        TIME              NOT NULL COMMENT 'Hora de inicio de la reserva',
  hora_fin_estimada  TIME              NOT NULL COMMENT 'Hora de fin estimada de la reserva',
  estado             ENUM(
                       'PENDIENTE',
                       'CONFIRMADA',
                       'CANCELADA',
                       'EXPIRADA',
                       'CONVERTIDA'
                     )                 NOT NULL DEFAULT 'PENDIENTE',
  codigo_reserva     VARCHAR(8)        NOT NULL COMMENT 'Código alfanumérico único de 8 caracteres',
  created_at         DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_reservas_codigo (codigo_reserva),

  -- Índices para queries frecuentes
  INDEX idx_reservas_sede (sede_id),
  INDEX idx_reservas_espacio_fecha (espacio_id, fecha_reserva, estado),
  INDEX idx_reservas_placa (placa),
  INDEX idx_reservas_estado (estado),
  INDEX idx_reservas_fecha (fecha_reserva, hora_inicio),
  INDEX idx_reservas_usuario (usuario_id),

  CONSTRAINT fk_reservas_sede
    FOREIGN KEY (sede_id)
    REFERENCES sedes (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_reservas_espacio
    FOREIGN KEY (espacio_id)
    REFERENCES espacios (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_reservas_tipo
    FOREIGN KEY (tipo_vehiculo_id)
    REFERENCES tipos_vehiculo (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT fk_reservas_usuario
    FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Reservas anticipadas de espacios de parqueadero';


-- =============================================================================
-- FIN DE LA MIGRACIÓN
-- Verificar con: SHOW COLUMNS FROM reservas; SELECT * FROM reservas;
-- =============================================================================
