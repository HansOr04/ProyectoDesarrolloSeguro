// src/services/auth.service.ts

import api from './api';
import { LoginCredentials, RegisterData, User } from '@/types/user.types';
import { ApiResponse } from '@/types/api.types';

export const authService = {
  // Login
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    const response = await api.post<ApiResponse<{ user: User; token: string }>>(
      '/auth/login',
      credentials
    );
    return response.data.data;
  },

  // Register (opcional)
  async register(data: RegisterData): Promise<{ user: User; token: string }> {
    const response = await api.post<ApiResponse<{ user: User; token: string }>>(
      '/auth/register',
      data
    );
    return response.data.data;
  },

  // Get current user
  async getCurrentUser(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return response.data.data;
  },

  // Logout (local)
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Save auth data
  saveAuthData(token: string, user: User): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  // Get saved user
  getSavedUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Get saved token
  getSavedToken(): string | null {
    return localStorage.getItem('token');
  },

  // Check if authenticated
  isAuthenticated(): boolean {
    return !!this.getSavedToken();
  }
};

export default authService;