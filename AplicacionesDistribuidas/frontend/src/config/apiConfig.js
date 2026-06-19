// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export const API_ENDPOINTS = {
    // Auth Service
    AUTH: {
        LOGIN: `${API_BASE_URL}/auth/login`,
        REGISTER: `${API_BASE_URL}/auth/register`,
        REFRESH: `${API_BASE_URL}/auth/refresh-token`,
        PROFILE: `${API_BASE_URL}/auth/profile`,
        DOCTORS: `${API_BASE_URL}/auth/doctors`
    },

    // Patient Service
    PATIENTS: {
        BASE: `${API_BASE_URL}/patients`,
        BY_ID: (id) => `${API_BASE_URL}/patients/${id}`,
        BY_USER: (userId) => `${API_BASE_URL}/patients/user/${userId}`,
        MEDICAL_HISTORY: (id) => `${API_BASE_URL}/patients/${id}/medical-history`
    },

    // Triage Service
    TRIAGE: {
        QUESTIONNAIRE: `${API_BASE_URL}/triage/questionnaire`,
        CLASSIFY: `${API_BASE_URL}/triage/classify`,
        BY_ID: (id) => `${API_BASE_URL}/triage/${id}`,
        BY_PATIENT: (patientId) => `${API_BASE_URL}/triage/patient/${patientId}`,
        PENDING: `${API_BASE_URL}/triage/pending`,
        STATS: `${API_BASE_URL}/triage/stats`
    },

    // Appointment Service
    APPOINTMENTS: {
        BASE: `${API_BASE_URL}/appointments`,
        BY_ID: (id) => `${API_BASE_URL}/appointments/${id}`,
        AVAILABLE_SLOTS: `${API_BASE_URL}/appointments/available-slots`,
        STATUS: (id) => `${API_BASE_URL}/appointments/${id}/status`,
        TELECONSULT_ROOM: (id) => `${API_BASE_URL}/appointments/teleconsult/${id}/room`,
        JOIN_PATIENT: (id) => `${API_BASE_URL}/appointments/teleconsult/${id}/join/patient`,
        JOIN_DOCTOR: (id) => `${API_BASE_URL}/appointments/teleconsult/${id}/join/doctor`
    },

    // Prescriptions
    PRESCRIPTIONS: {
        BASE: `${API_BASE_URL}/prescriptions`,
        BY_PATIENT: (patientId) => `${API_BASE_URL}/prescriptions/patient/${patientId}`,
        VERIFY: (code) => `${API_BASE_URL}/prescriptions/verify/${code}`
    },

    // Follow-up Service
    FOLLOWUP: {
        BY_PATIENT: (patientId) => `${API_BASE_URL}/followup/patient/${patientId}`,
        BY_ID: (id) => `${API_BASE_URL}/followup/${id}`,
        RESPONSE: (id) => `${API_BASE_URL}/followup/${id}/response`
    },

    // Analytics Service
    ANALYTICS: {
        KPIS: `${API_BASE_URL}/analytics/kpis`,
        DASHBOARD: `${API_BASE_URL}/analytics/dashboard`
    }
}

export default API_BASE_URL
