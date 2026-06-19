import api from './authService'
import { API_ENDPOINTS } from '../config/apiConfig'

export const prescriptionService = {
    /**
     * Create a new prescription
     */
    create: async (prescriptionData) => {
        const response = await api.post(API_ENDPOINTS.PRESCRIPTIONS.BASE, prescriptionData)
        return response.data
    },

    /**
     * Get prescriptions by patient
     */
    getByPatient: async (patientId) => {
        const response = await api.get(API_ENDPOINTS.PRESCRIPTIONS.BY_PATIENT(patientId))
        return response.data
    },

    /**
     * Get prescription by ID
     */
    getById: async (id) => {
        const response = await api.get(`${API_ENDPOINTS.PRESCRIPTIONS.BASE}/${id}`)
        return response.data
    },

    /**
     * Verify prescription by code
     */
    verify: async (code) => {
        const response = await api.get(API_ENDPOINTS.PRESCRIPTIONS.VERIFY(code))
        return response.data
    },

    /**
     * Download prescription PDF
     */
    download: async (id) => {
        const response = await api.get(`${API_ENDPOINTS.PRESCRIPTIONS.BASE}/${id}/download`, {
            responseType: 'blob'
        })
        return response.data
    }
}

export default prescriptionService
