// src/services/users.service.ts

import api from './api';
import { User, UpdateUserData, ChangePasswordData, RegisterData } from '@/types/user.types';
import { ApiResponse, PaginationParams, FilterParams } from '@/types/api.types';

export const usersService = {
  // Get all users
  async getAll(params?: PaginationParams & FilterParams): Promise<{ users: User[]; total: number }> {
    const response = await api.get<ApiResponse<User[]>>('/users', { params });
    return {
      users: response.data.data,
      total: response.data.total || response.data.data.length
    };
  },

  // Get user by ID
  async getById(id: string): Promise<User> {
    const response = await api.get<ApiResponse<User>>(`/users/${id}`);
    return response.data.data;
  },

  // Create user
  async create(data: RegisterData): Promise<User> {
    const response = await api.post<ApiResponse<User>>('/users', data);
    return response.data.data;
  },

  // Update user
  async update(id: string, data: UpdateUserData): Promise<User> {
    const response = await api.put<ApiResponse<User>>(`/users/${id}`, data);
    return response.data.data;
  },

  // Change password
  async changePassword(id: string, data: ChangePasswordData): Promise<void> {
    await api.patch(`/users/${id}/password`, data);
  },

  // Delete user
  async delete(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  }
};

export default usersService;