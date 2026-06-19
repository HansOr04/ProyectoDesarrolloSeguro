import api from './authService'
import { API_ENDPOINTS } from '../config/apiConfig'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export const followupService = {
    /**
     * Get followups for a patient
     */
    getByPatient: async (patientId) => {
        const response = await api.get(API_ENDPOINTS.FOLLOWUP.BY_PATIENT(patientId))
        return response.data
    },

    /**
     * Get followup by ID
     */
    getById: async (id) => {
        const response = await api.get(API_ENDPOINTS.FOLLOWUP.BY_ID(id))
        return response.data
    },

    /**
     * Submit response to followup
     */
    submitResponse: async (id, responseData) => {
        const response = await api.post(API_ENDPOINTS.FOLLOWUP.RESPONSE(id), responseData)
        return response.data
    },

    /**
     * Get pending followups (for doctors/admin)
     */
    getPending: async () => {
        const response = await api.get(`${BASE_URL}/followup/admin/pending`)
        return response.data
    },

    /**
     * Get followups requiring attention
     */
    getAttention: async () => {
        const response = await api.get(`${BASE_URL}/followup/admin/attention`)
        return response.data
    }
}

export default followupService
