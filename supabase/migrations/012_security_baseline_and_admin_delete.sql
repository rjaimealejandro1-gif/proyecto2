-- =============================================
-- SECURITY BASELINE + SAFE ADMIN DELETE
-- =============================================

-- Helper: current app role from authenticated profile
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.nombre_rol
  FROM public.usuarios u
  JOIN public.roles r ON r.id_rol = u.id_rol
  WHERE u.auth_id = auth.uid()
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

-- Safe delete (hard delete) with admin authorization and deterministic cascade order
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_target_user_id INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_actor_id INT;
  v_target_role INT;
  v_target_auth_id UUID;
  v_deleted_auth BOOLEAN := FALSE;
  v_deleted_profile BOOLEAN := FALSE;
BEGIN
  SELECT u.id_usuario
  INTO v_actor_id
  FROM public.usuarios u
  WHERE u.auth_id = auth.uid() AND u.id_rol = 1
  LIMIT 1;

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Solo un administrador puede eliminar usuarios';
  END IF;

  SELECT id_rol, auth_id
  INTO v_target_role, v_target_auth_id
  FROM public.usuarios
  WHERE id_usuario = p_target_user_id
  LIMIT 1;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'El usuario a eliminar no existe';
  END IF;

  IF v_target_role = 1 THEN
    RAISE EXCEPTION 'No se permite eliminar cuentas de administrador';
  END IF;

  -- Shared relationships
  DELETE FROM public.notificaciones WHERE id_usuario = p_target_user_id;
  DELETE FROM public.insignias_usuario WHERE id_usuario = p_target_user_id;
  DELETE FROM public.historial_actividad WHERE id_usuario = p_target_user_id;
  DELETE FROM public.mensajes_foro WHERE id_usuario = p_target_user_id;
  DELETE FROM public.respuestas_estudiante WHERE id_estudiante = p_target_user_id;
  DELETE FROM public.calificaciones WHERE id_estudiante = p_target_user_id;
  DELETE FROM public.entregas WHERE id_estudiante = p_target_user_id;
  DELETE FROM public.inscripciones WHERE id_estudiante = p_target_user_id;

  -- Teacher-specific graph
  IF v_target_role = 2 THEN
    DELETE FROM public.calificaciones
    WHERE id_curso IN (
      SELECT id_curso FROM public.cursos WHERE id_docente = p_target_user_id
    );

    DELETE FROM public.entregas
    WHERE id_tarea IN (
      SELECT t.id_tarea
      FROM public.tareas t
      JOIN public.unidades u ON u.id_unidad = t.id_unidad
      JOIN public.cursos c ON c.id_curso = u.id_curso
      WHERE c.id_docente = p_target_user_id
    );

    DELETE FROM public.eventos_calendario
    WHERE id_curso IN (
      SELECT id_curso FROM public.cursos WHERE id_docente = p_target_user_id
    );

    DELETE FROM public.foros
    WHERE id_curso IN (
      SELECT id_curso FROM public.cursos WHERE id_docente = p_target_user_id
    );

    DELETE FROM public.inscripciones
    WHERE id_curso IN (
      SELECT id_curso FROM public.cursos WHERE id_docente = p_target_user_id
    );

    DELETE FROM public.cursos
    WHERE id_docente = p_target_user_id;
  END IF;

  DELETE FROM public.usuarios WHERE id_usuario = p_target_user_id;
  GET DIAGNOSTICS v_deleted_profile = ROW_COUNT;

  IF v_target_auth_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_target_auth_id;
    GET DIAGNOSTICS v_deleted_auth = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'deleted_user_id', p_target_user_id,
    'deleted_profile', v_deleted_profile,
    'deleted_auth', v_deleted_auth
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(INT) TO authenticated;

-- Baseline RLS: enabled and scoped to authenticated users (phase 1)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuestionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respuestas_estudiante ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes_foro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insignias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insignias_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_actividad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_calendario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuraciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS roles_read_authenticated ON public.roles;
CREATE POLICY roles_read_authenticated
ON public.roles
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS usuarios_select_policy ON public.usuarios;
CREATE POLICY usuarios_select_policy
ON public.usuarios
FOR SELECT
TO authenticated
USING (auth_id = auth.uid() OR public.current_user_role() = 'administrador');

DROP POLICY IF EXISTS usuarios_insert_policy ON public.usuarios;
CREATE POLICY usuarios_insert_policy
ON public.usuarios
FOR INSERT
TO authenticated
WITH CHECK (auth_id = auth.uid() OR public.current_user_role() = 'administrador');

DROP POLICY IF EXISTS usuarios_update_policy ON public.usuarios;
CREATE POLICY usuarios_update_policy
ON public.usuarios
FOR UPDATE
TO authenticated
USING (auth_id = auth.uid() OR public.current_user_role() = 'administrador')
WITH CHECK (auth_id = auth.uid() OR public.current_user_role() = 'administrador');

