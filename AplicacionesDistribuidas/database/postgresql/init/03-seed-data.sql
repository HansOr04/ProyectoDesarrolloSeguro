-- =============================================
-- TRIAGE REMOTO - DATOS INICIALES (SEED)
-- =============================================

-- Conectar a auth_db
\c auth_db;

-- Insertar usuarios de prueba
-- Contraseñas hasheadas con bcrypt (10 rounds):
-- admin123, doctor123, paciente123

INSERT INTO users (id, email, password_hash, role, nombre, apellido, specialty, registration_number, is_active) VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'admin@triage.com', '$2a$10$uFJIyvmxkF9GGiahFdGhcO4JOYymYh6llTDM/dCZn9eIln4dpxYBa', 'ADMIN', 'Administrador', 'Sistema', NULL, NULL, true),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'doctor@triage.com', '$2a$10$SAwgEGEWa8aQT1mG/Cl3HOvqw72TmxVR23vLgv1uqhwpVDzI9vVN2', 'DOCTOR', 'María', 'González', 'Medicina General', 'MED-2024-001', true),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'doctor2@triage.com', '$2a$10$SAwgEGEWa8aQT1mG/Cl3HOvqw72TmxVR23vLgv1uqhwpVDzI9vVN2', 'DOCTOR', 'Carlos', 'Rodríguez', 'Cardiología', 'MED-2024-002', true),
    ('d4e5f6a7-b8c9-0123-defa-234567890123', 'doctor3@triage.com', '$2a$10$SAwgEGEWa8aQT1mG/Cl3HOvqw72TmxVR23vLgv1uqhwpVDzI9vVN2', 'DOCTOR', 'Ana', 'Martínez', 'Pediatría', 'MED-2024-003', true),
    ('e5f6a7b8-c9d0-1234-efab-345678901234', 'paciente@triage.com', '$2a$10$v9k11AnK2d7ecvL9UA74XOMwuKM08YyzAwQqcV1EKlrs59L7kNINW', 'PATIENT', 'Juan', 'Pérez', NULL, NULL, true)
ON CONFLICT (email) DO NOTHING;

-- =============================================
-- Conectar a patient_db
\c patient_db;

-- Insertar paciente de prueba
INSERT INTO patients (id, user_id, cedula, nombres, apellidos, fecha_nacimiento, edad, sexo, telefono, email, direccion, ciudad, provincia, enfermedades_cronicas, alergias) VALUES
    ('f6a7b8c9-d0e1-2345-fabc-456789012345', 'e5f6a7b8-c9d0-1234-efab-345678901234', '1234567890', 'Juan', 'Pérez López', '1985-03-15', 39, 'M', '0991234567', 'paciente@triage.com', 'Av. Principal 123', 'Guayaquil', 'Guayas', ARRAY['Hipertensión'], ARRAY['Penicilina'])
ON CONFLICT (cedula) DO NOTHING;

-- =============================================
-- Conectar a appointment_db
\c appointment_db;

-- Insertar disponibilidad de doctores (Lunes a Viernes, 8am-5pm)
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, is_available) VALUES
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 1, '08:00', '17:00', true),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 2, '08:00', '17:00', true),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 3, '08:00', '17:00', true),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 4, '08:00', '17:00', true),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 5, '08:00', '17:00', true),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 1, '09:00', '18:00', true),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 2, '09:00', '18:00', true),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 3, '09:00', '18:00', true),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 4, '09:00', '18:00', true),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 5, '09:00', '18:00', true),
    ('d4e5f6a7-b8c9-0123-defa-234567890123', 1, '07:00', '15:00', true),
    ('d4e5f6a7-b8c9-0123-defa-234567890123', 2, '07:00', '15:00', true),
    ('d4e5f6a7-b8c9-0123-defa-234567890123', 3, '07:00', '15:00', true),
    ('d4e5f6a7-b8c9-0123-defa-234567890123', 4, '07:00', '15:00', true),
    ('d4e5f6a7-b8c9-0123-defa-234567890123', 5, '07:00', '15:00', true)
ON CONFLICT DO NOTHING;
