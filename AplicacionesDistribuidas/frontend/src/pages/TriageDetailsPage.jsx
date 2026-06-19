import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { triageService, patientService } from '../services/triageService'

export default function TriageDetailsPage() {
    const { triageId } = useParams()
    const navigate = useNavigate()
    const [triage, setTriage] = useState(null)
    const [patient, setPatient] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        loadTriageDetails()
    }, [triageId])

    const loadTriageDetails = async () => {
        try {
            setLoading(true)
            const res = await triageService.getById(triageId)
            setTriage(res.data)

            // Try to load patient info
            if (res.data?.patient_id) {
                try {
                    const patientRes = await patientService.getById(res.data.patient_id)
                    setPatient(patientRes.data)
                } catch (e) {
                    console.log('Could not load patient details')
                }
            }
        } catch (err) {
            setError('Error al cargar los detalles del triage')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const getClassificationStyle = (classification) => {
        const styles = {
            ROJO: 'bg-red-100 text-red-800 border-red-500',
            AMARILLO: 'bg-yellow-100 text-yellow-800 border-yellow-500',
            VERDE: 'bg-green-100 text-green-800 border-green-500'
        }
        return styles[classification] || 'bg-gray-100 text-gray-800 border-gray-500'
    }

    const getClassificationIcon = (classification) => {
        const icons = { ROJO: '🔴', AMARILLO: '🟡', VERDE: '🟢' }
        return icons[classification] || '⚪'
    }

    const getUrgencyLevel = (classification) => {
        const levels = {
            ROJO: { text: 'Urgencia Alta - Atención Inmediata', color: 'text-red-700' },
            AMARILLO: { text: 'Urgencia Moderada - Teleconsulta en 24h', color: 'text-yellow-700' },
            VERDE: { text: 'Urgencia Baja - Teleconsulta en 48-72h', color: 'text-green-700' }
        }
        return levels[classification] || { text: 'Sin clasificar', color: 'text-gray-700' }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando detalles del triage...</p>
                </div>
            </div>
        )
    }

    if (error || !triage) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <p className="text-red-800 text-lg mb-4">{error || 'Triage no encontrado'}</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="btn btn-primary"
                    >
                        Volver
                    </button>
                </div>
            </div>
        )
    }

    const urgency = getUrgencyLevel(triage.classification)

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Back Button */}
            <div className="mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-gray-600 hover:text-primary-600 transition-colors"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Volver al listado
                </button>
            </div>

            {/* Header with Classification */}
            <div className={`rounded-xl p-6 mb-6 border-l-8 ${getClassificationStyle(triage.classification)}`}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-4xl">{getClassificationIcon(triage.classification)}</span>
                            <h1 className="text-3xl font-bold">
                                Clasificación: {triage.classification}
                            </h1>
                        </div>
                        <p className={`text-lg font-medium ${urgency.color}`}>
                            {urgency.text}
                        </p>
                    </div>
                    <div className="mt-4 md:mt-0 text-center md:text-right">
                        <p className="text-sm text-gray-500 mb-1">Puntuación Total</p>
                        <p className="text-5xl font-bold">{triage.score}</p>
                        <p className="text-xs text-gray-500">puntos</p>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Patient Info */}
                <div className="card">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                        <span className="mr-2">👤</span> Información del Paciente
                    </h2>
                    {patient ? (
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Nombre:</span>
                                <span className="font-medium">{patient.nombres} {patient.apellidos}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Cédula:</span>
                                <span className="font-medium">{patient.cedula}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Email:</span>
                                <span className="font-medium">{patient.email}</span>
                            </div>
                            {patient.telefono && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Teléfono:</span>
                                    <span className="font-medium">{patient.telefono}</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-gray-500 text-sm">
                            <p>ID: {triage.patient_id}</p>
                            <p className="mt-2 text-xs">Información detallada no disponible</p>
                        </div>
                    )}
                </div>

                {/* Triage Info */}
                <div className="card">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                        <span className="mr-2">📋</span> Información del Triage
                    </h2>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-500">ID:</span>
                            <span className="font-mono text-sm">{triage.id}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Estado:</span>
                            <span className={`px-2 py-1 rounded text-sm font-medium ${triage.status === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-800' :
                                    triage.status === 'ATENDIDO' ? 'bg-green-100 text-green-800' :
                                        'bg-gray-100 text-gray-800'
                                }`}>
                                {triage.status}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Fecha:</span>
                            <span className="font-medium">{new Date(triage.classified_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Hora:</span>
                            <span className="font-medium">{new Date(triage.classified_at).toLocaleTimeString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recommendation */}
            {triage.recommendation && (
                <div className="card mb-6 border-l-4 border-blue-500 bg-blue-50">
                    <h2 className="text-xl font-semibold text-blue-900 mb-3 flex items-center">
                        <span className="mr-2">💡</span> Recomendación
                    </h2>
                    <p className="text-blue-800 text-lg">{triage.recommendation}</p>
                </div>
            )}

            {/* Critical Flags */}
            {triage.critical_flags?.length > 0 && (
                <div className="card mb-6 border-l-4 border-red-500 bg-red-50">
                    <h2 className="text-xl font-semibold text-red-900 mb-3 flex items-center">
                        <span className="mr-2">⚠️</span> Alertas Críticas
                    </h2>
                    <ul className="space-y-2">
                        {triage.critical_flags.map((flag, i) => (
                            <li key={i} className="flex items-center text-red-800">
                                <span className="mr-2">•</span>
                                {flag.replace(/_/g, ' ')}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Symptoms Detected */}
            {triage.symptoms_detected?.length > 0 && (
                <div className="card mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                        <span className="mr-2">🩺</span> Síntomas Detectados
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {triage.symptoms_detected.map((symptom, i) => (
                            <span key={i} className="px-3 py-1 bg-gray-100 rounded-full text-gray-700 text-sm">
                                {symptom}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Questionnaire Responses */}
            {triage.responses?.length > 0 && (
                <div className="card mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                        <span className="mr-2">📝</span> Respuestas del Cuestionario
                    </h2>
                    <div className="space-y-3">
                        {triage.responses.map((resp, i) => (
                            <div key={i} className="bg-gray-50 rounded-lg p-4">
                                <p className="font-medium text-gray-800 mb-1">
                                    {resp.question_text}
                                </p>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">
                                        {typeof resp.answer_value === 'object'
                                            ? JSON.stringify(resp.answer_value)
                                            : resp.answer_value}
                                    </span>
                                    {resp.score_contribution > 0 && (
                                        <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-sm font-medium">
                                            +{resp.score_contribution} pts
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Decision Log (if available) */}
            {triage.decision_log && (
                <div className="card mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                        <span className="mr-2">📊</span> Análisis de Clasificación
                    </h2>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <p className="text-sm text-gray-500">Puntuación Total</p>
                                <p className="text-2xl font-bold text-primary-600">{triage.decision_log.total_score}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Alertas Críticas</p>
                                <p className="text-2xl font-bold text-red-600">{triage.decision_log.critical_flags?.length || 0}</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400">
                            Clasificado: {new Date(triage.decision_log.timestamp).toLocaleString()}
                        </p>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 justify-center md:justify-end">
                <button
                    onClick={() => navigate(-1)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                    Volver
                </button>
                {triage.status === 'PENDIENTE' && (
                    <button
                        onClick={() => navigate(`/teleconsult/new?patient=${triage.patient_id}&triage=${triage.id}`)}
                        className="btn btn-primary px-6 py-3"
                    >
                        Iniciar Teleconsulta
                    </button>
                )}
            </div>
        </div>
    )
}
