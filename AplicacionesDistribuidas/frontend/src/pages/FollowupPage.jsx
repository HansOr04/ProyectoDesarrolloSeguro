import { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../App'
import { followupService } from '../services/followupService'
import { patientService } from '../services/triageService'

export default function FollowupPage() {
    const { user } = useContext(AuthContext)
    const [followups, setFollowups] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selectedFollowup, setSelectedFollowup] = useState(null)
    const [response, setResponse] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        loadFollowups()
    }, [user])

    const loadFollowups = async () => {
        try {
            setLoading(true)
            // Get patient ID from user profile if patient
            let patientId = user?.patientId

            if (!patientId && user?.role === 'PATIENT') {
                // Try to get patient by user ID
                try {
                    const patientRes = await patientService.getAll()
                    const patient = patientRes.data?.patients?.find(p => p.user_id === user.id)
                    patientId = patient?.id
                } catch (e) {
                    console.log('Could not fetch patient')
                }
            }

            if (patientId) {
                const res = await followupService.getByPatient(patientId)
                setFollowups(res.data?.followups || res.data || [])
            } else if (user?.role === 'DOCTOR' || user?.role === 'ADMIN') {
                // Doctors see all pending
                const res = await followupService.getPending()
                setFollowups(res.data?.followups || res.data || [])
            }
        } catch (err) {
            setError('Error al cargar seguimientos')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmitResponse = async (followupId) => {
        if (!response.trim()) return

        setSubmitting(true)
        try {
            await followupService.submitResponse(followupId, {
                response_text: response,
                symptoms_improved: true,
                additional_notes: ''
            })
            setResponse('')
            setSelectedFollowup(null)
            loadFollowups()
        } catch (err) {
            console.error('Error submitting response:', err)
        } finally {
            setSubmitting(false)
        }
    }

    const getStatusBadge = (status) => {
        const styles = {
            PENDING: 'bg-yellow-100 text-yellow-800',
            COMPLETED: 'bg-green-100 text-green-800',
            OVERDUE: 'bg-red-100 text-red-800'
        }
        return styles[status] || 'bg-gray-100 text-gray-800'
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">📋 Seguimientos</h1>
                <p className="text-gray-600 mt-2">
                    {user?.role === 'PATIENT'
                        ? 'Responde a los cuestionarios de seguimiento de tus consultas'
                        : 'Seguimientos pendientes de respuesta'}
                </p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-800">
                    {error}
                </div>
            )}

            {followups.length === 0 ? (
                <div className="card text-center py-12">
                    <span className="text-6xl mb-4 block">📭</span>
                    <h2 className="text-xl font-semibold text-gray-700">No hay seguimientos</h2>
                    <p className="text-gray-500 mt-2">
                        Los seguimientos aparecerán aquí después de tus teleconsultas
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {followups.map((followup) => (
                        <div key={followup.id} className="card">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-semibold text-gray-900">
                                        Seguimiento #{followup.id?.substring(0, 8)}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        Creado: {new Date(followup.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(followup.status)}`}>
                                    {followup.status === 'PENDING' ? 'Pendiente' :
                                        followup.status === 'COMPLETED' ? 'Completado' :
                                            followup.status === 'OVERDUE' ? 'Vencido' : followup.status}
                                </span>
                            </div>

                            {followup.question_text && (
                                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                    <p className="font-medium text-gray-700">{followup.question_text}</p>
                                </div>
                            )}

                            {followup.status !== 'COMPLETED' && (
                                selectedFollowup === followup.id ? (
                                    <div className="space-y-4">
                                        <textarea
                                            value={response}
                                            onChange={(e) => setResponse(e.target.value)}
                                            placeholder="Escribe tu respuesta aquí..."
                                            rows={3}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSubmitResponse(followup.id)}
                                                disabled={submitting || !response.trim()}
                                                className="btn btn-primary disabled:opacity-50"
                                            >
                                                {submitting ? 'Enviando...' : 'Enviar Respuesta'}
                                            </button>
                                            <button
                                                onClick={() => { setSelectedFollowup(null); setResponse('') }}
                                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setSelectedFollowup(followup.id)}
                                        className="btn btn-primary"
                                    >
                                        Responder
                                    </button>
                                )
                            )}

                            {followup.response_text && (
                                <div className="mt-4 bg-green-50 rounded-lg p-4">
                                    <p className="text-sm font-medium text-green-800">Tu respuesta:</p>
                                    <p className="text-green-700">{followup.response_text}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
