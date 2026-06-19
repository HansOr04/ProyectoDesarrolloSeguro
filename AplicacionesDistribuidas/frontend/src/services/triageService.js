import api from './authService'
import { API_ENDPOINTS } from '../config/apiConfig'

export const patientService = {
    search: async (searchTerm) => {
        const response = await api.get(API_ENDPOINTS.PATIENTS.BASE, {
            params: { search: searchTerm, limit: 10 }
        })
        return response.data
    },

    getAll: async (page = 1, limit = 10) => {
        const response = await api.get(API_ENDPOINTS.PATIENTS.BASE, {
            params: { page, limit }
        })
        return response.data
    },

    getById: async (id) => {
        const response = await api.get(API_ENDPOINTS.PATIENTS.BY_ID(id))
        return response.data
    },

    create: async (patientData) => {
        const response = await api.post(API_ENDPOINTS.PATIENTS.BASE, patientData)
        return response.data
    },

    update: async (id, patientData) => {
        const response = await api.put(API_ENDPOINTS.PATIENTS.BY_ID(id), patientData)
        return response.data
    }
}

export const triageService = {
    getQuestionnaire: async () => {
        const response = await api.get(API_ENDPOINTS.TRIAGE.QUESTIONNAIRE)
        return response.data
    },

    submitQuestionnaire: async (patientId, responses) => {
        const response = await api.post(API_ENDPOINTS.TRIAGE.CLASSIFY, {
            patient_id: patientId,
            responses
        })
        return response.data
    },

    getTriageById: async (id) => {
        const response = await api.get(API_ENDPOINTS.TRIAGE.BY_ID(id))
        return response.data
    },

    getPatientTriages: async (patientId) => {
        const response = await api.get(API_ENDPOINTS.TRIAGE.BY_PATIENT(patientId))
        return response.data
    },

    getPendingTriages: async (classification) => {
        const params = classification ? { classification } : {}
        const response = await api.get(API_ENDPOINTS.TRIAGE.PENDING, { params })
        return response.data
    },

    getStats: async (startDate, endDate) => {
        const params = {}
        if (startDate) params.start_date = startDate
        if (endDate) params.end_date = endDate
        const response = await api.get(API_ENDPOINTS.TRIAGE.STATS, { params })
        return response.data
    },

    // Alias for compatibility
    getById: async (id) => {
        const response = await api.get(API_ENDPOINTS.TRIAGE.BY_ID(id))
        return response.data
    }
}

export const appointmentService = {
    create: async (appointmentData) => {
        const response = await api.post(API_ENDPOINTS.APPOINTMENTS.BASE, appointmentData)
        return response.data
    },

    getAll: async (filters) => {
        const response = await api.get(API_ENDPOINTS.APPOINTMENTS.BASE, { params: filters })
        return response.data
    },

    getById: async (id) => {
        const response = await api.get(API_ENDPOINTS.APPOINTMENTS.BY_ID(id))
        return response.data
    },

    getAvailableSlots: async (doctorId, date) => {
        const response = await api.get(API_ENDPOINTS.APPOINTMENTS.AVAILABLE_SLOTS, {
            params: { doctor_id: doctorId, date }
        })
        return response.data
    },

    updateStatus: async (id, status, notes) => {
        const response = await api.patch(API_ENDPOINTS.APPOINTMENTS.STATUS(id), { status, notes })
        return response.data
    },

    getJoinUrl: async (appointmentId, isDoctor) => {
        const endpoint = isDoctor
            ? API_ENDPOINTS.APPOINTMENTS.JOIN_DOCTOR(appointmentId)
            : API_ENDPOINTS.APPOINTMENTS.JOIN_PATIENT(appointmentId)
        const response = await api.get(endpoint)
        return response.data
    }
}

export const analyticsService = {
    getKPIs: async (startDate, endDate) => {
        const params = {}
        if (startDate) params.start_date = startDate
        if (endDate) params.end_date = endDate
        const response = await api.get(API_ENDPOINTS.ANALYTICS.KPIS, { params })
        return response.data
    },

    getDashboard: async () => {
        const response = await api.get(API_ENDPOINTS.ANALYTICS.DASHBOARD)
        return response.data
    }
}
