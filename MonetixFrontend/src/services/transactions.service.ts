import api from './api';
import { Transaction, TransactionType, TransactionStatistics, TransactionByCategory, TransactionByPeriod } from '@/types/finance.types';

export interface TransactionFilters {
    type?: TransactionType;
    categoryId?: string;
    startDate?: string;  // Formato: YYYY-MM-DD
    endDate?: string;    // Formato: YYYY-MM-DD
    minAmount?: number;
    maxAmount?: number;
    page?: number;
    limit?: number;
}

// API Response wrapper type
interface ApiResponseWrapper<T> {
    success: boolean;
    message: string;
    data: T;
}

// Tipo para la respuesta de transacciones con paginación
interface TransactionsApiResponse {
    success: boolean;
    message: string;
    data: Transaction[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

export const transactionsService = {
    async getAll(params?: TransactionFilters): Promise<TransactionsApiResponse> {
        const response = await api.get<TransactionsApiResponse>('/transactions', { params });
        return response.data;
    },

    async getById(id: string): Promise<Transaction> {
        const response = await api.get<ApiResponseWrapper<Transaction>>(`/transactions/${id}`);
        return response.data.data;
    },

    async create(data: Partial<Transaction>): Promise<Transaction> {
        const response = await api.post<ApiResponseWrapper<Transaction>>('/transactions', data);
        return response.data.data;
    },

    async update(id: string, data: Partial<Transaction>): Promise<Transaction> {
        const response = await api.put<ApiResponseWrapper<Transaction>>(`/transactions/${id}`, data);
        return response.data.data;
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/transactions/${id}`);
    },

    async getStatistics(params?: { startDate?: string; endDate?: string }): Promise<TransactionStatistics> {
        const response = await api.get<ApiResponseWrapper<TransactionStatistics>>('/transactions/statistics', { params });
        return response.data.data;
    },

    async getByCategory(params?: {
        startDate?: string;
        endDate?: string;
        type?: 'income' | 'expense';
    }): Promise<TransactionByCategory[]> {
        const response = await api.get<ApiResponseWrapper<TransactionByCategory[]>>('/transactions/by-category', { params });
        return response.data.data;
    },

    async getByPeriod(params: {
        period: 'day' | 'week' | 'month' | 'year';
        startDate?: string;  // Formato: YYYY-MM-DD
        endDate?: string;    // Formato: YYYY-MM-DD
    }): Promise<TransactionByPeriod[]> {
        const response = await api.get<ApiResponseWrapper<TransactionByPeriod[]>>('/transactions/by-period', { params });
        return response.data.data;
    }
};

export default transactionsService;
