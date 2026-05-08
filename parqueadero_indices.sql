-- =============================================================================
-- MIGRACIÓN: Índices de Rendimiento para Reportes
-- =============================================================================

USE parqueadero_db;

-- Índices en la tabla registros
CREATE INDEX IF NOT EXISTS idx_registros_hora_entrada_perf ON registros (hora_entrada);
CREATE INDEX IF NOT EXISTS idx_registros_hora_salida_perf ON registros (hora_salida);
CREATE INDEX IF NOT EXISTS idx_registros_placa_perf ON registros (placa);
CREATE INDEX IF NOT EXISTS idx_registros_estado_entrada_perf ON registros (estado, hora_entrada);
CREATE INDEX IF NOT EXISTS idx_registros_espacio_estado_perf ON registros (espacio_id, estado);

-- La tabla pagos no fue definida explícitamente en el schema inicial, 
-- pero el requerimiento la asume. Si existe, añadimos índices.
-- Si usamos la misma de registros para manejar pagos (total_cobrado), 
-- los índices de arriba ya la cubren. Si existiera una tabla separada:
-- CREATE INDEX IF NOT EXISTS idx_pagos_registro_id ON pagos (registro_id);
-- CREATE INDEX IF NOT EXISTS idx_pagos_created_at ON pagos (created_at);
-- CREATE INDEX IF NOT EXISTS idx_pagos_estado ON pagos (estado);
