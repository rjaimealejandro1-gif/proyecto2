-- =============================================
-- FIX: Rename titulo_unidad to nombre_unidad safely
-- Only renames if titulo_unidad exists (idempotent)
-- =============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'unidades' 
    AND column_name = 'titulo_unidad'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE unidades RENAME COLUMN titulo_unidad TO nombre_unidad;
    RAISE NOTICE 'Columna titulo_unidad renombrada a nombre_unidad';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'unidades' 
    AND column_name = 'nombre_unidad'
    AND table_schema = 'public'
  ) THEN
    RAISE NOTICE 'Columna nombre_unidad ya existe, nada que hacer';
  ELSE
    RAISE WARNING 'No se encontro ni titulo_unidad ni nombre_unidad en unidades';
  END IF;
END $$;

-- Ensure nombre_actividad exists in calificaciones
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calificaciones' 
    AND column_name = 'nombre_actividad'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE calificaciones ADD COLUMN nombre_actividad VARCHAR(200);
    RAISE NOTICE 'Columna nombre_actividad agregada a calificaciones';
  ELSE
    RAISE NOTICE 'Columna nombre_actividad ya existe en calificaciones';
  END IF;
END $$;
