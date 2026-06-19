import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../App'
import { triageService, appointmentService } from '../services/triageService'
import { authService } from '../services/authService'

const QUESTIONS = [
    { id: 1, text: '¿Presenta dificultad para respirar?', type: 'single_choice', options: ['No', 'Un poco', 'Sí, mucha dificultad'] },
    { id: 2, text: '¿Tiene dolor en el pecho?', type: 'scale', min: 0, max: 10, label: 'Nivel de dolor (0 = ninguno, 10 = insoportable)' },
    { id: 3, text: '¿Ha perdido el conocimiento recientemente?', type: 'boolean', options: ['Sí', 'No'] },
    { id: 4, text: '¿Presenta fiebre?', type: 'conditional', options: ['No', 'Sí'], conditionalQuestion: '¿Cuántos grados?', conditionalType: 'number' },
    { id: 5, text: '¿Cuánto tiempo lleva con los síntomas?', type: 'single_choice', options: ['Menos de 6 horas', '6-24 horas', '1-3 días', 'Más de 3 días'] },
    { id: 6, text: '¿Tiene antecedentes de enfermedades crónicas?', type: 'multiple_choice', options: ['Diabetes', 'Hipertensión', 'Enf. cardíaca', 'Asma', 'Ninguna', 'Otra'] },
    { id: 7, text: '¿Está tomando medicación actualmente?', type: 'conditional', options: ['No', 'Sí'], conditionalQuestion: '¿Cuál medicación?', conditionalType: 'text' },
    { id: 8, text: '¿Los síntomas han empeorado en las últimas horas?', type: 'single_choice', options: ['No', 'Se mantienen igual', 'Sí, han empeorado'] }
]

