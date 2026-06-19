import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import PrivateRoute from './PrivateRoute';

// Pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Home from '@/pages/Home';
import Users from '@/pages/Users';
import Categories from '@/pages/Categories';
import Transactions from '@/pages/Transactions';
import Goals from '@/pages/Goals';
import Predictions from '@/pages/Predictions';
import Alerts from '@/pages/Alerts';
import Comparisons from '@/pages/Comparisons';

export const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/" replace /> : <Register />}
        />

        {/* Private Routes */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <MainLayout>
                <Home />
              </MainLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/transactions"
          element={
            <PrivateRoute>
              <MainLayout>
                <Transactions />
              </MainLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/goals"
          element={
            <PrivateRoute>
              <MainLayout>
                <Goals />
              </MainLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/predictions"
          element={
            <PrivateRoute>
              <MainLayout>
                <Predictions />
              </MainLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/comparisons"
          element={
            <PrivateRoute>
              <MainLayout>
                <Comparisons />
              </MainLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/alerts"
          element={
            <PrivateRoute>
              <MainLayout>
                <Alerts />
              </MainLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/categories"
          element={
            <PrivateRoute>
              <MainLayout>
                <Categories />
              </MainLayout>
            </PrivateRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/users"
          element={
            <PrivateRoute adminOnly>
              <MainLayout>
                <Users />
              </MainLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/config"
          element={
            <PrivateRoute adminOnly>
              <MainLayout>
                <div className="users-page">
                  <h1 className="users-page__title">Configuración</h1>
                  <p>Próximamente...</p>
                </div>
              </MainLayout>
            </PrivateRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
