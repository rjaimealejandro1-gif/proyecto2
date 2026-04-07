-- =============================================
-- TRIGGERS: Auto-delete orphaned calificaciones
-- when parent tarea or cuestionario is deleted
-- =============================================

-- Function to auto-delete calificaciones when tarea is deleted
CREATE OR REPLACE FUNCTION delete_calificaciones_on_tarea_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM calificaciones
  WHERE tipo_referencia = 'tarea' AND id_referencia = OLD.id_tarea;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger on tarea delete
DROP TRIGGER IF EXISTS trg_delete_calificaciones_on_tarea ON tareas;
CREATE TRIGGER trg_delete_calificaciones_on_tarea
  BEFORE DELETE ON tareas
  FOR EACH ROW
  EXECUTE FUNCTION delete_calificaciones_on_tarea_delete();

-- Function to auto-delete calificaciones when cuestionario is deleted
CREATE OR REPLACE FUNCTION delete_calificaciones_on_cuestionario_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM calificaciones
  WHERE tipo_referencia = 'cuestionario' AND id_referencia = OLD.id_cuestionario;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger on cuestionario delete
DROP TRIGGER IF EXISTS trg_delete_calificaciones_on_cuestionario ON cuestionarios;
CREATE TRIGGER trg_delete_calificaciones_on_cuestionario
  BEFORE DELETE ON cuestionarios
  FOR EACH ROW
  EXECUTE FUNCTION delete_calificaciones_on_cuestionario_delete();
