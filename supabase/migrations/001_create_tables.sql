-- =============================================
-- SCHEMA: Plataforma Educativa
-- Normalizado hasta 3FN
-- =============================================

-- 1. roles
CREATE TABLE IF NOT EXISTS roles (
    id_rol SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE
);

-- 2. usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    contraseña_hash VARCHAR(255) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_rol INT NOT NULL REFERENCES roles(id_rol)
);

-- 3. cursos
CREATE TABLE IF NOT EXISTS cursos (
    id_curso SERIAL PRIMARY KEY,
    nombre_curso VARCHAR(150) NOT NULL,
    descripcion TEXT,
    imagen_url TEXT,
    categoria VARCHAR(100),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'activo',
    id_docente INT REFERENCES usuarios(id_usuario)
);

-- 4. inscripciones
CREATE TABLE IF NOT EXISTS inscripciones (
    id_inscripcion SERIAL PRIMARY KEY,
    id_estudiante INT NOT NULL REFERENCES usuarios(id_usuario),
    id_curso INT NOT NULL REFERENCES cursos(id_curso),
    fecha_inscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progreso_total DECIMAL(5,2) DEFAULT 0,
    UNIQUE(id_estudiante, id_curso)
);

-- 5. unidades
CREATE TABLE IF NOT EXISTS unidades (
    id_unidad SERIAL PRIMARY KEY,
    id_curso INT NOT NULL REFERENCES cursos(id_curso) ON DELETE CASCADE,
    titulo_unidad VARCHAR(150) NOT NULL,
    orden INT NOT NULL
);

-- 6. materiales
CREATE TABLE IF NOT EXISTS materiales (
    id_material SERIAL PRIMARY KEY,
    id_unidad INT NOT NULL REFERENCES unidades(id_unidad) ON DELETE CASCADE,
    tipo_material VARCHAR(50) NOT NULL,
    contenido TEXT NOT NULL,
    titulo_material VARCHAR(150) NOT NULL
);

-- 7. tareas
CREATE TABLE IF NOT EXISTS tareas (
    id_tarea SERIAL PRIMARY KEY,
    id_unidad INT NOT NULL REFERENCES unidades(id_unidad) ON DELETE CASCADE,
    titulo_tarea VARCHAR(150) NOT NULL,
    instrucciones TEXT NOT NULL,
    fecha_limite TIMESTAMP,
    criterios TEXT
);

-- 8. entregas
CREATE TABLE IF NOT EXISTS entregas (
    id_entrega SERIAL PRIMARY KEY,
    id_tarea INT NOT NULL REFERENCES tareas(id_tarea) ON DELETE CASCADE,
    id_estudiante INT NOT NULL REFERENCES usuarios(id_usuario),
    fecha_entrega TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    evidencia TEXT,
    calificacion DECIMAL(5,2),
    UNIQUE(id_tarea, id_estudiante)
);

-- 9. cuestionarios
CREATE TABLE IF NOT EXISTS cuestionarios (
    id_cuestionario SERIAL PRIMARY KEY,
    id_unidad INT NOT NULL REFERENCES unidades(id_unidad) ON DELETE CASCADE,
    titulo_cuestionario VARCHAR(150) NOT NULL
);

-- 10. preguntas
CREATE TABLE IF NOT EXISTS preguntas (
    id_pregunta SERIAL PRIMARY KEY,
    id_cuestionario INT NOT NULL REFERENCES cuestionarios(id_cuestionario) ON DELETE CASCADE,
    texto_pregunta TEXT NOT NULL,
    tipo VARCHAR(50) DEFAULT 'opcion_multiple'
);

-- 11. opciones
CREATE TABLE IF NOT EXISTS opciones (
    id_opcion SERIAL PRIMARY KEY,
    id_pregunta INT NOT NULL REFERENCES preguntas(id_pregunta) ON DELETE CASCADE,
    texto_opcion TEXT NOT NULL,
    es_correcta BOOLEAN DEFAULT FALSE
);

