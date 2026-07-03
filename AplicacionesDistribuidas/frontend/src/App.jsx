import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, createContext } from 'react'
import Navbar from './components/common/Navbar'
import OfflineIndicator from './components/common/OfflineIndicator'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import TriagePage from './pages/TriagePage'
import TriageDetailsPage from './pages/TriageDetailsPage'
import DashboardPage from './pages/DashboardPage'
import TeleconsultPage from './pages/TeleconsultPage'
import AdminDashboard from './pages/AdminDashboard'
import FollowupPage from './pages/FollowupPage'
import PrescriptionsPage from './pages/PrescriptionsPage'
import NotificationsPage from './pages/NotificationsPage'
import { authService } from './services/authService'
import keycloakService from './services/keycloakService'
import { initDB } from './utils/offlineStorage'

export const AuthContext = createContext(null)

function App() {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        initDB().catch(err => console.error('Failed to init IndexedDB:', err))

        const initAuth = async () => {
            // 1. Intentar restaurar sesión Keycloak SSO silenciosamente
            try {
                await keycloakService.init()
                if (keycloakService.isAuthenticated()) {
                    const kcUser = keycloakService.getUser()
                    if (kcUser) {
                        setUser(kcUser)
                        setLoading(false)
                        return
                    }
                }
            } catch (err) {
                console.warn('[Keycloak] init silencioso falló:', err)
            }

            // 2. Fallback: sesión JWT propia guardada en localStorage
            const token = localStorage.getItem('accessToken')
            const userData = localStorage.getItem('user')
            if (token && userData) {
                setUser(JSON.parse(userData))
            }
            setLoading(false)
        }

        initAuth()
    }, [])

    // Login con formulario propio (JWT local) — sin cambios respecto al original
    const login = async (email, password) => {
        const response = await authService.login(email, password)
        if (response.success) {
            setUser(response.data.user)
            localStorage.setItem('accessToken', response.data.accessToken)
            localStorage.setItem('user', JSON.stringify(response.data.user))
        }
        return response
    }

    // Login SSO con Keycloak — redirige al IdP
    const loginWithSSO = () => {
        keycloakService.loginWithSSO()
    }

    const logout = () => {
        setUser(null)
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')

        if (keycloakService.isAuthenticated()) {
            keycloakService.logoutSSO()
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            </div>
        )
    }

    return (
        <AuthContext.Provider value={{ user, login, loginWithSSO, logout }}>
            <Router>
                <div className="min-h-screen bg-gray-50">
                    {user && <Navbar />}
                    <Routes>
                        {/* Public routes */}
                        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
                        <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/dashboard" />} />

                        {/* Protected routes */}
                        <Route path="/dashboard" element={user ? <DashboardPage /> : <Navigate to="/login" />} />
                        <Route path="/triage" element={user ? <TriagePage /> : <Navigate to="/login" />} />
                        <Route path="/triage/:triageId" element={user ? <TriageDetailsPage /> : <Navigate to="/login" />} />
                        <Route path="/teleconsult/:appointmentId" element={user ? <TeleconsultPage /> : <Navigate to="/login" />} />
                        <Route path="/followup" element={user ? <FollowupPage /> : <Navigate to="/login" />} />
                        <Route path="/prescriptions" element={user ? <PrescriptionsPage /> : <Navigate to="/login" />} />
                        <Route path="/notifications" element={user ? <NotificationsPage /> : <Navigate to="/login" />} />
                        <Route path="/admin" element={user?.role === 'ADMIN' || user?.role === 'DOCTOR' ? <AdminDashboard /> : <Navigate to="/dashboard" />} />

                        {/* Default redirect */}
                        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                    <OfflineIndicator />
                </div>
            </Router>
        </AuthContext.Provider>
    )
}

export default App
