// src/context/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { User, LoginCredentials } from '@/types/user.types';
import authService from '@/services/auth.service';
import {
  initKeycloak,
  loginWithSSO,
  logoutSSO,
  isKeycloakAuthenticated,
  getKeycloakUser,
} from '@/services/keycloak.service';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithSSO: () => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // 1. Intentar sesión Keycloak SSO activa (check-sso silencioso)
      try {
        await initKeycloak();
        if (isKeycloakAuthenticated()) {
          const kcUser = getKeycloakUser();
          if (kcUser) {
            setUser(kcUser);
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // Keycloak no disponible — continúa con JWT propio
      }

      // 2. Fallback: sesión JWT propia
      const savedUser = authService.getSavedUser();
      const savedToken = authService.getSavedToken();

      if (savedUser && savedToken) {
        try {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        } catch {
          authService.logout();
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const { user: loggedUser, token } = await authService.login(credentials);
    authService.saveAuthData(token, loggedUser);
    setUser(loggedUser);
  };

  const handleLoginWithSSO = () => {
    loginWithSSO();
  };

  const logout = () => {
    const wasKeycloakUser = !!(user as any)?.isKeycloakUser;
    authService.logout();
    setUser(null);
    if (wasKeycloakUser) {
      logoutSSO();
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const value: AuthContextType = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    loginWithSSO: handleLoginWithSSO,
    logout,
    updateUser,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
