import api from './api';
import { Category, CategoryStats, TransactionType } from '@/types/finance.types';

// API Response wrapper type
interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    total?: number;
}

export const categoriesService = {
    async getAll(params?: { type?: TransactionType; isDefault?: boolean; search?: string }): Promise<Category[]> {
        const response = await api.get<ApiResponse<Category[]>>('/categories', { params });
        return response.data.data; // Extract data from wrapper
    },

    async getById(id: string): Promise<Category> {
        const response = await api.get<ApiResponse<Category>>(`/categories/${id}`);
        return response.data.data; // Extract data from wrapper
    },

    async create(data: Partial<Category>): Promise<Category> {
        const response = await api.post<ApiResponse<Category>>('/categories', data);
        return response.data.data; // Extract data from wrapper
    },

    async update(id: string, data: Partial<Category>): Promise<Category> {
        const response = await api.put<ApiResponse<Category>>(`/categories/${id}`, data);
        return response.data.data; // Extract data from wrapper
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/categories/${id}`);
    },

    async getStats(): Promise<CategoryStats[]> {
        const response = await api.get<ApiResponse<CategoryStats[]>>('/categories/stats');
        return response.data.data; // Extract data from wrapper
    }
};

export default categoriesService;
