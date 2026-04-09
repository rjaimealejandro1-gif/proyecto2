-- Permite login de administrador por numero_identificacion + contraseña sin exponer SELECT en usuarios a anon (RLS).
CREATE OR REPLACE FUNCTION public.admin_login_by_credentials(
  p_numero_identificacion text,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  SELECT u.id_usuario, u.numero_identificacion, u.nombre, u.email
  INTO r
  FROM public.usuarios u
  INNER JOIN public.roles rol ON rol.id_rol = u.id_rol
  WHERE u.numero_identificacion = p_numero_identificacion
    AND u.contraseña_hash = p_password
    AND rol.nombre_rol = 'administrador'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id_usuario', r.id_usuario,
    'numero_identificacion', r.numero_identificacion,
    'nombre', r.nombre,
    'email', r.email
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_login_by_credentials(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_login_by_credentials(text, text) TO anon, authenticated;
