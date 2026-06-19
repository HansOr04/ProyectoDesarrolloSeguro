import { useState, useEffect, useContext } from 'react'
import { useParams } from 'react-router-dom'
import { AuthContext } from '../App'
import { appointmentService } from '../services/triageService'

export default function TeleconsultPage() {
    const { appointmentId } = useParams()
    const { user } = useContext(AuthContext)
    const [appointment, setAppointment] = useState(null)
    const [joinUrl, setJoinUrl] = useState('')
    const [loading, setLoading] = useState(true)
    const [joined, setJoined] = useState(false)

    useEffect(() => {
        loadAppointment()
    }, [appointmentId])

    const loadAppointment = async () => {
        try {
            const res = await appointmentService.getById(appointmentId)
            setAppointment(res.data)

            const isDoctor = user.role === 'DOCTOR'
            const joinRes = await appointmentService.getJoinUrl(appointmentId, isDoctor)
            setJoinUrl(joinRes.data?.join_url || res.data?.meeting_url)
        } catch (error) {
            console.error('Error loading appointment:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleJoinCall = async () => {
        if (user.role === 'DOCTOR' && appointment?.status === 'CONFIRMADA') {
            await appointmentService.updateStatus(appointmentId, 'EN_CURSO')
        }
        setJoined(true)
        window.open(joinUrl, '_blank')
    }

    const handleEndCall = async () => {
        if (user.role === 'DOCTOR') {
            await appointmentService.updateStatus(appointmentId, 'COMPLETADA', 'Teleconsulta finalizada')
        }
        setJoined(false)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            </div>
        )
    }

    if (!appointment) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-8 text-center">
                <h1 className="text-2xl font-bold text-gray-900">Cita no encontrada</h1>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="card mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Teleconsulta</h1>
                        <p className="text-gray-600">
                            {appointment.scheduled_date} a las {appointment.scheduled_time?.substring(0, 5)}
                        </p>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${appointment.status === 'EN_CURSO' ? 'bg-green-100 text-green-800' :
                            appointment.status === 'COMPLETADA' ? 'bg-gray-100 text-gray-800' :
                                'bg-blue-100 text-blue-800'
                        }`}>
                        {appointment.status}
                    </span>
                </div>
            </div>

            <div className="card">
                <div className="text-center py-8">
                    <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-12 h-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>

                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        {joined ? 'Teleconsulta en progreso' : 'Sala de Teleconsulta'}
                    </h2>
                    <p className="text-gray-600 mb-6">
                        {joined
                            ? 'La videollamada se abrió en una nueva ventana'
                            : 'Haga clic en el botón para unirse a la videollamada'}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        {!joined ? (
                            <button onClick={handleJoinCall} disabled={!joinUrl} className="btn btn-primary py-3 px-8 text-lg">
                                🎥 Unirse a la Llamada
                            </button>
                        ) : (
                            <>
                                <a href={joinUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary py-3 px-8">
                                    🔄 Volver a la Llamada
                                </a>
                                {user.role === 'DOCTOR' && (
                                    <button onClick={handleEndCall} className="btn btn-danger py-3 px-8">
                                        ✅ Finalizar Consulta
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {joinUrl && (
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-500 mb-2">O copie este enlace:</p>
                            <code className="text-xs bg-gray-200 px-2 py-1 rounded break-all">{joinUrl}</code>
                        </div>
                    )}
                </div>
            </div>

            {user.role === 'DOCTOR' && appointment.status === 'COMPLETADA' && (
                <div className="card mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 Generar Receta</h3>
                    <p className="text-gray-600 mb-4">
                        La consulta ha finalizado. Puede generar una receta para el paciente.
                    </p>
                    <button className="btn btn-success">
                        Crear Receta Digital
                    </button>
                </div>
            )}
        </div>
    )
}
