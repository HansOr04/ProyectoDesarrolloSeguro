import api from './api';
import { ComparisonData } from '@/types/finance.types';

// API Response wrapper type
interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

export const comparisonsService = {
    async getByCategory(params: {
        categoryId: string;
        startDate?: string;  // Formato: YYYY-MM-DD
        endDate?: string;    // Formato: YYYY-MM-DD
    }): Promise<ComparisonData> {
        const response = await api.get<ApiResponse<ComparisonData>>('/comparisons/category', { params });
        return response.data.data;
    },

    async getTemporal(params: {
        period: 'month' | 'quarter' | 'year';
        type?: 'income' | 'expense';
    }): Promise<any> {
        const response = await api.get<ApiResponse<any>>('/comparisons/temporal', { params });
        return response.data.data;
    },

    async getRealVsPredicted(predictionId: string): Promise<any> {
        const response = await api.get<ApiResponse<any>>(`/comparisons/real-vs-predicted/${predictionId}`);
        return response.data.data;
    },

    async comparePeriods(periods: Array<{ startDate: string; endDate: string }>): Promise<any> {
        const response = await api.post<ApiResponse<any>>('/comparisons/periods', { periods });
        return response.data.data;
    },

    async compareUsers(data: {
        userIds: string[];
        startDate: string;  // Formato: YYYY-MM-DD
        endDate: string;    // Formato: YYYY-MM-DD
    }): Promise<any> {
        const response = await api.post<ApiResponse<any>>('/comparisons/users', data);
        return response.data.data;
    },

    async compareCategories(categoryAId: string, categoryBId: string, period: 'month' | 'quarter' | 'year'): Promise<any> {
        const response = await api.post<ApiResponse<any>>('/comparisons/compare-categories', {
            categoryAId,
            categoryBId,
            period
        });
        return response.data.data;
    }
};

export default comparisonsService;
