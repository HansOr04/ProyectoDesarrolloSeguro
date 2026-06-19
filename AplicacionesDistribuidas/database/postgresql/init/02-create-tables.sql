-- =============================================
-- TRIAGE REMOTO - SCHEMA DE BASE DE DATOS
-- =============================================

-- Conectar a auth_db
\c auth_db;

-- Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('PATIENT', 'DOCTOR', 'ADMIN')),
    nombre VARCHAR(100),
    apellido VARCHAR(100),
    specialty VARCHAR(50),
    registration_number VARCHAR(50),
    telefono VARCHAR(15),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =============================================
-- Conectar a patient_db
\c patient_db;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabla de pacientes
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    cedula VARCHAR(10) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE,
    edad INTEGER,
    sexo VARCHAR(10) CHECK (sexo IN ('M', 'F', 'Otro')),
    telefono VARCHAR(15),
    email VARCHAR(100) UNIQUE NOT NULL,
    direccion TEXT,
    ciudad VARCHAR(100),
    provincia VARCHAR(100),
    enfermedades_cronicas TEXT[],
    alergias TEXT[],
    medicamentos_actuales TEXT[],
    contacto_emergencia_nombre VARCHAR(100),
    contacto_emergencia_telefono VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_patients_cedula ON patients(cedula);
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);

-- =============================================
-- Conectar a triage_db
\c triage_db;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabla de triages
CREATE TABLE IF NOT EXISTS triages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    classification VARCHAR(20) NOT NULL CHECK (classification IN ('ROJO', 'AMARILLO', 'VERDE')),
    score INTEGER NOT NULL,
    symptoms_detected JSONB,
    critical_flags TEXT[],
    decision_log JSONB,
    recommendation TEXT,
    classified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by_doctor BOOLEAN DEFAULT false,
    doctor_id UUID,
    doctor_notes TEXT,
    reviewed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'EN_ATENCION', 'ATENDIDO', 'DERIVADO'))
);

-- Tabla de respuestas del cuestionario
CREATE TABLE IF NOT EXISTS questionnaire_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    triage_id UUID REFERENCES triages(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(30) NOT NULL,
    answer_value JSONB NOT NULL,
    score_contribution INTEGER DEFAULT 0,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_triages_patient ON triages(patient_id);
CREATE INDEX IF NOT EXISTS idx_triages_classification ON triages(classification);
CREATE INDEX IF NOT EXISTS idx_triages_status ON triages(status);
CREATE INDEX IF NOT EXISTS idx_triages_classified_at ON triages(classified_at);
CREATE INDEX IF NOT EXISTS idx_questionnaire_triage ON questionnaire_responses(triage_id);

-- =============================================
-- Conectar a appointment_db
\c appointment_db;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabla de citas
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    triage_id UUID,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status VARCHAR(20) DEFAULT 'AGENDADA' CHECK (status IN ('AGENDADA', 'CONFIRMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO')),
    meeting_url VARCHAR(255),
    meeting_room_name VARCHAR(100),
    reason TEXT,
    notes TEXT,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de recetas
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_code VARCHAR(20) UNIQUE NOT NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    doctor_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    diagnosis TEXT NOT NULL,
    medications JSONB NOT NULL,
    additional_instructions TEXT,
    digital_signature TEXT,
    qr_code TEXT,
    pdf_url VARCHAR(255),
    valid_until DATE,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de referencias
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code VARCHAR(20) UNIQUE NOT NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    referring_doctor_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    specialty_required VARCHAR(100) NOT NULL,
    reason TEXT NOT NULL,
    urgency VARCHAR(10) DEFAULT 'MEDIA' CHECK (urgency IN ('BAJA', 'MEDIA', 'ALTA')),
    clinical_summary TEXT,
    suggested_exams TEXT[],
    status VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'ATENDIDA', 'RECHAZADA', 'CANCELADA')),
    pdf_url VARCHAR(255),
    valid_until DATE,
    attended_by_doctor_id UUID,
    attended_at TIMESTAMP,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de disponibilidad de doctores
CREATE TABLE IF NOT EXISTS doctor_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_referrals_patient ON referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_doctor_availability ON doctor_availability(doctor_id, day_of_week);

-- =============================================
-- Conectar a followup_db
\c followup_db;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabla de seguimientos
CREATE TABLE IF NOT EXISTS followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    scheduled_for TIMESTAMP NOT NULL,
    sent_at TIMESTAMP,
    completed_at TIMESTAMP,
    questions_responses JSONB,
    improvement_score INTEGER CHECK (improvement_score >= 1 AND improvement_score <= 5),
    symptoms_improved BOOLEAN,
    new_symptoms TEXT,
    requires_attention BOOLEAN DEFAULT false,
    doctor_notified BOOLEAN DEFAULT false,
    doctor_notified_at TIMESTAMP,
    followup_type VARCHAR(20) NOT NULL CHECK (followup_type IN ('24H', '48H', '7D', '30D')),
    status VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'ENVIADO', 'COMPLETADO', 'EXPIRADO')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de alertas
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    followup_id UUID REFERENCES followups(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL,
    doctor_id UUID,
    alert_type VARCHAR(30) NOT NULL CHECK (alert_type IN ('EMPEORAMIENTO', 'SIN_RESPUESTA', 'URGENTE', 'REVISION')),
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    resolved_by UUID,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_followups_patient ON followups(patient_id);
CREATE INDEX IF NOT EXISTS idx_followups_appointment ON followups(appointment_id);
CREATE INDEX IF NOT EXISTS idx_followups_scheduled ON followups(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_followups_status ON followups(status);
CREATE INDEX IF NOT EXISTS idx_alerts_patient ON alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_alerts_doctor ON alerts(doctor_id);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(is_read) WHERE is_read = false;

-- =============================================
-- Conectar a analytics_db
\c analytics_db;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Vista materializada para KPIs (se actualiza periódicamente)
-- Por ahora solo creamos una tabla de resúmenes diarios
CREATE TABLE IF NOT EXISTS daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stat_date DATE UNIQUE NOT NULL,
    total_patients_registered INTEGER DEFAULT 0,
    total_triages INTEGER DEFAULT 0,
    triages_rojo INTEGER DEFAULT 0,
    triages_amarillo INTEGER DEFAULT 0,
    triages_verde INTEGER DEFAULT 0,
    teleconsults_scheduled INTEGER DEFAULT 0,
    teleconsults_completed INTEGER DEFAULT 0,
    teleconsults_cancelled INTEGER DEFAULT 0,
    prescriptions_issued INTEGER DEFAULT 0,
    referrals_issued INTEGER DEFAULT 0,
    avg_wait_time_minutes DECIMAL(10,2),
    avg_consult_duration_minutes DECIMAL(10,2),
    followups_sent INTEGER DEFAULT 0,
    followups_completed INTEGER DEFAULT 0,
    alerts_generated INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de configuración de reportes
CREATE TABLE IF NOT EXISTS report_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    query_template TEXT NOT NULL,
    parameters JSONB,
    schedule_cron VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(stat_date);
