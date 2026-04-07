-- Add numero_identificacion column to usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS numero_identificacion VARCHAR(50) UNIQUE;

-- Create admin user
INSERT INTO usuarios (nombre, email, contraseña_hash, id_rol, numero_identificacion, fecha_registro)
VALUES ('Administrador', 'admin@tese.edu.mx', 'tese202320483', 1, 'Teseeducativo05', NOW())
ON CONFLICT (numero_identificacion) DO NOTHING;
