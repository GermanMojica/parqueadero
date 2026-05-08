-- Migración para el sistema de fidelización

CREATE TABLE reglas_fidelizacion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nivel ENUM('BRONCE','PLATA','ORO','PLATINO') NOT NULL UNIQUE,
  puntos_por_hora INT NOT NULL DEFAULT 0,
  descuento_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  puntos_minimo_canje INT NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tarjetas_fidelizacion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(12) NOT NULL UNIQUE,
  placa VARCHAR(10) NOT NULL UNIQUE,
  puntos_acumulados INT NOT NULL DEFAULT 0,
  nivel ENUM('BRONCE','PLATA','ORO','PLATINO') NOT NULL DEFAULT 'BRONCE',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE movimientos_puntos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tarjeta_id INT NOT NULL,
  registro_id INT NULL,
  puntos INT NOT NULL,
  tipo ENUM('ACUMULO','CANJE') NOT NULL,
  descripcion VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tarjeta_id) REFERENCES tarjetas_fidelizacion(id) ON DELETE CASCADE,
  FOREIGN KEY (registro_id) REFERENCES registros(id) ON DELETE SET NULL
);

-- Insertar reglas por defecto
INSERT INTO reglas_fidelizacion (nivel, puntos_por_hora, descuento_pct, puntos_minimo_canje) VALUES
('BRONCE', 1, 0.00, 0),
('PLATA', 2, 5.00, 100),
('ORO', 3, 10.00, 500),
('PLATINO', 5, 15.00, 2000);
