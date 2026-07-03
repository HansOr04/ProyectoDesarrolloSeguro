import axios from 'axios'
import keycloakService from './keycloakService'
import { API_ENDPOINTS } from '../config/apiConfig'

// Create axios instance with interceptors
const api = axios.create()

// SSO users: token from Keycloak SDK (in-memory, auto-refreshed — never localStorage)
// Local JWT users: token from localStorage (stored by login())
api.interceptors.request.use(
    (config) => {
        const token = keycloakService.getToken() || localStorage.getItem('accessToken')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('user')
            globalThis.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

export const authService = {
    login: async (email, password) => {
        try {
            const response = await axios.post(API_ENDPOINTS.AUTH.LOGIN, { email, password })
            return response.data
        } catch (error) {
            return { success: false, error: error.response?.data?.error || { message: 'Login failed' } }
        }
    },

    register: async (userData) => {
        try {
            const response = await axios.post(API_ENDPOINTS.AUTH.REGISTER, userData)
            return response.data
        } catch (error) {
            return { success: false, error: error.response?.data?.error || { message: 'Registration failed' } }
        }
    },

    registerKeycloak: async (userData) => {
        try {
            const response = await axios.post(API_ENDPOINTS.AUTH.REGISTER_KEYCLOAK, userData)
            return response.data
        } catch (error) {
            return { success: false, error: error.response?.data?.error || { message: 'Error al registrar en Keycloak' } }
        }
    },

    getProfile: async () => {
        const response = await api.get(API_ENDPOINTS.AUTH.PROFILE)
        return response.data
    },

    getDoctors: async (specialty) => {
        const params = specialty ? { specialty } : {}
        const response = await api.get(API_ENDPOINTS.AUTH.DOCTORS, { params })
        return response.data
    }
}

export default api
