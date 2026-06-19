import axios from 'axios'
import { API_ENDPOINTS } from '../config/apiConfig'

// Create axios instance with interceptors
const api = axios.create()

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Try to refresh token
            const refreshToken = localStorage.getItem('refreshToken')
            if (refreshToken) {
                try {
                    const response = await axios.post(API_ENDPOINTS.AUTH.REFRESH, { refreshToken })
                    localStorage.setItem('accessToken', response.data.data.accessToken)
                    error.config.headers.Authorization = `Bearer ${response.data.data.accessToken}`
                    return api.request(error.config)
                } catch {
                    localStorage.clear()
                    window.location.href = '/login'
                }
            }
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
