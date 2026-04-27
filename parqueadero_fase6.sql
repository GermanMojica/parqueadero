-- =============================================================================
-- FASE 6: Extensiones de lógica de negocio avanzada
-- Ejecutar DESPUÉS de parqueadero_db.sql
-- =============================================================================

USE parqueadero_db;

-- =============================================================================
-- TABLA: tipos_descuento
-- Catálogo de descuentos configurables por el admin
-- =============================================================================
CREATE TABLE IF NOT EXISTS tipos_descuento (
  id           TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre       VARCHAR(60)      NOT NULL COMMENT 'Ej: Cortesía, Residente, Convenio',
  descripcion  VARCHAR(200)         NULL,
  tipo_calculo ENUM(
                 'PORCENTAJE',   -- descuento = total * (valor/100)
                 'VALOR_FIJO',   -- descuento = valor fijo en moneda
                 'MINUTOS_GRATIS' -- no cobra los primeros N minutos
               )                NOT NULL DEFAULT 'PORCENTAJE',
  valor        DECIMAL(10,2)    NOT NULL COMMENT 'Porcentaje, valor fijo o minutos según tipo_calculo',
  activo       TINYINT(1)       NOT NULL DEFAULT 1,
  solo_admin   TINYINT(1)       NOT NULL DEFAULT 0 COMMENT 'Si 1, solo admin puede aplicarlo',
  created_at   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_tipos_descuento_nombre (nombre)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Catálogo de descuentos y cortesías configurables';


-- =============================================================================
-- TABLA: descuentos_aplicados
-- Registro de qué descuento se aplicó a qué cierre, quién lo autorizó y por qué
-- Relación 1:1 opcional con registros (un cierre puede tener máximo 1 descuento)
-- =============================================================================
CREATE TABLE IF NOT EXISTS descuentos_aplicados (
  id                  INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  registro_id         INT UNSIGNED     NOT NULL,
  tipo_descuento_id   TINYINT UNSIGNED NOT NULL,
  autorizado_por_id   INT UNSIGNED     NOT NULL COMMENT 'Usuario que autorizó',
  total_antes         DECIMAL(10,2)    NOT NULL COMMENT 'Total antes del descuento',
  valor_descuento     DECIMAL(10,2)    NOT NULL COMMENT 'Monto descontado',
  total_despues       DECIMAL(10,2)    NOT NULL COMMENT 'Total final cobrado',
  motivo              VARCHAR(255)         NULL,
  aplicado_at         DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_descuento_registro (registro_id),  -- un descuento por registro
  INDEX idx_descuento_tipo     (tipo_descuento_id),
  INDEX idx_descuento_usuario  (autorizado_por_id),
  INDEX idx_descuento_fecha    (aplicado_at),

  CONSTRAINT fk_descuento_registro
    FOREIGN KEY (registro_id) REFERENCES registros (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT fk_descuento_tipo
    FOREIGN KEY (tipo_descuento_id) REFERENCES tipos_descuento (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT fk_descuento_usuario
    FOREIGN KEY (autorizado_por_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Auditoría de descuentos aplicados en cierres de registros';


-- =============================================================================
-- TABLA: auditoria_acciones
-- Log inmutable de acciones críticas: entradas, salidas, anulaciones, descuentos
-- Nunca se borra. Es el trail de auditoría del sistema.
-- =============================================================================
CREATE TABLE IF NOT EXISTS auditoria_acciones (
  id           BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  usuario_id   INT UNSIGNED     NOT NULL,
  accion       VARCHAR(50)      NOT NULL COMMENT 'ENTRADA, SALIDA, ANULACION, DESCUENTO, LOGIN, CONFIG',
  entidad      VARCHAR(50)      NOT NULL COMMENT 'registros, tarifas, usuarios...',
  entidad_id   INT UNSIGNED         NULL,
  detalle_json JSON                 NULL COMMENT 'Snapshot del estado relevante',
  ip           VARCHAR(45)          NULL,
  created_at   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_auditoria_usuario (usuario_id),
  INDEX idx_auditoria_accion  (accion),
  INDEX idx_auditoria_fecha   (created_at),
  INDEX idx_auditoria_entidad (entidad, entidad_id)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Trail de auditoría inmutable. No se debe permitir DELETE sobre esta tabla.';


-- =============================================================================
-- TABLA: tarifas_especiales
-- Tarifas diferenciales por horario (nocturna, festivo, fin de semana)
-- Sobreescriben la tarifa base si hay solapamiento de horario
-- =============================================================================
CREATE TABLE IF NOT EXISTS tarifas_especiales (
  id               INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  tipo_vehiculo_id TINYINT UNSIGNED NOT NULL,
  nombre           VARCHAR(60)      NOT NULL COMMENT 'Ej: Tarifa nocturna, Festivo',
  precio_hora      DECIMAL(10,2)    NOT NULL,
  hora_inicio      TIME             NOT NULL COMMENT 'Ej: 22:00:00',
  hora_fin         TIME             NOT NULL COMMENT 'Ej: 06:00:00',
  aplica_lunes     TINYINT(1)       NOT NULL DEFAULT 1,
  aplica_martes    TINYINT(1)       NOT NULL DEFAULT 1,
  aplica_miercoles TINYINT(1)       NOT NULL DEFAULT 1,
  aplica_jueves    TINYINT(1)       NOT NULL DEFAULT 1,
  aplica_viernes   TINYINT(1)       NOT NULL DEFAULT 1,
  aplica_sabado    TINYINT(1)       NOT NULL DEFAULT 1,
  aplica_domingo   TINYINT(1)       NOT NULL DEFAULT 1,
  activo           TINYINT(1)       NOT NULL DEFAULT 1,
  created_at       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_tarifa_esp_tipo (tipo_vehiculo_id, activo),

  CONSTRAINT fk_tarifa_esp_tipo
    FOREIGN KEY (tipo_vehiculo_id) REFERENCES tipos_vehiculo (id)
    ON UPDATE CASCADE ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Tarifas especiales por horario, día de semana o festivos';


-- =============================================================================
-- DATOS INICIALES: tipos de descuento comunes
-- =============================================================================
INSERT IGNORE INTO tipos_descuento (nombre, descripcion, tipo_calculo, valor, activo, solo_admin) VALUES
  ('Cortesía total',      'Exoneración completa del cobro',            'PORCENTAJE',    100,  1, 1),
  ('Cortesía 50%',        'Descuento del 50% sobre el total',          'PORCENTAJE',    50,   1, 1),
  ('Primera hora gratis', 'No cobra los primeros 60 minutos',          'MINUTOS_GRATIS', 60,  1, 0),
  ('Descuento residente', 'Descuento especial para residentes 30%',    'PORCENTAJE',    30,   1, 0),
  ('Convenio empresa',    'Tarifa de convenio corporativo 25%',        'PORCENTAJE',    25,   1, 0),
  ('Descuento $5000',     'Descuento de valor fijo de $5.000',         'VALOR_FIJO',    5000, 1, 0);

-- Tarifa nocturna de ejemplo para SEDAN (22:00 - 06:00)
INSERT IGNORE INTO tarifas_especiales
  (tipo_vehiculo_id, nombre, precio_hora, hora_inicio, hora_fin,
   aplica_lunes, aplica_martes, aplica_miercoles, aplica_jueves,
   aplica_viernes, aplica_sabado, aplica_domingo, activo)
SELECT
  id, 'Tarifa nocturna', 2000.00, '22:00:00', '06:00:00',
  1, 1, 1, 1, 1, 1, 1, 1
FROM tipos_vehiculo WHERE nombre = 'SEDAN';


-- =============================================================================
-- VISTA EXTENDIDA: reportes diarios con descuentos
-- =============================================================================
CREATE OR REPLACE VIEW v_reporte_financiero AS
SELECT
  DATE(r.hora_salida)                                  AS fecha,
  tv.nombre                                            AS tipo_vehiculo,
  COUNT(r.id)                                          AS total_vehiculos,
  SUM(r.total_cobrado)                                 AS ingresos_brutos,
  COALESCE(SUM(da.valor_descuento), 0)                 AS total_descuentos,
  SUM(r.total_cobrado) - COALESCE(SUM(da.valor_descuento), 0) AS ingresos_netos,
  AVG(r.minutos_total)                                 AS minutos_promedio,
  MIN(r.total_cobrado)                                 AS cobro_minimo,
  MAX(r.total_cobrado)                                 AS cobro_maximo,
  COUNT(da.id)                                         AS registros_con_descuento
FROM registros r
JOIN  tipos_vehiculo   tv ON tv.id = r.tipo_vehiculo_id
LEFT JOIN descuentos_aplicados da ON da.registro_id = r.id
WHERE r.estado = 'CERRADO'
GROUP BY DATE(r.hora_salida), tv.nombre;


-- =============================================================================
-- VISTA: vehículos dentro con alerta de tiempo excesivo (> 24h)
-- Útil para detectar vehículos "fantasma"
-- =============================================================================
CREATE OR REPLACE VIEW v_alertas_tiempo AS
SELECT
  r.id                                                        AS registro_id,
  r.placa,
  tv.nombre                                                   AS tipo_vehiculo,
  e.codigo                                                    AS espacio,
  r.hora_entrada,
  TIMESTAMPDIFF(HOUR,   r.hora_entrada, NOW())               AS horas_dentro,
  TIMESTAMPDIFF(MINUTE, r.hora_entrada, NOW())               AS minutos_dentro,
  u.nombre                                                    AS operador_entrada,
  CASE
    WHEN TIMESTAMPDIFF(HOUR, r.hora_entrada, NOW()) >= 24 THEN 'CRITICA'
    WHEN TIMESTAMPDIFF(HOUR, r.hora_entrada, NOW()) >= 12 THEN 'ALTA'
    WHEN TIMESTAMPDIFF(HOUR, r.hora_entrada, NOW()) >= 6  THEN 'MEDIA'
    ELSE 'NORMAL'
  END                                                        AS nivel_alerta
FROM registros r
JOIN espacios      e  ON e.id  = r.espacio_id
JOIN tipos_vehiculo tv ON tv.id = r.tipo_vehiculo_id
JOIN usuarios      u  ON u.id  = r.usuario_entrada_id
WHERE r.estado = 'ABIERTO'
ORDER BY horas_dentro DESC;
