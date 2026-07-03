import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authService } from '../services/authService'

export default function RegisterPage() {
    const navigate = useNavigate()
    const [mode, setMode] = useState('local') // 'local' | 'sso'
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState({
        email: '', password: '', confirmPassword: '',
        nombre: '', apellido: '', cedula: '', telefono: ''
    })
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (step === 1) {
            if (formData.password !== formData.confirmPassword) {
                setError('Las contraseñas no coinciden')
                return
            }
            setError('')
            setStep(2)
            return
        }

        setLoading(true)
        setError('')

        if (mode === 'sso') {
            const result = await authService.registerKeycloak({
                email: formData.email,
                password: formData.password,
                nombre: formData.nombre,
                apellido: formData.apellido,
            })
            if (result.success) {
                setSuccess('Cuenta SSO creada. Usa el botón "Iniciar sesión con SSO" en el login.')
            } else {
                setError(result.error?.message || 'Error al registrar en Keycloak')
            }
        } else {
            const result = await authService.register({
                email: formData.email,
                password: formData.password,
                role: 'PATIENT',
                nombre: formData.nombre,
                apellido: formData.apellido,
            })
            if (result.success) {
                navigate('/login')
            } else {
                setError(result.error?.message || 'Error al registrar')
            }
        }
        setLoading(false)
    }

    const submitLabel = (s, m) => {
        if (s === 1) return 'Continuar'
        return m === 'sso' ? 'Crear cuenta SSO' : 'Crear Cuenta'
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 py-12 px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
                        <span className="text-primary-600 font-bold text-3xl">T</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white">Registro de Paciente</h1>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8">

                    {/* Selector de tipo de cuenta */}
                    <div className="mb-6">
                        <p className="text-sm font-medium text-gray-700 mb-3 text-center">¿Cómo quieres crear tu cuenta?</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => { setMode('local'); setStep(1); setError(''); setSuccess('') }}
                                className={`py-3 px-4 rounded-lg text-sm font-medium border-2 transition-colors ${
                                    mode === 'local'
                                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                }`}
                            >
                                <div className="font-semibold">Cuenta local</div>
                                <div className="text-xs mt-0.5 font-normal opacity-75">Solo Triage Remoto</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => { setMode('sso'); setStep(1); setError(''); setSuccess('') }}
                                className={`py-3 px-4 rounded-lg text-sm font-medium border-2 transition-colors ${
                                    mode === 'sso'
                                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                }`}
                            >
                                <div className="font-semibold">Cuenta SSO</div>
                                <div className="text-xs mt-0.5 font-normal opacity-75">Acceso institucional</div>
                            </button>
                        </div>
                        {mode === 'sso' && (
                            <p className="text-xs text-gray-500 mt-2 text-center">
                                Tu cuenta se crea en Keycloak (Universidad). Podrás iniciar sesión con SSO.
                            </p>
                        )}
                    </div>

                    {/* Progress */}
                    {!success && (
                        <div className="flex items-center justify-center mb-6">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>1</div>
                            <div className={`w-16 h-1 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>2</div>
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm text-center">
                            {success}
                            <div className="mt-3">
                                <Link to="/login" className="text-primary-600 font-medium hover:underline">Ir al login</Link>
                            </div>
                        </div>
                    )}

                    {!success && (
                        <>
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {step === 1 && (
                                    <>
                                        <div>
                                            <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                                            <input id="reg-email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                                        </div>
                                        <div>
                                            <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                                            <input id="reg-password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength={8} />
                                        </div>
                                        <div>
                                            <label htmlFor="reg-confirm" className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
                                            <input id="reg-confirm" type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} required />
                                        </div>
                                    </>
                                )}

                                {step === 2 && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="reg-nombre" className="block text-sm font-medium text-gray-700 mb-1">Nombres</label>
                                                <input id="reg-nombre" type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} required />
                                            </div>
                                            <div>
                                                <label htmlFor="reg-apellido" className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                                                <input id="reg-apellido" type="text" value={formData.apellido} onChange={(e) => setFormData({ ...formData, apellido: e.target.value })} required />
                                            </div>
                                        </div>
                                        {mode === 'local' && (
                                            <>
                                                <div>
                                                    <label htmlFor="reg-cedula" className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
                                                    <input id="reg-cedula" type="text" value={formData.cedula} onChange={(e) => setFormData({ ...formData, cedula: e.target.value })} maxLength={10} />
                                                </div>
                                                <div>
                                                    <label htmlFor="reg-telefono" className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                                    <input id="reg-telefono" type="tel" value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} />
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}

                                <div className="flex gap-3">
                                    {step === 2 && (
                                        <button type="button" onClick={() => setStep(1)} className="flex-1 btn btn-secondary">Atrás</button>
                                    )}
                                    <button type="submit" disabled={loading} className="flex-1 btn btn-primary">
                                        {loading ? 'Registrando...' : submitLabel(step, mode)}
                                    </button>
                                </div>
                            </form>
                        </>
                    )}

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            ¿Ya tienes cuenta? <Link to="/login" className="text-primary-600 font-medium hover:underline">Inicia sesión</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
