import { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../App'
import { prescriptionService } from '../services/prescriptionService'
import { patientService } from '../services/triageService'

export default function PrescriptionsPage() {
    const { user } = useContext(AuthContext)
    const [prescriptions, setPrescriptions] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [verifyCode, setVerifyCode] = useState('')
    const [verifyResult, setVerifyResult] = useState(null)
    const [verifying, setVerifying] = useState(false)

    useEffect(() => {
        loadPrescriptions()
    }, [user])

    const loadPrescriptions = async () => {
        try {
            setLoading(true)
            let patientId = user?.patientId

            if (!patientId && user?.role === 'PATIENT') {
                try {
                    const patientRes = await patientService.getAll()
                    const patient = patientRes.data?.patients?.find(p => p.user_id === user.id)
                    patientId = patient?.id
                } catch (e) {
                    console.log('Could not fetch patient')
                }
            }

            if (patientId) {
                const res = await prescriptionService.getByPatient(patientId)
                setPrescriptions(res.data?.prescriptions || res.data || [])
            }
        } catch (err) {
            setError('Error al cargar recetas')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleVerify = async () => {
        if (!verifyCode.trim()) return

        setVerifying(true)
        setVerifyResult(null)
        try {
            const res = await prescriptionService.verify(verifyCode)
            setVerifyResult({ success: true, data: res.data })
        } catch (err) {
            setVerifyResult({ success: false, error: 'Código de receta inválido o no encontrado' })
        } finally {
            setVerifying(false)
        }
    }

    const handleDownload = async (prescriptionId) => {
        try {
            const blob = await prescriptionService.download(prescriptionId)
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `receta-${prescriptionId}.pdf`
            a.click()
            window.URL.revokeObjectURL(url)
        } catch (err) {
            console.error('Error downloading prescription:', err)
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
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">💊 Recetas Médicas</h1>
                <p className="text-gray-600 mt-2">
                    Consulta y descarga tus recetas médicas emitidas en teleconsultas
                </p>
            </div>

            {/* Verification Section */}
            <div className="card mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">🔍 Verificar Receta</h2>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value.toUpperCase())}
                        placeholder="Ingresa el código de verificación"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                        onClick={handleVerify}
                        disabled={verifying || !verifyCode.trim()}
                        className="btn btn-primary disabled:opacity-50"
                    >
                        {verifying ? 'Verificando...' : 'Verificar'}
                    </button>
                </div>

                {verifyResult && (
                    <div className={`mt-4 p-4 rounded-lg ${verifyResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                        {verifyResult.success ? (
                            <div>
                                <p className="font-semibold">✓ Receta válida</p>
                                <p className="text-sm mt-1">
                                    Emitida el: {new Date(verifyResult.data.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        ) : (
                            <p>{verifyResult.error}</p>
                        )}
                    </div>
                )}
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-800">
                    {error}
                </div>
            )}

            {/* Prescriptions List */}
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Mis Recetas</h2>

            {prescriptions.length === 0 ? (
                <div className="card text-center py-12">
                    <span className="text-6xl mb-4 block">📋</span>
                    <h3 className="text-xl font-semibold text-gray-700">No hay recetas</h3>
                    <p className="text-gray-500 mt-2">
                        Las recetas emitidas en tus teleconsultas aparecerán aquí
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {prescriptions.map((prescription) => (
                        <div key={prescription.id} className="card">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-2xl">💊</span>
                                        <h3 className="font-semibold text-gray-900">
                                            Receta #{prescription.id?.substring(0, 8)}
                                        </h3>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-2">
                                        Emitida: {new Date(prescription.created_at).toLocaleDateString()}
                                    </p>

                                    {prescription.medications && (
                                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                            <p className="text-sm font-medium text-gray-700 mb-1">Medicamentos:</p>
                                            <ul className="text-sm text-gray-600 list-disc list-inside">
                                                {Array.isArray(prescription.medications)
                                                    ? prescription.medications.map((med, i) => (
                                                        <li key={i}>{typeof med === 'object' ? `${med.name} - ${med.dosage}` : med}</li>
                                                    ))
                                                    : <li>{prescription.medications}</li>
                                                }
                                            </ul>
                                        </div>
                                    )}

                                    {prescription.verification_code && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-gray-500">Código:</span>
                                            <code className="bg-gray-100 px-2 py-1 rounded font-mono">
                                                {prescription.verification_code}
                                            </code>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => handleDownload(prescription.id)}
                                    className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
                                >
                                    📥 Descargar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
