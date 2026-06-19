import api from './api';
import { Alert } from '@/types/finance.types';

// API Response wrapper type
interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

export const alertsService = {
    async getUnreadCount(): Promise<{ count: number }> {
        const response = await api.get<ApiResponse<{ count: number }>>('/alerts/unread-count');
        return response.data.data;
    },

    async getAll(params?: { isRead?: boolean; type?: string; severity?: 'info' | 'warning' | 'critical' }): Promise<Alert[]> {
        const response = await api.get<ApiResponse<Alert[]>>('/alerts', { params });
        return response.data.data;
    },

    async getById(id: string): Promise<Alert> {
        const response = await api.get<ApiResponse<Alert>>(`/alerts/${id}`);
        return response.data.data;
    },

    async markAsRead(id: string): Promise<void> {
        await api.put(`/alerts/${id}/read`);
    },

    async markAllAsRead(): Promise<void> {
        await api.put('/alerts/read-all');
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/alerts/${id}`);
    },

    async generate(): Promise<void> {
        await api.post('/alerts/generate', {});
    }
};

export default alertsService;
