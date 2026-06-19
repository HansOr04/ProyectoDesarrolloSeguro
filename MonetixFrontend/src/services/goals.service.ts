import api from './api';
import { Goal, GoalStatus, GoalProjection } from '@/types/finance.types';

// API Response wrapper type
interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

export const goalsService = {
    async getAll(params?: { status?: GoalStatus; sortBy?: string; sortOrder?: 'asc' | 'desc' }): Promise<Goal[]> {
        const response = await api.get<ApiResponse<Goal[]>>('/goals', { params });
        return response.data.data;
    },

    async getById(id: string): Promise<Goal> {
        const response = await api.get<ApiResponse<Goal>>(`/goals/${id}`);
        return response.data.data;
    },

    async getProjection(id: string): Promise<GoalProjection> {
        const response = await api.get<ApiResponse<GoalProjection>>(`/goals/${id}/projection`);
        return response.data.data;
    },

    async create(data: Partial<Goal>): Promise<Goal> {
        const response = await api.post<ApiResponse<Goal>>('/goals', data);
        return response.data.data;
    },

    async update(id: string, data: Partial<Goal>): Promise<Goal> {
        const response = await api.put<ApiResponse<Goal>>(`/goals/${id}`, data);
        return response.data.data;
    },

    async updateProgress(id: string, amount: number): Promise<Goal> {
        const response = await api.put<ApiResponse<Goal>>(`/goals/${id}/progress`, { amount });
        return response.data.data;
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/goals/${id}`);
    }
};

export default goalsService;
