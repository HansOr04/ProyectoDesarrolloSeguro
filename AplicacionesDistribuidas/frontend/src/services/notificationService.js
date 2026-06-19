import api from './authService'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export const notificationService = {
    /**
     * Get all notifications for current user
     */
    getAll: async (page = 1, limit = 20) => {
        const response = await api.get(`${BASE_URL}/notifications`, {
            params: { page, limit }
        })
        return response.data
    },

    /**
     * Get unread notifications count
     */
    getUnreadCount: async () => {
        const response = await api.get(`${BASE_URL}/notifications/unread-count`)
        return response.data
    },

    /**
     * Mark notification as read
     */
    markAsRead: async (id) => {
        const response = await api.patch(`${BASE_URL}/notifications/${id}/read`)
        return response.data
    },

    /**
     * Mark all notifications as read
     */
    markAllAsRead: async () => {
        const response = await api.patch(`${BASE_URL}/notifications/read-all`)
        return response.data
    },

    /**
     * Get notification preferences
     */
    getPreferences: async () => {
        const response = await api.get(`${BASE_URL}/notifications/preferences`)
        return response.data
    },

    /**
     * Update notification preferences
     */
    updatePreferences: async (preferences) => {
        const response = await api.put(`${BASE_URL}/notifications/preferences`, preferences)
        return response.data
    }
}

export default notificationService