DROP POLICY IF EXISTS usuarios_delete_policy ON public.usuarios;
CREATE POLICY usuarios_delete_policy
ON public.usuarios
FOR DELETE
TO authenticated
USING (public.current_user_role() = 'administrador');

-- Generic authenticated policies for phase 1 compatibility
DROP POLICY IF EXISTS cursos_authenticated_all ON public.cursos;
CREATE POLICY cursos_authenticated_all ON public.cursos FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS inscripciones_authenticated_all ON public.inscripciones;
CREATE POLICY inscripciones_authenticated_all ON public.inscripciones FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS unidades_authenticated_all ON public.unidades;
CREATE POLICY unidades_authenticated_all ON public.unidades FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS materiales_authenticated_all ON public.materiales;
CREATE POLICY materiales_authenticated_all ON public.materiales FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS tareas_authenticated_all ON public.tareas;
CREATE POLICY tareas_authenticated_all ON public.tareas FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS entregas_authenticated_all ON public.entregas;
CREATE POLICY entregas_authenticated_all ON public.entregas FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS cuestionarios_authenticated_all ON public.cuestionarios;
CREATE POLICY cuestionarios_authenticated_all ON public.cuestionarios FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS preguntas_authenticated_all ON public.preguntas;
CREATE POLICY preguntas_authenticated_all ON public.preguntas FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS opciones_authenticated_all ON public.opciones;
CREATE POLICY opciones_authenticated_all ON public.opciones FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS respuestas_estudiante_authenticated_all ON public.respuestas_estudiante;
CREATE POLICY respuestas_estudiante_authenticated_all ON public.respuestas_estudiante FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS calificaciones_authenticated_all ON public.calificaciones;
CREATE POLICY calificaciones_authenticated_all ON public.calificaciones FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS foros_authenticated_all ON public.foros;
CREATE POLICY foros_authenticated_all ON public.foros FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS mensajes_foro_authenticated_all ON public.mensajes_foro;
CREATE POLICY mensajes_foro_authenticated_all ON public.mensajes_foro FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS notificaciones_authenticated_all ON public.notificaciones;
CREATE POLICY notificaciones_authenticated_all ON public.notificaciones FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS insignias_authenticated_read ON public.insignias;
CREATE POLICY insignias_authenticated_read ON public.insignias FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS insignias_authenticated_write_admin ON public.insignias;
CREATE POLICY insignias_authenticated_write_admin ON public.insignias FOR ALL TO authenticated
USING (public.current_user_role() = 'administrador')
WITH CHECK (public.current_user_role() = 'administrador');

DROP POLICY IF EXISTS insignias_usuario_authenticated_all ON public.insignias_usuario;
CREATE POLICY insignias_usuario_authenticated_all ON public.insignias_usuario FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS historial_actividad_authenticated_all ON public.historial_actividad;
CREATE POLICY historial_actividad_authenticated_all ON public.historial_actividad FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS eventos_calendario_authenticated_all ON public.eventos_calendario;
CREATE POLICY eventos_calendario_authenticated_all ON public.eventos_calendario FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS configuraciones_authenticated_read ON public.configuraciones;
CREATE POLICY configuraciones_authenticated_read ON public.configuraciones FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS configuraciones_authenticated_write_admin ON public.configuraciones;
CREATE POLICY configuraciones_authenticated_write_admin ON public.configuraciones FOR ALL TO authenticated
USING (public.current_user_role() = 'administrador')
WITH CHECK (public.current_user_role() = 'administrador');

-- Storage: remove broad public access and restrict writes to owner/admin
DROP POLICY IF EXISTS "Public Access to Entregas" ON storage.objects;

DROP POLICY IF EXISTS "entregas_read_authenticated" ON storage.objects;
CREATE POLICY "entregas_read_authenticated"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'entregas');

DROP POLICY IF EXISTS "entregas_insert_owner_or_admin" ON storage.objects;
CREATE POLICY "entregas_insert_owner_or_admin"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'entregas' AND (owner = auth.uid() OR public.current_user_role() = 'administrador')
);

DROP POLICY IF EXISTS "entregas_update_owner_or_admin" ON storage.objects;
CREATE POLICY "entregas_update_owner_or_admin"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'entregas' AND (owner = auth.uid() OR public.current_user_role() = 'administrador')
)
WITH CHECK (
  bucket_id = 'entregas' AND (owner = auth.uid() OR public.current_user_role() = 'administrador')
);

DROP POLICY IF EXISTS "entregas_delete_owner_or_admin" ON storage.objects;
CREATE POLICY "entregas_delete_owner_or_admin"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'entregas' AND (owner = auth.uid() OR public.current_user_role() = 'administrador')
);
