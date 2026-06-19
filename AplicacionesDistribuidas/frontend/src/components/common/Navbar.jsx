import { useContext, useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AuthContext } from '../../App'
import { notificationService } from '../../services/notificationService'

export default function Navbar() {
    const { user, logout } = useContext(AuthContext)
    const navigate = useNavigate()
    const location = useLocation()
    const [unreadCount, setUnreadCount] = useState(0)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    useEffect(() => {
        // Fetch unread notification count
        const fetchUnread = async () => {
            try {
                const res = await notificationService.getUnreadCount()
                setUnreadCount(res.data?.count || 0)
            } catch (err) {
                // Silently fail
            }
        }
        fetchUnread()
        const interval = setInterval(fetchUnread, 30000) // Check every 30s
        return () => clearInterval(interval)
    }, [])

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const isActive = (path) => location.pathname === path

    const navLinks = [
        { path: '/dashboard', label: 'Dashboard', icon: '🏠', roles: ['PATIENT', 'DOCTOR', 'ADMIN'] },
        { path: '/triage', label: 'Triage', icon: '🏥', roles: ['PATIENT', 'DOCTOR'] },
        { path: '/followup', label: 'Seguimiento', icon: '📋', roles: ['PATIENT', 'DOCTOR'] },
        { path: '/prescriptions', label: 'Recetas', icon: '💊', roles: ['PATIENT', 'DOCTOR'] },
        { path: '/admin', label: 'Panel Admin', icon: '⚙️', roles: ['ADMIN', 'DOCTOR'] },
    ]

    const visibleLinks = navLinks.filter(link => link.roles.includes(user?.role))

    return (
        <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link to="/dashboard" className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-md">
                                <span className="text-white font-bold text-lg">T</span>
                            </div>
                            <span className="font-semibold text-gray-900 hidden sm:block">Triage Remoto</span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex ml-10 space-x-1">
                            {visibleLinks.map(({ path, label, icon }) => (
                                <Link
                                    key={path}
                                    to={path}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(path)
                                            ? 'bg-primary-50 text-primary-700'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                >
                                    <span className="mr-1">{icon}</span> {label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        {/* Notifications */}
                        <Link
                            to="/notifications"
                            className={`relative p-2 rounded-lg transition-colors ${isActive('/notifications')
                                    ? 'bg-primary-50 text-primary-700'
                                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                                }`}
                            title="Notificaciones"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </Link>

                        {/* User Info */}
                        <div className="hidden sm:block text-right">
                            <p className="text-sm font-medium text-gray-900">{user?.nombre || user?.email}</p>
                            <p className="text-xs text-gray-500">
                                {user?.role === 'PATIENT' && '👤 Paciente'}
                                {user?.role === 'DOCTOR' && `👨‍⚕️ ${user?.specialty || 'Médico'}`}
                                {user?.role === 'ADMIN' && '🔧 Admin'}
                            </p>
                        </div>

                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Cerrar sesión"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden py-2 border-t border-gray-200">
                        {visibleLinks.map(({ path, label, icon }) => (
                            <Link
                                key={path}
                                to={path}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`block px-4 py-3 text-sm font-medium ${isActive(path)
                                        ? 'bg-primary-50 text-primary-700'
                                        : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                <span className="mr-2">{icon}</span> {label}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </nav>
    )
}

