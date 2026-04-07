-- =============================================
-- FIX: Add missing columns referenced by frontend
-- =============================================

-- 1. Rename titulo_unidad to nombre_unidad for consistency
ALTER TABLE unidades RENAME COLUMN titulo_unidad TO nombre_unidad;

-- 2. Add nombre_actividad to calificaciones for tracking activity names when deleted
ALTER TABLE calificaciones ADD COLUMN IF NOT EXISTS nombre_actividad VARCHAR(200);
