// Roles del sistema
const ROLES = {
    PATIENT: 'PATIENT',
    DOCTOR: 'DOCTOR',
    ADMIN: 'ADMIN'
};

// Clasificaciones de triage
const TRIAGE_CLASSIFICATIONS = {
    ROJO: 'ROJO',       // Urgencia Alta - Atención Inmediata
    AMARILLO: 'AMARILLO', // Urgencia Moderada - Teleconsulta en 24h
    VERDE: 'VERDE'      // Urgencia Baja - Teleconsulta en 48-72h
};

// Estados de citas
const APPOINTMENT_STATUS = {
    AGENDADA: 'AGENDADA',
    CONFIRMADA: 'CONFIRMADA',
    EN_CURSO: 'EN_CURSO',
    COMPLETADA: 'COMPLETADA',
    CANCELADA: 'CANCELADA',
    NO_ASISTIO: 'NO_ASISTIO'
};

// Estados de triage
const TRIAGE_STATUS = {
    PENDIENTE: 'PENDIENTE',
    EN_ATENCION: 'EN_ATENCION',
    ATENDIDO: 'ATENDIDO',
    DERIVADO: 'DERIVADO'
};

// Estados de seguimiento
const FOLLOWUP_STATUS = {
    PENDIENTE: 'PENDIENTE',
    ENVIADO: 'ENVIADO',
    COMPLETADO: 'COMPLETADO',
    EXPIRADO: 'EXPIRADO'
};

// Tipos de seguimiento
const FOLLOWUP_TYPES = {
    '24H': '24H',
    '48H': '48H',
    '7D': '7D',
    '30D': '30D'
};

// Tipos de alerta
const ALERT_TYPES = {
    EMPEORAMIENTO: 'EMPEORAMIENTO',
    SIN_RESPUESTA: 'SIN_RESPUESTA',
    URGENTE: 'URGENTE',
    REVISION: 'REVISION'
};

// Severidad de alertas
const ALERT_SEVERITY = {
    BAJA: 'BAJA',
    MEDIA: 'MEDIA',
    ALTA: 'ALTA',
    CRITICA: 'CRITICA'
};

// Tipos de notificación
const NOTIFICATION_TYPES = {
    APPOINTMENT_CONFIRMED: 'APPOINTMENT_CONFIRMED',
    REMINDER_24H: 'REMINDER_24H',
    REMINDER_2H: 'REMINDER_2H',
    DOCTOR_JOINED: 'DOCTOR_JOINED',
    PRESCRIPTION_READY: 'PRESCRIPTION_READY',
    FOLLOWUP_REMINDER: 'FOLLOWUP_REMINDER',
    TRIAGE_RESULT: 'TRIAGE_RESULT',
    ALERT: 'ALERT'
};

// Estados de referencia
const REFERRAL_STATUS = {
    PENDIENTE: 'PENDIENTE',
    ATENDIDA: 'ATENDIDA',
    RECHAZADA: 'RECHAZADA',
    CANCELADA: 'CANCELADA'
};

// Urgencia de referencia
const REFERRAL_URGENCY = {
    BAJA: 'BAJA',
    MEDIA: 'MEDIA',
    ALTA: 'ALTA'
};

// Especialidades médicas
const MEDICAL_SPECIALTIES = [
    'Medicina General',
    'Cardiología',
    'Dermatología',
    'Endocrinología',
    'Gastroenterología',
    'Geriatría',
    'Ginecología',
    'Hematología',
    'Infectología',
    'Medicina Interna',
    'Nefrología',
    'Neumología',
    'Neurología',
    'Nutrición',
    'Oftalmología',
    'Oncología',
    'Otorrinolaringología',
    'Pediatría',
    'Psiquiatría',
    'Psicología',
    'Reumatología',
    'Traumatología',
    'Urología'
];

// Enfermedades crónicas comunes
const CHRONIC_DISEASES = [
    'Diabetes',
    'Hipertensión',
    'Enfermedad cardíaca',
    'Asma',
    'EPOC',
    'Artritis',
    'Enfermedad renal',
    'Cáncer',
    'VIH/SIDA',
    'Enfermedad hepática',
    'Epilepsia',
    'Depresión',
    'Ansiedad',
    'Obesidad',
    'Ninguna'
];

module.exports = {
    ROLES,
    TRIAGE_CLASSIFICATIONS,
    APPOINTMENT_STATUS,
    TRIAGE_STATUS,
    FOLLOWUP_STATUS,
    FOLLOWUP_TYPES,
    ALERT_TYPES,
    ALERT_SEVERITY,
    NOTIFICATION_TYPES,
    REFERRAL_STATUS,
    REFERRAL_URGENCY,
    MEDICAL_SPECIALTIES,
    CHRONIC_DISEASES
};
