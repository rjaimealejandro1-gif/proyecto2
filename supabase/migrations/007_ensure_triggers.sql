-- =============================================
-- TRIGGERS: Ensure auto-delete orphaned calificaciones
-- =============================================

CREATE OR REPLACE FUNCTION delete_calificaciones_on_tarea_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM calificaciones
  WHERE tipo_referencia = 'tarea' AND id_referencia = OLD.id_tarea;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_delete_calificaciones_on_tarea ON tareas;
CREATE TRIGGER trg_delete_calificaciones_on_tarea
  BEFORE DELETE ON tareas
  FOR EACH ROW
  EXECUTE FUNCTION delete_calificaciones_on_tarea_delete();

CREATE OR REPLACE FUNCTION delete_calificaciones_on_cuestionario_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM calificaciones
  WHERE tipo_referencia = 'cuestionario' AND id_referencia = OLD.id_cuestionario;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_delete_calificaciones_on_cuestionario ON cuestionarios;
CREATE TRIGGER trg_delete_calificaciones_on_cuestionario
  BEFORE DELETE ON cuestionarios
  FOR EACH ROW
  EXECUTE FUNCTION delete_calificaciones_on_cuestionario_delete();
