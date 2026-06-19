// src/types/user.types.ts

export type UserRole = 'user' | 'admin';

export interface User {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: UserRole;
}

export interface ChangePasswordData {
  password: string;
  confirmPassword: string;
}