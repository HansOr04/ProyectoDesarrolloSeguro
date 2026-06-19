// src/types/api.types.ts

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  total?: number;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface FilterParams {
  role?: string;
}