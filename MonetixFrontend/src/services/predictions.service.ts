import api from './api';
import { Prediction, PredictionInsights, TransactionType } from '@/types/finance.types';

// API Response wrapper type
interface ApiResponseWrapper<T> {
    success: boolean;
    message: string;
    data: T;
}

export interface GeneratePredictionParams {
    type: TransactionType;
    categoryId?: string; // Optional for global predictions
    months: number;
    modelType: 'linear_regression' | 'moving_average' | 'exponential_smoothing';
}

export const predictionsService = {
    async getAll(params?: { type?: TransactionType; categoryId?: string }): Promise<Prediction[]> {
        const response = await api.get<ApiResponseWrapper<Prediction[]>>('/predictions', { params });
        return response.data.data;
    },

    async generate(data: GeneratePredictionParams): Promise<Prediction> {
        const response = await api.post<ApiResponseWrapper<Prediction>>('/predictions/generate', data);
        return response.data.data;
    },

    async getInsights(): Promise<PredictionInsights> {
        const response = await api.get<ApiResponseWrapper<PredictionInsights>>('/predictions/insights');
        return response.data.data;
    }
};

export default predictionsService;
