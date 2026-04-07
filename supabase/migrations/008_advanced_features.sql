-- =============================================
-- ADVANCED FEATURES: LMS Platform
-- Notificaciones, Insignias, Historial, Calendario
-- =============================================

-- 16. notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
    id_notificacion SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT,
    leida BOOLEAN DEFAULT FALSE,
    enlace VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(id_usuario);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(leida);

-- 17. insignias
CREATE TABLE IF NOT EXISTS insignias (
    id_insignia SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(100),
    tipo VARCHAR(50) NOT NULL,
    criterio JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. insignias_usuario (relación many-to-many)
CREATE TABLE IF NOT EXISTS insignias_usuario (
    id SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_insignia INT NOT NULL REFERENCES insignias(id_insignia) ON DELETE CASCADE,
    fecha_obtenida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_usuario, id_insignia)
);

CREATE INDEX IF NOT EXISTS idx_insignias_usuario ON insignias_usuario(id_usuario);

-- 19. historial_actividad
CREATE TABLE IF NOT EXISTS historial_actividad (
    id_actividad SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    descripcion VARCHAR(500),
    entidad_tipo VARCHAR(50),
    entidad_id INT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_historial_usuario ON historial_actividad(id_usuario);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial_actividad(created_at DESC);

-- 20. eventos_calendario
CREATE TABLE IF NOT EXISTS eventos_calendario (
    id_evento SERIAL PRIMARY KEY,
    id_curso INT REFERENCES cursos(id_curso) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP,
    tipo VARCHAR(50) NOT NULL,
    id_unidad INT,
    id_tarea INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_eventos_curso ON eventos_calendario(id_curso);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON eventos_calendario(fecha_inicio);

-- 21. configuraciones (key-value para settings del sistema)
CREATE TABLE IF NOT EXISTS configuraciones (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(100) NOT NULL UNIQUE,
    valor TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- DATA: Insignias predefinidas
-- =============================================

INSERT INTO insignias (nombre, descripcion, icono, tipo, criterio) VALUES
('Primer Paso', 'Completaste tu primera inscripción en un curso', '🎓', 'inscripcion', '{"tipo": "inscripciones", "cantidad": 1}'),
('Estudiante Dedicado', 'Completaste 5 inscripciones', '📚', 'inscripcion', '{"tipo": "inscripciones", "cantidad": 5}'),
('Aprendiz Exitoso', 'Aprobaste tu primer cuestionario con más de 70', '🏆', 'cuestionario', '{"tipo": "calificacion", "nota_minima": 70}'),
('Excellence', 'Aprobaste 5 cuestionarios con más de 90', '⭐', 'cuestionario', '{"tipo": "calificacion", "nota_minima": 90, "cantidad": 5}'),
('Entregador', 'Entregaste tu primera tarea', '📝', 'tarea', '{"tipo": "entregas", "cantidad": 1}'),
('Productivo', 'Entregaste 10 tareas', '🚀', 'tarea', '{"tipo": "entregas", "cantidad": 10}'),
('Participativo', 'Publicaste tu primer mensaje en el foro', '💬', 'foro', '{"tipo": "mensajes", "cantidad": 1}'),
('Conversador', 'Publicaste 20 mensajes en el foro', '🗣️', 'foro', '{"tipo": "mensajes", "cantidad": 20}'),
('Primeros Pasos', 'Completaste el 25% de un curso', '🌱', 'progreso', '{"tipo": "progreso", "porcentaje": 25}'),
('En Camino', 'Completaste el 50% de un curso', '🚶', 'progreso', '{"tipo": "progreso", "porcentaje": 50}'),
('Casi Graduado', 'Completaste el 75% de un curso', '🎯', 'progreso', '{"tipo": "progreso", "porcentaje": 75}'),
('Graduado', 'Completaste el 100% de un curso', '🎖️', 'progreso', '{"tipo": "progreso", "porcentaje": 100}')
ON CONFLICT DO NOTHING;