export default function TriagePage() {
    const { user } = useContext(AuthContext)
    const navigate = useNavigate()
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [responses, setResponses] = useState({})
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [scheduling, setScheduling] = useState(false)
    const [doctors, setDoctors] = useState([])
    const [availableSlots, setAvailableSlots] = useState([])
    const [scheduleForm, setScheduleForm] = useState({ doctor_id: '', date: '', time: '' })

    const question = QUESTIONS[currentQuestion]
    const progress = ((currentQuestion + 1) / QUESTIONS.length) * 100

    const handleAnswer = (answer) => {
        setResponses({ ...responses, [question.id]: answer })
    }

    const handleNext = async () => {
        if (currentQuestion < QUESTIONS.length - 1) {
            setCurrentQuestion(currentQuestion + 1)
        } else {
            await submitQuestionnaire()
        }
    }

    const handlePrevious = () => {
        if (currentQuestion > 0) setCurrentQuestion(currentQuestion - 1)
    }

    const submitQuestionnaire = async () => {
        setLoading(true)
        try {
            const formattedResponses = Object.entries(responses).map(([qId, answer]) => ({
                question_id: parseInt(qId),
                answer_value: answer
            }))
            const res = await triageService.submitQuestionnaire(user.id, formattedResponses)
            if (res.success) {
                setResult(res.data)
                if (res.data.classification !== 'ROJO') {
                    const doctorsRes = await authService.getDoctors()
                    setDoctors(doctorsRes.data || [])
                }
            }
        } catch (error) {
            console.error('Error submitting:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadAvailableSlots = async (doctorId, date) => {
        if (!doctorId || !date) return
        try {
            const res = await appointmentService.getAvailableSlots(doctorId, date)
            setAvailableSlots(res.data?.available_slots || [])
        } catch (error) {
            console.error('Error loading slots:', error)
        }
    }

    const handleScheduleAppointment = async () => {
        setScheduling(true)
        try {
            await appointmentService.create({
                patient_id: user.id,
                doctor_id: scheduleForm.doctor_id,
                triage_id: result.triage_id,
                scheduled_date: scheduleForm.date,
                scheduled_time: scheduleForm.time + ':00',
                reason: 'Teleconsulta por triage'
            })
            navigate('/dashboard')
        } catch (error) {
            console.error('Error scheduling:', error)
        } finally {
            setScheduling(false)
        }
    }

    const getClassificationColors = (classification) => {
        const colors = {
            ROJO: { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-800', btn: 'bg-red-600 hover:bg-red-700' },
            AMARILLO: { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-800', btn: 'bg-yellow-600 hover:bg-yellow-700' },
            VERDE: { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-800', btn: 'bg-green-600 hover:bg-green-700' }
        }
        return colors[classification] || colors.VERDE
    }

    // Result Screen
    if (result) {
        const colors = getClassificationColors(result.classification)
        return (
            <div className="max-w-2xl mx-auto px-4 py-8">
                <div className={`${colors.bg} ${colors.border} border-4 rounded-2xl p-8`}>
                    <div className="text-center mb-6">
                        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${colors.bg} mb-4`}>
                            <span className="text-4xl">
                                {result.classification === 'ROJO' && '🔴'}
                                {result.classification === 'AMARILLO' && '🟡'}
                                {result.classification === 'VERDE' && '🟢'}
                            </span>
                        </div>
                        <h2 className={`text-3xl font-bold ${colors.text}`}>
                            Clasificación: {result.classification}
                        </h2>
                        <p className="text-gray-600 mt-2">Puntuación: {result.score} puntos</p>
                    </div>

                    <div className="bg-white rounded-xl p-4 mb-6">
                        <h3 className="font-semibold text-gray-900 mb-2">Recomendación:</h3>
                        <p className="text-gray-700">{result.recommendation}</p>
                    </div>

                    {result.critical_flags?.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                            <h3 className="font-semibold text-red-800 mb-2">⚠️ Alertas Críticas:</h3>
                            <ul className="list-disc list-inside text-red-700">
                                {result.critical_flags.map((flag, i) => (
                                    <li key={i}>{flag.replace(/_/g, ' ')}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {result.classification === 'ROJO' ? (
                        <div className="text-center">
                            <a href="tel:911" className="inline-flex items-center justify-center w-full py-4 bg-red-600 text-white text-xl font-bold rounded-xl hover:bg-red-700">
                                🚨 LLAMAR EMERGENCIA 911
                            </a>
                            <p className="text-sm text-gray-600 mt-4">
                                Diríjase inmediatamente al hospital más cercano
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900">📅 Agendar Teleconsulta</h3>
                            <div className="grid gap-4">
                                <select value={scheduleForm.doctor_id} onChange={(e) => { setScheduleForm({ ...scheduleForm, doctor_id: e.target.value }); setAvailableSlots([]) }} className="w-full">
                                    <option value="">Seleccione un médico</option>
                                    {doctors.map(doc => (
                                        <option key={doc.id} value={doc.id}>{doc.nombre} {doc.apellido} - {doc.specialty}</option>
                                    ))}
                                </select>
                                <input type="date" value={scheduleForm.date} onChange={(e) => { setScheduleForm({ ...scheduleForm, date: e.target.value }); loadAvailableSlots(scheduleForm.doctor_id, e.target.value) }} min={new Date().toISOString().split('T')[0]} />
                                {availableSlots.length > 0 && (
                                    <div className="grid grid-cols-4 gap-2">
                                        {availableSlots.map(slot => (
                                            <button key={slot.time} onClick={() => setScheduleForm({ ...scheduleForm, time: slot.time })} className={`py-2 px-3 text-sm rounded-lg border ${scheduleForm.time === slot.time ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 hover:border-primary-500'}`}>
                                                {slot.time}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <button onClick={handleScheduleAppointment} disabled={!scheduleForm.doctor_id || !scheduleForm.date || !scheduleForm.time || scheduling} className="w-full btn btn-primary py-3 disabled:opacity-50">
                                    {scheduling ? 'Agendando...' : 'Confirmar Cita'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // Questionnaire
    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <div className="mb-8">
                <div className="flex justify-between text-sm mb-2">
                    <span>Pregunta {currentQuestion + 1} de {QUESTIONS.length}</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-primary-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
            </div>

            <div className="card">
                <h3 className="text-xl font-semibold mb-6">{question.text}</h3>

                {question.type === 'single_choice' && (
                    <div className="space-y-3">
                        {question.options.map(option => (
                            <button key={option} onClick={() => handleAnswer(option)} className={`w-full p-4 text-left rounded-lg border-2 transition-all ${responses[question.id] === option ? 'border-primary-600 bg-primary-50' : 'border-gray-300 hover:border-primary-400'}`}>
                                {option}
                            </button>
                        ))}
                    </div>
                )}

                {question.type === 'scale' && (
                    <div>
                        <input type="range" min={question.min} max={question.max} value={responses[question.id] || 0} onChange={(e) => handleAnswer(e.target.value)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                        <div className="flex justify-between text-sm text-gray-600 mt-2">
                            <span>{question.min} - Sin dolor</span>
                            <span className="text-3xl font-bold text-primary-600">{responses[question.id] || 0}</span>
                            <span>{question.max} - Insoportable</span>
                        </div>
                    </div>
                )}

                {question.type === 'boolean' && (
                    <div className="flex gap-4">
                        {question.options.map(option => (
                            <button key={option} onClick={() => handleAnswer(option)} className={`flex-1 p-4 rounded-lg border-2 transition-all ${responses[question.id] === option ? 'border-primary-600 bg-primary-50' : 'border-gray-300 hover:border-primary-400'}`}>
                                {option}
                            </button>
                        ))}
                    </div>
                )}

                {question.type === 'conditional' && (
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            {question.options.map(option => (
                                <button key={option} onClick={() => handleAnswer(option === 'Sí' ? { confirmed: true } : option)} className={`flex-1 p-4 rounded-lg border-2 transition-all ${(responses[question.id] === option || responses[question.id]?.confirmed) && option === 'Sí' ? 'border-primary-600 bg-primary-50' : responses[question.id] === option ? 'border-primary-600 bg-primary-50' : 'border-gray-300 hover:border-primary-400'}`}>
                                    {option}
                                </button>
                            ))}
                        </div>
                        {responses[question.id]?.confirmed && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{question.conditionalQuestion}</label>
                                <input type={question.conditionalType} value={responses[question.id]?.temperature || responses[question.id]?.text || ''} onChange={(e) => handleAnswer({ confirmed: true, [question.conditionalType === 'number' ? 'temperature' : 'text']: e.target.value })} placeholder={question.conditionalType === 'number' ? '38.5' : 'Escriba aquí...'} />
                            </div>
                        )}
                    </div>
                )}

                {question.type === 'multiple_choice' && (
                    <div className="grid grid-cols-2 gap-3">
                        {question.options.map(option => {
                            const selected = Array.isArray(responses[question.id]) && responses[question.id].includes(option)
                            return (
                                <button key={option} onClick={() => {
                                    const current = Array.isArray(responses[question.id]) ? responses[question.id] : []
                                    if (option === 'Ninguna') {
                                        handleAnswer(['Ninguna'])
                                    } else {
                                        const filtered = current.filter(o => o !== 'Ninguna')
                                        handleAnswer(selected ? filtered.filter(o => o !== option) : [...filtered, option])
                                    }
                                }} className={`p-3 rounded-lg border-2 transition-all ${selected ? 'border-primary-600 bg-primary-50' : 'border-gray-300 hover:border-primary-400'}`}>
                                    {option}
                                </button>
                            )
                        })}
                    </div>
                )}

                <div className="flex justify-between mt-8">
                    <button onClick={handlePrevious} disabled={currentQuestion === 0} className="btn btn-secondary disabled:opacity-50">
                        ← Anterior
                    </button>
                    <button onClick={handleNext} disabled={!responses[question.id] || loading} className="btn btn-primary disabled:opacity-50">
                        {loading ? 'Procesando...' : currentQuestion === QUESTIONS.length - 1 ? 'Finalizar' : 'Siguiente →'}
                    </button>
                </div>
            </div>
        </div>
    )
}
