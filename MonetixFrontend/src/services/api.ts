// src/services/api.ts

import axios from 'axios';
import { getKeycloakToken } from './keycloak.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Crear instancia de axios
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token automáticamente
// SSO users: token comes from Keycloak SDK (in-memory, auto-refreshed — never localStorage)
// Local JWT users: token comes from localStorage (stored by authService.saveAuthData)
api.interceptors.request.use(
  (config) => {
    const token = getKeycloakToken() ?? localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido o expirado
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      globalThis.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;