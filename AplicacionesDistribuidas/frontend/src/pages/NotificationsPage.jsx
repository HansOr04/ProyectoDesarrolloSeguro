import { useState, useEffect } from 'react'
import { notificationService } from '../services/notificationService'

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        loadNotifications()
    }, [])

    const loadNotifications = async () => {
        try {
            setLoading(true)
            const res = await notificationService.getAll()
            setNotifications(res.data?.notifications || res.data || [])
        } catch (err) {
            setError('Error al cargar notificaciones')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleMarkAsRead = async (id) => {
        try {
            await notificationService.markAsRead(id)
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, read: true } : n)
            )
        } catch (err) {
            console.error('Error marking notification as read:', err)
        }
    }

    const handleMarkAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead()
            setNotifications(prev =>
                prev.map(n => ({ ...n, read: true }))
            )
        } catch (err) {
            console.error('Error marking all as read:', err)
        }
    }

    const getNotificationIcon = (type) => {
        const icons = {
            TRIAGE: '🏥',
            APPOINTMENT: '📅',
            FOLLOWUP: '📋',
            PRESCRIPTION: '💊',
            SYSTEM: '⚙️',
            URGENT: '🚨'
        }
        return icons[type] || '🔔'
    }

    const getNotificationStyle = (type, read) => {
        if (read) return 'bg-gray-50 border-gray-200'

        const styles = {
            URGENT: 'bg-red-50 border-red-200',
            TRIAGE: 'bg-blue-50 border-blue-200',
            APPOINTMENT: 'bg-green-50 border-green-200',
            FOLLOWUP: 'bg-yellow-50 border-yellow-200',
            PRESCRIPTION: 'bg-purple-50 border-purple-200'
        }
        return styles[type] || 'bg-primary-50 border-primary-200'
    }

    const unreadCount = notifications.filter(n => !n.read).length

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">🔔 Notificaciones</h1>
                    <p className="text-gray-600 mt-2">
                        {unreadCount > 0
                            ? `${unreadCount} notificación(es) sin leer`
                            : 'Todas las notificaciones leídas'
                        }
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllAsRead}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                        Marcar todas como leídas
                    </button>
                )}
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-800">
                    {error}
                </div>
            )}

            {notifications.length === 0 ? (
                <div className="card text-center py-12">
                    <span className="text-6xl mb-4 block">🔕</span>
                    <h2 className="text-xl font-semibold text-gray-700">No hay notificaciones</h2>
                    <p className="text-gray-500 mt-2">
                        Las notificaciones importantes aparecerán aquí
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`rounded-lg border p-4 transition-all cursor-pointer hover:shadow-md ${getNotificationStyle(notification.type, notification.read)}`}
                            onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                        >
                            <div className="flex items-start gap-4">
                                <span className="text-2xl">
                                    {getNotificationIcon(notification.type)}
                                </span>
                                <div className="flex-1">
                                    <div className="flex items-start justify-between">
                                        <h3 className={`font-medium ${notification.read ? 'text-gray-600' : 'text-gray-900'}`}>
                                            {notification.title}
                                        </h3>
                                        <span className="text-xs text-gray-500">
                                            {new Date(notification.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className={`text-sm mt-1 ${notification.read ? 'text-gray-500' : 'text-gray-700'}`}>
                                        {notification.message}
                                    </p>
                                    {notification.action_url && (
                                        <a
                                            href={notification.action_url}
                                            className="text-sm text-primary-600 hover:underline mt-2 inline-block"
                                        >
                                            Ver más →
                                        </a>
                                    )}
                                </div>
                                {!notification.read && (
                                    <span className="w-3 h-3 bg-primary-500 rounded-full flex-shrink-0"></span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
