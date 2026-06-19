import { useState, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../App'
import { appointmentService, analyticsService } from '../services/triageService'
import DoctorPanel from '../components/doctor/DoctorPanel'

export default function DashboardPage() {
    const { user } = useContext(AuthContext)
    const [appointments, setAppointments] = useState([])
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [user])

    const loadData = async () => {
        try {
            const filters = user.role === 'PATIENT' ? { patient_id: user.id } : user.role === 'DOCTOR' ? { doctor_id: user.id } : {}
            const appointmentsRes = await appointmentService.getAll(filters)
            setAppointments(appointmentsRes.data?.appointments || [])

            if (user.role === 'ADMIN') {
                const statsRes = await analyticsService.getDashboard()
                setStats(statsRes.data)
            }
        } catch (error) {
            console.error('Error loading dashboard:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div></div>
    }

    const getStatusColor = (status) => {
        const colors = { AGENDADA: 'bg-blue-100 text-blue-800', CONFIRMADA: 'bg-green-100 text-green-800', EN_CURSO: 'bg-yellow-100 text-yellow-800', COMPLETADA: 'bg-gray-100 text-gray-800', CANCELADA: 'bg-red-100 text-red-800' }
        return colors[status] || 'bg-gray-100 text-gray-800'
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">
                    Bienvenido, {user.nombre || user.email}
                </h1>
                <p className="text-gray-600 mt-1">
                    {user.role === 'PATIENT' && 'Panel del Paciente'}
                    {user.role === 'DOCTOR' && 'Panel del Doctor'}
                    {user.role === 'ADMIN' && 'Panel de Administración'}
                </p>
            </div>

            {/* Patient Quick Actions */}
            {user.role === 'PATIENT' && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <Link to="/triage" className="card hover:shadow-lg transition-shadow group">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center group-hover:bg-red-200 transition-colors">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">Iniciar Triage</h3>
                                <p className="text-sm text-gray-500">Evalúa tus síntomas</p>
                            </div>
                        </div>
                    </Link>

                    <div className="card">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">Mis Citas</h3>
                                <p className="text-sm text-gray-500">{appointments.length} citas registradas</p>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900">Historial</h3>
                                <p className="text-sm text-gray-500">Ver historial médico</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Doctor Panel */}
            {user.role === 'DOCTOR' && (
                <div className="card mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        Gestion de Pacientes y Triage
                    </h2>
                    <DoctorPanel />
                </div>
            )}

            {/* Admin Stats */}
            {user.role === 'ADMIN' && stats && (
                <div className="grid md:grid-cols-4 gap-6 mb-8">
                    <div className="card">
                        <p className="text-sm text-gray-500">Triages Pendientes</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.triages_pending || 0}</p>
                    </div>
                    <div className="card border-l-4 border-red-500">
                        <p className="text-sm text-gray-500">🔴 Rojos Hoy</p>
                        <p className="text-3xl font-bold text-red-600">{stats.triages_today?.ROJO || 0}</p>
                    </div>
                    <div className="card border-l-4 border-yellow-500">
                        <p className="text-sm text-gray-500">🟡 Amarillos Hoy</p>
                        <p className="text-3xl font-bold text-yellow-600">{stats.triages_today?.AMARILLO || 0}</p>
                    </div>
                    <div className="card border-l-4 border-green-500">
                        <p className="text-sm text-gray-500">🟢 Verdes Hoy</p>
                        <p className="text-3xl font-bold text-green-600">{stats.triages_today?.VERDE || 0}</p>
                    </div>
                </div>
            )}

            {/* Appointments Table */}
            <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    {user.role === 'PATIENT' ? 'Mis Citas' : 'Citas Recientes'}
                </h2>

                {appointments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p>No hay citas registradas</p>
                        {user.role === 'PATIENT' && (
                            <Link to="/triage" className="text-primary-600 hover:underline mt-2 inline-block">
                                Iniciar triage para agendar una cita
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Fecha</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Hora</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Estado</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {appointments.slice(0, 5).map((appointment) => (
                                    <tr key={appointment.id}>
                                        <td className="px-4 py-3 text-sm">{appointment.scheduled_date}</td>
                                        <td className="px-4 py-3 text-sm">{appointment.scheduled_time?.substring(0, 5)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                                                {appointment.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {['CONFIRMADA', 'EN_CURSO'].includes(appointment.status) && (
                                                <Link to={`/teleconsult/${appointment.id}`} className="text-primary-600 hover:underline text-sm">
                                                    Ingresar
                                                </Link>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
