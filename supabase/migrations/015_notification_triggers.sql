-- =============================================
-- MIGRATION: Triggers de Notificaciones Automáticas
-- Funciones para Administradores, Docentes y Alumnos
-- =============================================

-- FUNCION 1: Notificar a administradores cuando un usuario (docente/alumno) se registra
CREATE OR REPLACE FUNCTION notify_admin_user_registration()
RETURNS TRIGGER AS $$
DECLARE
    admin_id INT;
    rol_nombre VARCHAR;
BEGIN
    SELECT nombre_rol INTO rol_nombre FROM roles WHERE id_rol = NEW.id_rol;

    IF rol_nombre IN ('docente', 'estudiante') THEN
        FOR admin_id IN (SELECT u.id_usuario FROM usuarios u JOIN roles r ON u.id_rol = r.id_rol WHERE r.nombre_rol = 'administrador')
        LOOP
            INSERT INTO notificaciones (id_usuario, tipo, titulo, mensaje, enlace, leida)
            VALUES (admin_id, 'registro_usuario', 'Nuevo ' || rol_nombre || ' registrado', 'El usuario ' || NEW.nombre || ' se ha registrado.', '/admin/usuarios', false);
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_admin_user_registration ON usuarios;
CREATE TRIGGER trg_notify_admin_user_registration
AFTER INSERT ON usuarios
FOR EACH ROW
EXECUTE FUNCTION notify_admin_user_registration();

-- FUNCION 2: Notificar creación de cursos (a admin y alumnos)
CREATE OR REPLACE FUNCTION notify_course_creation()
RETURNS TRIGGER AS $$
DECLARE
    user_id INT;
    docente_name VARCHAR;
BEGIN
    SELECT nombre INTO docente_name FROM usuarios WHERE id_usuario = NEW.id_docente;

    -- Notificar a todos los administradores
    FOR user_id IN (SELECT u.id_usuario FROM usuarios u JOIN roles r ON u.id_rol = r.id_rol WHERE r.nombre_rol = 'administrador')
    LOOP
        INSERT INTO notificaciones (id_usuario, tipo, titulo, mensaje, enlace, leida)
        VALUES (user_id, 'nuevo_curso_admin', 'Nuevo curso creado', 'El docente ' || docente_name || ' ha creado el curso: ' || NEW.nombre_curso, '/admin/cursos', false);
    END LOOP;

    -- Notificar a todos los estudiantes (Global)
    FOR user_id IN (SELECT u.id_usuario FROM usuarios u JOIN roles r ON u.id_rol = r.id_rol WHERE r.nombre_rol = 'estudiante')
    LOOP
        INSERT INTO notificaciones (id_usuario, tipo, titulo, mensaje, enlace, leida)
        VALUES (user_id, 'nuevo_curso_alumno', '¡Nuevo Curso Disponible!', 'Se ha creado el curso ' || NEW.nombre_curso || ' dictado por ' || docente_name, '/catalogo', false);
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_course_creation ON cursos;
CREATE TRIGGER trg_notify_course_creation
AFTER INSERT ON cursos
FOR EACH ROW
EXECUTE FUNCTION notify_course_creation();

-- FUNCION 3: Notificar inscripciones (a admin y docente asignado)
CREATE OR REPLACE FUNCTION notify_enrollment()
RETURNS TRIGGER AS $$
DECLARE
    admin_id INT;
    curso_name VARCHAR;
    docente_id INT;
    student_name VARCHAR;
BEGIN
    SELECT nombre_curso, id_docente INTO curso_name, docente_id FROM cursos WHERE id_curso = NEW.id_curso;
    SELECT nombre INTO student_name FROM usuarios WHERE id_usuario = NEW.id_estudiante;

    -- Notificar al Docente
    INSERT INTO notificaciones (id_usuario, tipo, titulo, mensaje, enlace, leida)
    VALUES (docente_id, 'nueva_inscripcion_docente', 'Nuevo estudiante inscrito', 'El estudiante ' || student_name || ' se ha inscrito a tu curso: ' || curso_name, '/docente/mis-cursos', false);

    -- Notificar a todos los admins
    FOR admin_id IN (SELECT u.id_usuario FROM usuarios u JOIN roles r ON u.id_rol = r.id_rol WHERE r.nombre_rol = 'administrador')
    LOOP
        INSERT INTO notificaciones (id_usuario, tipo, titulo, mensaje, enlace, leida)
        VALUES (admin_id, 'nueva_inscripcion_admin', 'Inscripción de estudiante', student_name || ' se ha inscrito en ' || curso_name, '/admin/reportes', false);
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_enrollment ON inscripciones;
CREATE TRIGGER trg_notify_enrollment
AFTER INSERT ON inscripciones
FOR EACH ROW
EXECUTE FUNCTION notify_enrollment();
