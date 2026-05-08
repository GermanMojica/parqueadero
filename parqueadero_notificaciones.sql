-- =============================================================================
-- MIGRACIÓN: Módulo de Notificaciones (Telegram y Web Push)
-- =============================================================================

USE parqueadero_db;

-- Tabla para almacenar endpoints de Web Push
CREATE TABLE IF NOT EXISTS suscripciones_push (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id  INT UNSIGNED NOT NULL,
  endpoint    TEXT         NOT NULL,
  keys_p256dh VARCHAR(255) NOT NULL,
  keys_auth   VARCHAR(255) NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_suscripciones_push_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla para preferencias de notificación del usuario
CREATE TABLE IF NOT EXISTS preferencias_notificacion (
  usuario_id        INT UNSIGNED NOT NULL,
  canal_telegram    TINYINT(1)   NOT NULL DEFAULT 0,
  canal_push        TINYINT(1)   NOT NULL DEFAULT 0,
  chat_id_telegram  VARCHAR(50)  NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (usuario_id),
  CONSTRAINT fk_preferencias_notificacion_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla genérica de configuración del sistema si no existe
CREATE TABLE IF NOT EXISTS config_sistema (
  clave       VARCHAR(50)  NOT NULL,
  valor       VARCHAR(255) NOT NULL,
  descripcion VARCHAR(255) NULL,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (clave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar configuración por defecto para tiempo de permanencia máxima (horas)
INSERT IGNORE INTO config_sistema (clave, valor, descripcion) 
VALUES ('MAX_HORAS_PERMANENCIA', '4', 'Horas máximas de permanencia antes de notificar alerta');

-- Asegurarse de que todos los usuarios actuales tengan un registro de preferencias
INSERT IGNORE INTO preferencias_notificacion (usuario_id)
SELECT id FROM usuarios;
