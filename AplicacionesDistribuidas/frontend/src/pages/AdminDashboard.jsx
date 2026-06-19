import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { triageService, analyticsService } from '../services/triageService'

export default function AdminDashboard() {
    const [pendingTriages, setPendingTriages] = useState([])
    const [kpis, setKpis] = useState(null)
    const [filter, setFilter] = useState('ALL')
    const [loading, setLoading] = useState(true)
    const [selectedTriage, setSelectedTriage] = useState(null)
    const [detailsLoading, setDetailsLoading] = useState(false)

    useEffect(() => {
        loadData()
        const interval = setInterval(loadData, 30000) // Refresh every 30s
        return () => clearInterval(interval)
    }, [filter])

    const loadData = async () => {
        try {
            const [triagesRes, kpisRes] = await Promise.all([
                triageService.getPendingTriages(filter !== 'ALL' ? filter : undefined),
                analyticsService.getKPIs()
            ])
            setPendingTriages(triagesRes.data?.triages || [])
            setKpis(kpisRes.data)
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }

    const getClassificationStyle = (classification) => {
        const styles = {
            ROJO: 'bg-red-100 text-red-800 border-red-200',
            AMARILLO: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            VERDE: 'bg-green-100 text-green-800 border-green-200'
        }
        return styles[classification] || ''
    }

    const calculateWaitTime = (classifiedAt) => {
        const now = new Date()
        const classified = new Date(classifiedAt)
        const diffMs = now - classified
        const diffMins = Math.floor(diffMs / 60000)
        if (diffMins < 60) return `${diffMins} min`
        const diffHours = Math.floor(diffMins / 60)
        return `${diffHours}h ${diffMins % 60}m`
    }

    const viewTriageDetails = async (triage) => {
        setDetailsLoading(true)
        try {
            const res = await triageService.getById(triage.id)
            setSelectedTriage(res.data || triage)
        } catch (error) {
            console.error('Error loading triage details:', error)
            // If API fails, show what we have
            setSelectedTriage(triage)
        } finally {
            setDetailsLoading(false)
        }
    }

    const closeDetails = () => {
        setSelectedTriage(null)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Panel de Triage en Tiempo Real</h1>
                    <p className="text-gray-600">Última actualización: {new Date().toLocaleTimeString()}</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="animate-pulse w-3 h-3 bg-green-500 rounded-full"></span>
                    <span className="text-sm text-gray-500">Actualización automática</span>
                </div>
            </div>

            {/* KPI Cards */}
            {kpis && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                    <div className="card text-center">
                        <p className="text-3xl font-bold text-gray-900">{kpis.total_patients || 0}</p>
                        <p className="text-sm text-gray-500">Pacientes Totales</p>
                    </div>
                    <div className="card text-center">
                        <p className="text-3xl font-bold text-gray-900">{kpis.total_triages || 0}</p>
                        <p className="text-sm text-gray-500">Triages Totales</p>
                    </div>
                    <div className="card text-center border-l-4 border-red-500">
                        <p className="text-3xl font-bold text-red-600">{kpis.triages_by_level?.ROJO || 0}</p>
                        <p className="text-sm text-gray-500">🔴 Rojos</p>
                    </div>
                    <div className="card text-center border-l-4 border-yellow-500">
                        <p className="text-3xl font-bold text-yellow-600">{kpis.triages_by_level?.AMARILLO || 0}</p>
                        <p className="text-sm text-gray-500">🟡 Amarillos</p>
                    </div>
                    <div className="card text-center border-l-4 border-green-500">
                        <p className="text-3xl font-bold text-green-600">{kpis.triages_by_level?.VERDE || 0}</p>
                        <p className="text-sm text-gray-500">🟢 Verdes</p>
                    </div>
                    <div className="card text-center">
                        <p className="text-3xl font-bold text-primary-600">{kpis.teleconsults?.completed || 0}</p>
                        <p className="text-sm text-gray-500">Consultas Completadas</p>
                    </div>
                </div>
            )}

            {/* Additional KPIs */}
            {kpis && (
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="card">
                        <h3 className="font-semibold text-gray-900 mb-4">📊 Distribución de Triage</h3>
                        <div className="space-y-3">
                            {['ROJO', 'AMARILLO', 'VERDE'].map(level => {
                                const pct = kpis.efficiency_metrics?.triage_distribution_pct?.[level] || 0
                                const colors = { ROJO: 'bg-red-500', AMARILLO: 'bg-yellow-500', VERDE: 'bg-green-500' }
                                return (
                                    <div key={level} className="flex items-center gap-3">
                                        <span className="w-20 text-sm font-medium">{level}</span>
                                        <div className="flex-1 bg-gray-200 rounded-full h-4">
                                            <div className={`${colors[level]} h-4 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="w-12 text-sm text-right">{pct}%</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="font-semibold text-gray-900 mb-4">🏥 Impacto del Sistema</h3>
                        <div className="text-center py-4">
                            <p className="text-4xl font-bold text-green-600">{kpis.in_person_visits_avoided || 0}</p>
                            <p className="text-gray-600">Visitas presenciales evitadas</p>
                            <p className="text-sm text-gray-500 mt-2">(87% de casos verdes)</p>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="font-semibold text-gray-900 mb-4">📋 Seguimiento</h3>
                        <div className="text-center py-4">
                            <p className="text-4xl font-bold text-primary-600">{Math.round((kpis.followup_response_rate || 0) * 100)}%</p>
                            <p className="text-gray-600">Tasa de respuesta</p>
                            <p className="text-sm text-gray-500 mt-2">{kpis.prescriptions_issued || 0} recetas emitidas</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-2 mb-6">
                {['ALL', 'ROJO', 'AMARILLO', 'VERDE'].map(f => (
                    <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg transition-colors ${filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                        {f === 'ALL' ? 'Todos' : f}
                    </button>
                ))}
                <span className="ml-auto text-sm text-gray-500 self-center">
                    {pendingTriages.length} pacientes pendientes
                </span>
            </div>

            {/* Pending Triages Table */}
            <div className="card overflow-hidden">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Pacientes Pendientes de Atención</h2>

                {pendingTriages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p>No hay pacientes pendientes</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ID Paciente</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Clasificación</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Puntuación</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Hora</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Tiempo Espera</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Estado</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {pendingTriages.map((triage) => (
                                    <tr key={triage.id} className={triage.classification === 'ROJO' ? 'bg-red-50' : ''}>
                                        <td className="px-4 py-4 text-sm font-mono">{triage.patient_id?.substring(0, 8)}...</td>
                                        <td className="px-4 py-4">
                                            <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getClassificationStyle(triage.classification)}`}>
                                                {triage.classification === 'ROJO' && '🔴 '}
                                                {triage.classification === 'AMARILLO' && '🟡 '}
                                                {triage.classification === 'VERDE' && '🟢 '}
                                                {triage.classification}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-sm">{triage.score}</td>
                                        <td className="px-4 py-4 text-sm">{new Date(triage.classified_at).toLocaleTimeString()}</td>
                                        <td className="px-4 py-4 text-sm font-medium">{calculateWaitTime(triage.classified_at)}</td>
                                        <td className="px-4 py-4 text-sm">{triage.status}</td>
                                        <td className="px-4 py-4">
                                            <Link
                                                to={`/triage/${triage.id}`}
                                                className="text-primary-600 hover:underline text-sm font-medium"
                                            >
                                                Ver Detalles
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Triage Details Modal */}
            {selectedTriage && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Detalles del Triage</h2>
                                    <p className="text-sm text-gray-500">ID: {selectedTriage.id}</p>
                                </div>
                                <button
                                    onClick={closeDetails}
                                    className="text-gray-400 hover:text-gray-600 text-2xl"
                                >
                                    ×
                                </button>
                            </div>

                            {detailsLoading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Classification */}
                                    <div className={`p-4 rounded-lg border-2 ${getClassificationStyle(selectedTriage.classification)}`}>
                                        <div className="flex items-center justify-between">
                                            <span className="text-lg font-bold">
                                                {selectedTriage.classification === 'ROJO' && '🔴 '}
                                                {selectedTriage.classification === 'AMARILLO' && '🟡 '}
                                                {selectedTriage.classification === 'VERDE' && '🟢 '}
                                                Clasificación: {selectedTriage.classification}
                                            </span>
                                            <span className="text-2xl font-bold">Score: {selectedTriage.score}</span>
                                        </div>
                                    </div>

                                    {/* Patient Info */}
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h3 className="font-semibold text-gray-900 mb-2">Paciente</h3>
                                        <p className="text-sm text-gray-600">ID: {selectedTriage.patient_id}</p>
                                    </div>

                                    {/* Recommendation */}
                                    {selectedTriage.recommendation && (
                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                            <h3 className="font-semibold text-blue-900 mb-2">📋 Recomendación</h3>
                                            <p className="text-blue-800">{selectedTriage.recommendation}</p>
                                        </div>
                                    )}

                                    {/* Symptoms */}
                                    {selectedTriage.symptoms_detected?.length > 0 && (
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-2">Síntomas Detectados</h3>
                                            <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                {selectedTriage.symptoms_detected.map((symptom, i) => (
                                                    <li key={i}>{symptom}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Critical Flags */}
                                    {selectedTriage.critical_flags?.length > 0 && (
                                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                            <h3 className="font-semibold text-red-900 mb-2">⚠️ Alertas Críticas</h3>
                                            <ul className="list-disc list-inside space-y-1 text-red-700">
                                                {selectedTriage.critical_flags.map((flag, i) => (
                                                    <li key={i}>{flag.replace(/_/g, ' ')}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Timestamps */}
                                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                                        <div>
                                            <span className="font-medium">Clasificado:</span>
                                            <p>{new Date(selectedTriage.classified_at).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <span className="font-medium">Estado:</span>
                                            <p>{selectedTriage.status}</p>
                                        </div>
                                    </div>

                                    {/* Responses if available */}
                                    {selectedTriage.responses?.length > 0 && (
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-2">Respuestas del Cuestionario</h3>
                                            <div className="space-y-2">
                                                {selectedTriage.responses.map((resp, i) => (
                                                    <div key={i} className="bg-gray-50 p-3 rounded text-sm">
                                                        <p className="font-medium text-gray-700">{resp.question_text}</p>
                                                        <p className="text-gray-600">
                                                            Respuesta: {typeof resp.answer_value === 'object'
                                                                ? JSON.stringify(resp.answer_value)
                                                                : resp.answer_value}
                                                            {resp.score_contribution > 0 && (
                                                                <span className="ml-2 text-primary-600">(+{resp.score_contribution} pts)</span>
                                                            )}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={closeDetails}
                                    className="btn btn-primary"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
