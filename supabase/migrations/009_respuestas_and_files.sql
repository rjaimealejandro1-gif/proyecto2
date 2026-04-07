-- Migration 009: Create respuestas table and add file support for entregas

-- Table: respuestas (answer options for quiz questions)
CREATE TABLE IF NOT EXISTS respuestas (
    id_respuesta SERIAL PRIMARY KEY,
    id_pregunta INTEGER REFERENCES preguntas(id_pregunta) ON DELETE CASCADE,
    texto_respuesta TEXT NOT NULL,
    es_correcta BOOLEAN DEFAULT FALSE,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_respuestas_id_pregunta ON respuestas(id_pregunta);

-- Add archivo_url column to entregas for file uploads
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS archivo_url TEXT;
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS archivo_nombre TEXT;
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS archivo_tipo TEXT;
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS archivo_tamano BIGINT;
