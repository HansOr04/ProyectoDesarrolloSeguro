import { useState } from 'react'
import { patientService, triageService } from '../../services/triageService'

export default function DoctorPanel() {
    const [activeTab, setActiveTab] = useState('search') // search, newPatient, triage
    const [searchTerm, setSearchTerm] = useState('')
    const [patients, setPatients] = useState([])
    const [selectedPatient, setSelectedPatient] = useState(null)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState(null)

    // Form states
    const [patientForm, setPatientForm] = useState({
        cedula: '', nombres: '', apellidos: '', email: '', telefono: '',
        fecha_nacimiento: '', sexo: 'M', direccion: '', ciudad: '', provincia: ''
    })

    const [triageResponses, setTriageResponses] = useState({
        dificultad_respirar: 'No', // 'No', 'Un poco', 'Sí, mucha dificultad'
        dolor_pecho: 0,
        perdida_conocimiento: 'No', // 'Sí', 'No'
        fiebre: 'No', // 'No', 'Sí'
        temperatura: '',
        duracion_sintomas: '1-3 días',
        enfermedades_cronicas: [],
        medicacion: 'No', // 'No', 'Sí'
        medicamentos: '',
        empeoramiento: 'No' // 'No', 'Se mantienen igual', 'Sí, han empeorado'
    })

    const searchPatients = async () => {
        if (!searchTerm.trim()) return
        setLoading(true)
        setMessage(null)
        try {
            const res = await patientService.search(searchTerm)
            setPatients(res.data?.patients || [])
            if (res.data?.patients?.length === 0) {
                setMessage({ type: 'info', text: 'No se encontraron pacientes' })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error al buscar pacientes' })
        } finally {
            setLoading(false)
        }
    }

    const createPatient = async (e) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)
        try {
            const res = await patientService.create(patientForm)
            setMessage({ type: 'success', text: 'Paciente registrado exitosamente' })
            setSelectedPatient(res.data)
            setPatientForm({
                cedula: '', nombres: '', apellidos: '', email: '', telefono: '',
                fecha_nacimiento: '', sexo: 'M', direccion: '', ciudad: '', provincia: ''
            })
            setActiveTab('triage')
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error?.message || 'Error al registrar paciente' })
        } finally {
            setLoading(false)
        }
    }

    const submitTriage = async (e) => {
        e.preventDefault()
        if (!selectedPatient) {
            setMessage({ type: 'error', text: 'Debe seleccionar un paciente primero' })
            return
        }
        setLoading(true)
        setMessage(null)
        try {
            // Backend expects: question_id (number), answer_value (string matching QUESTIONS options)
            const responses = [
                {
                    question_id: 1,
                    answer_value: triageResponses.dificultad_respirar
                },
                {
                    question_id: 2,
                    answer_value: String(triageResponses.dolor_pecho)
                },
                {
                    question_id: 3,
                    answer_value: triageResponses.perdida_conocimiento
                },
                {
                    question_id: 4,
                    answer_value: triageResponses.fiebre === 'Sí'
                        ? { confirmed: true, temperature: triageResponses.temperatura || '37' }
                        : 'No'
                },
                {
                    question_id: 5,
                    answer_value: triageResponses.duracion_sintomas
                },
                {
                    question_id: 6,
                    answer_value: triageResponses.enfermedades_cronicas.length > 0
                        ? triageResponses.enfermedades_cronicas
                        : ['Ninguna']
                },
                {
                    question_id: 7,
                    answer_value: triageResponses.medicacion === 'Sí'
                        ? { confirmed: true, medication: triageResponses.medicamentos }
                        : 'No'
                },
                {
                    question_id: 8,
                    answer_value: triageResponses.empeoramiento
                }
            ]
            const res = await triageService.submitQuestionnaire(selectedPatient.id, responses)
            setMessage({
                type: res.data?.classification === 'ROJO' ? 'error' :
                    res.data?.classification === 'AMARILLO' ? 'warning' : 'success',
                text: `Triage registrado: Clasificación ${res.data?.classification || 'completada'} - Score: ${res.data?.score || 0}`
            })
            // Reset to defaults
            setTriageResponses({
                dificultad_respirar: 'No', dolor_pecho: 0, perdida_conocimiento: 'No',
                fiebre: 'No', temperatura: '', duracion_sintomas: '1-3 días',
                enfermedades_cronicas: [], medicacion: 'No', medicamentos: '', empeoramiento: 'No'
            })
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error?.message || 'Error al registrar triage' })
        } finally {
            setLoading(false)
        }
    }

    const selectPatient = (patient) => {
        setSelectedPatient(patient)
        setActiveTab('triage')
        setMessage({ type: 'info', text: `Paciente seleccionado: ${patient.nombres} ${patient.apellidos}` })
    }

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex space-x-2 border-b">
                <button
                    onClick={() => setActiveTab('search')}
                    className={`px-4 py-2 font-medium ${activeTab === 'search' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}
                >
                    Buscar Paciente
                </button>
                <button
                    onClick={() => setActiveTab('newPatient')}
                    className={`px-4 py-2 font-medium ${activeTab === 'newPatient' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}
                >
                    Nuevo Paciente
                </button>
                <button
                    onClick={() => setActiveTab('triage')}
                    className={`px-4 py-2 font-medium ${activeTab === 'triage' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}
                >
                    Registrar Triage
                </button>
            </div>

            {/* Messages */}
            {message && (
                <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' :
                    message.type === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Selected Patient Banner */}
            {selectedPatient && (
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 flex justify-between items-center">
                    <div>
                        <p className="text-sm text-primary-600">Paciente seleccionado:</p>
                        <p className="font-semibold text-primary-900">
                            {selectedPatient.nombres} {selectedPatient.apellidos} - CI: {selectedPatient.cedula}
                        </p>
                    </div>
                    <button onClick={() => setSelectedPatient(null)} className="text-primary-600 hover:text-primary-800">
                        Cambiar
                    </button>
                </div>
            )}

            {/* Search Tab */}
            {activeTab === 'search' && (
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Buscar por nombre, cedula o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && searchPatients()}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <button
                            onClick={searchPatients}
                            disabled={loading}
                            className="btn btn-primary"
                        >
                            {loading ? 'Buscando...' : 'Buscar'}
                        </button>
                    </div>

                    {patients.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Cedula</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Nombre</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Email</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {patients.map((patient) => (
                                        <tr key={patient.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm">{patient.cedula}</td>
                                            <td className="px-4 py-3 text-sm">{patient.nombres} {patient.apellidos}</td>
                                            <td className="px-4 py-3 text-sm">{patient.email}</td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => selectPatient(patient)}
                                                    className="text-primary-600 hover:underline text-sm font-medium"
                                                >
                                                    Seleccionar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* New Patient Tab */}
            {activeTab === 'newPatient' && (
                <form onSubmit={createPatient} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cedula *</label>
                            <input
                                type="text"
                                required
                                maxLength={10}
                                value={patientForm.cedula}
                                onChange={(e) => setPatientForm({ ...patientForm, cedula: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                            <input
                                type="email"
                                required
                                value={patientForm.email}
                                onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombres *</label>
                            <input
                                type="text"
                                required
                                value={patientForm.nombres}
                                onChange={(e) => setPatientForm({ ...patientForm, nombres: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
                            <input
                                type="text"
                                required
                                value={patientForm.apellidos}
                                onChange={(e) => setPatientForm({ ...patientForm, apellidos: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                            <input
                                type="tel"
                                value={patientForm.telefono}
                                onChange={(e) => setPatientForm({ ...patientForm, telefono: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Nacimiento</label>
                            <input
                                type="date"
                                value={patientForm.fecha_nacimiento}
                                onChange={(e) => setPatientForm({ ...patientForm, fecha_nacimiento: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
                            <select
                                value={patientForm.sexo}
                                onChange={(e) => setPatientForm({ ...patientForm, sexo: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="M">Masculino</option>
                                <option value="F">Femenino</option>
                                <option value="Otro">Otro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                            <input
                                type="text"
                                value={patientForm.ciudad}
                                onChange={(e) => setPatientForm({ ...patientForm, ciudad: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Direccion</label>
                        <input
                            type="text"
                            value={patientForm.direccion}
                            onChange={(e) => setPatientForm({ ...patientForm, direccion: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <button type="submit" disabled={loading} className="btn btn-primary w-full">
                        {loading ? 'Registrando...' : 'Registrar Paciente'}
                    </button>
                </form>
            )}

            {/* Triage Tab */}
            {activeTab === 'triage' && (
                <form onSubmit={submitTriage} className="space-y-6">
                    {!selectedPatient && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
                            Primero debe buscar y seleccionar un paciente, o registrar uno nuevo.
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Question 1: Dificultad Respirar */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <label className="block font-medium mb-2">¿Presenta dificultad para respirar?</label>
                            <select
                                value={triageResponses.dificultad_respirar}
                                onChange={(e) => setTriageResponses({ ...triageResponses, dificultad_respirar: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            >
                                <option value="No">No</option>
                                <option value="Un poco">Un poco</option>
                                <option value="Sí, mucha dificultad">Sí, mucha dificultad</option>
                            </select>
                        </div>

                        {/* Question 2: Dolor Pecho */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <label className="block font-medium mb-2">¿Tiene dolor en el pecho? (0-10)</label>
                            <input
                                type="range"
                                min="0"
                                max="10"
                                value={triageResponses.dolor_pecho}
                                onChange={(e) => setTriageResponses({ ...triageResponses, dolor_pecho: parseInt(e.target.value) })}
                                className="w-full"
                            />
                            <span className={`text-lg font-bold ${triageResponses.dolor_pecho >= 8 ? 'text-red-600' : triageResponses.dolor_pecho >= 5 ? 'text-yellow-600' : 'text-green-600'}`}>
                                {triageResponses.dolor_pecho}
                            </span>
                        </div>

                        {/* Question 3: Pérdida Conocimiento */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <label className="block font-medium mb-2">¿Ha perdido el conocimiento recientemente?</label>
                            <select
                                value={triageResponses.perdida_conocimiento}
                                onChange={(e) => setTriageResponses({ ...triageResponses, perdida_conocimiento: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            >
                                <option value="No">No</option>
                                <option value="Sí">Sí</option>
                            </select>
                        </div>

                        {/* Question 4: Fiebre */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <label className="block font-medium mb-2">¿Presenta fiebre?</label>
                            <select
                                value={triageResponses.fiebre}
                                onChange={(e) => setTriageResponses({ ...triageResponses, fiebre: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2"
                            >
                                <option value="No">No</option>
                                <option value="Sí">Sí</option>
                            </select>
                            {triageResponses.fiebre === 'Sí' && (
                                <input
                                    type="number"
                                    step="0.1"
                                    placeholder="Temperatura (ej: 38.5)"
                                    value={triageResponses.temperatura}
                                    onChange={(e) => setTriageResponses({ ...triageResponses, temperatura: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                />
                            )}
                        </div>

                        {/* Question 5: Duración Síntomas */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <label className="block font-medium mb-2">¿Cuánto tiempo lleva con los síntomas?</label>
                            <select
                                value={triageResponses.duracion_sintomas}
                                onChange={(e) => setTriageResponses({ ...triageResponses, duracion_sintomas: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            >
                                <option value="Menos de 6 horas">Menos de 6 horas</option>
                                <option value="6-24 horas">6-24 horas</option>
                                <option value="1-3 días">1-3 días</option>
                                <option value="Más de 3 días">Más de 3 días</option>
                            </select>
                        </div>

                        {/* Question 6: Enfermedades Crónicas */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <label className="block font-medium mb-2">¿Tiene antecedentes de enfermedades crónicas?</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['Diabetes', 'Hipertensión', 'Enf. cardíaca', 'Asma', 'Otra'].map((enf) => (
                                    <label key={enf} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={triageResponses.enfermedades_cronicas.includes(enf)}
                                            onChange={(e) => {
                                                const newEnf = e.target.checked
                                                    ? [...triageResponses.enfermedades_cronicas, enf]
                                                    : triageResponses.enfermedades_cronicas.filter(e => e !== enf)
                                                setTriageResponses({ ...triageResponses, enfermedades_cronicas: newEnf })
                                            }}
                                            className="w-4 h-4 text-primary-600 rounded"
                                        />
                                        <span className="text-sm">{enf}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Question 7: Medicación */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <label className="block font-medium mb-2">¿Está tomando medicación actualmente?</label>
                            <select
                                value={triageResponses.medicacion}
                                onChange={(e) => setTriageResponses({ ...triageResponses, medicacion: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2"
                            >
                                <option value="No">No</option>
                                <option value="Sí">Sí</option>
                            </select>
                            {triageResponses.medicacion === 'Sí' && (
                                <input
                                    type="text"
                                    placeholder="¿Cuál medicación?"
                                    value={triageResponses.medicamentos}
                                    onChange={(e) => setTriageResponses({ ...triageResponses, medicamentos: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                />
                            )}
                        </div>

                        {/* Question 8: Empeoramiento */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <label className="block font-medium mb-2">¿Los síntomas han empeorado en las últimas horas?</label>
                            <select
                                value={triageResponses.empeoramiento}
                                onChange={(e) => setTriageResponses({ ...triageResponses, empeoramiento: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            >
                                <option value="No">No</option>
                                <option value="Se mantienen igual">Se mantienen igual</option>
                                <option value="Sí, han empeorado">Sí, han empeorado</option>
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !selectedPatient}
                        className="btn btn-primary w-full disabled:opacity-50"
                    >
                        {loading ? 'Procesando...' : 'Registrar Triage'}
                    </button>
                </form>
            )}
        </div>
    )
}