-- 12. respuestas_estudiante
CREATE TABLE IF NOT EXISTS respuestas_estudiante (
    id_respuesta_est SERIAL PRIMARY KEY,
    id_estudiante INT NOT NULL REFERENCES usuarios(id_usuario),
    id_pregunta INT NOT NULL REFERENCES preguntas(id_pregunta),
    id_opcion_seleccionada INT NOT NULL REFERENCES opciones(id_opcion),
    fecha_respuesta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_estudiante, id_pregunta)
);

-- 13. calificaciones
CREATE TABLE IF NOT EXISTS calificaciones (
    id_calificacion SERIAL PRIMARY KEY,
    id_estudiante INT NOT NULL REFERENCES usuarios(id_usuario),
    id_curso INT NOT NULL REFERENCES cursos(id_curso),
    tipo_referencia VARCHAR(50) NOT NULL,
    id_referencia INT NOT NULL,
    nota_obtenida DECIMAL(5,2),
    fecha_calificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. foros
CREATE TABLE IF NOT EXISTS foros (
    id_foro SERIAL PRIMARY KEY,
    id_curso INT NOT NULL REFERENCES cursos(id_curso) ON DELETE CASCADE,
    titulo_foro VARCHAR(150) NOT NULL
);

-- 15. mensajes_foro
CREATE TABLE IF NOT EXISTS mensajes_foro (
    id_mensaje SERIAL PRIMARY KEY,
    id_foro INT NOT NULL REFERENCES foros(id_foro) ON DELETE CASCADE,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario),
    contenido_mensaje TEXT NOT NULL,
    fecha_mensaje TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_respuesta_a INT REFERENCES mensajes_foro(id_mensaje)
);

-- =============================================
-- DATOS INICIALES
-- =============================================

-- Insertar roles por defecto
INSERT INTO roles (nombre_rol) VALUES
    ('administrador'),
    ('docente'),
    ('estudiante')
ON CONFLICT (nombre_rol) DO NOTHING;

-- =============================================
-- ÍNDICES PARA RENDIMIENTO
-- =============================================

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(id_rol);
CREATE INDEX IF NOT EXISTS idx_cursos_docente ON cursos(id_docente);
CREATE INDEX IF NOT EXISTS idx_inscripciones_estudiante ON inscripciones(id_estudiante);
CREATE INDEX IF NOT EXISTS idx_inscripciones_curso ON inscripciones(id_curso);
CREATE INDEX IF NOT EXISTS idx_unidades_curso ON unidades(id_curso);
CREATE INDEX IF NOT EXISTS idx_materiales_unidad ON materiales(id_unidad);
CREATE INDEX IF NOT EXISTS idx_tareas_unidad ON tareas(id_unidad);
CREATE INDEX IF NOT EXISTS idx_entregas_tarea ON entregas(id_tarea);
CREATE INDEX IF NOT EXISTS idx_entregas_estudiante ON entregas(id_estudiante);
CREATE INDEX IF NOT EXISTS idx_cuestionarios_unidad ON cuestionarios(id_unidad);
CREATE INDEX IF NOT EXISTS idx_preguntas_cuestionario ON preguntas(id_cuestionario);
CREATE INDEX IF NOT EXISTS idx_opciones_pregunta ON opciones(id_pregunta);
CREATE INDEX IF NOT EXISTS idx_respuestas_estudiante ON respuestas_estudiante(id_estudiante);
CREATE INDEX IF NOT EXISTS idx_respuestas_pregunta ON respuestas_estudiante(id_pregunta);
CREATE INDEX IF NOT EXISTS idx_calificaciones_estudiante ON calificaciones(id_estudiante);
CREATE INDEX IF NOT EXISTS idx_calificaciones_curso ON calificaciones(id_curso);
CREATE INDEX IF NOT EXISTS idx_foros_curso ON foros(id_curso);
CREATE INDEX IF NOT EXISTS idx_mensajes_foro ON mensajes_foro(id_foro);
CREATE INDEX IF NOT EXISTS idx_mensajes_usuario ON mensajes_foro(id_usuario);
