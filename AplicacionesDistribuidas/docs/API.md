# Documentación de la API - Sistema de Triage Remoto

## Base URL
```
http://localhost:8000/api
```

## Autenticación
Todos los endpoints protegidos requieren el header:
```
Authorization: Bearer <access_token>
```

---

## Auth Service `/auth`

### POST /auth/register
Registrar nuevo usuario.

**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123",
  "role": "PATIENT",
  "nombre": "Juan",
  "apellido": "Pérez"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": { "id": "uuid", "email": "...", "role": "PATIENT" }
}
```

### POST /auth/login
Iniciar sesión.

**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "...", "role": "PATIENT" },
    "accessToken": "jwt...",
    "refreshToken": "jwt..."
  }
}
```

### POST /auth/refresh-token
Renovar access token.

**Body:**
```json
{ "refreshToken": "jwt..." }
```

### GET /auth/profile 🔒
Obtener perfil del usuario autenticado.

### GET /auth/doctors
Obtener listado de médicos (público).

---

## Patient Service `/patients`

### POST /patients 🔒
Crear perfil de paciente.

**Body:**
```json
{
  "user_id": "uuid",
  "cedula": "1234567890",
  "nombres": "Juan Carlos",
  "apellidos": "Pérez López",
  "email": "juan@ejemplo.com",
  "telefono": "0991234567",
  "fecha_nacimiento": "1990-05-15",
  "sexo": "M",
  "enfermedades_cronicas": ["Diabetes", "Hipertensión"],
  "alergias": ["Penicilina"]
}
```

### GET /patients 🔒
Listar pacientes con paginación.

**Query params:** `page`, `limit`, `search`

### GET /patients/:id 🔒
Obtener paciente por ID.

### GET /patients/:id/medical-history 🔒
Obtener historial médico del paciente.

---

## Triage Service `/triage`

### GET /triage/questionnaire
Obtener las 8 preguntas del cuestionario.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "total_questions": 8,
    "questions": [
      { "id": 1, "text": "¿Presenta dificultad para respirar?", "type": "single_choice", "options": ["No", "Un poco", "Sí, mucha dificultad"] }
    ]
  }
}
```

### POST /triage/classify 🔒
Enviar respuestas y obtener clasificación.

**Body:**
```json
{
  "patient_id": "uuid",
  "responses": [
    { "question_id": 1, "answer_value": "Un poco" },
    { "question_id": 2, "answer_value": "5" }
  ]
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "triage_id": "uuid",
    "classification": "AMARILLO",
    "score": 25,
    "critical_flags": [],
    "symptoms_detected": ["Dificultad respiratoria"],
    "recommendation": "Se recomienda teleconsulta en las próximas 24 horas."
  }
}
```

### GET /triage/pending 🔒 (Admin)
Obtener triages pendientes de atención.

**Query params:** `classification` (opcional: ROJO, AMARILLO, VERDE)

### GET /triage/stats 🔒 (Admin)
Estadísticas de triages por clasificación.

---

## Appointment Service `/appointments`

### POST /appointments 🔒
Crear nueva cita.

**Body:**
```json
{
  "patient_id": "uuid",
  "doctor_id": "uuid",
  "triage_id": "uuid",
  "scheduled_date": "2026-01-25",
  "scheduled_time": "10:30",
  "reason": "Consulta por síntomas respiratorios"
}
```

### GET /appointments/available-slots 🔒
Obtener horarios disponibles.

**Query params:** `doctor_id`, `date`

### GET /appointments/teleconsult/:id/join/patient 🔒
Obtener URL para unirse como paciente.

### GET /appointments/teleconsult/:id/join/doctor 🔒
Obtener URL para unirse como médico (moderador).

### POST /appointments/prescriptions 🔒 (Doctor)
Generar receta PDF.

**Body:**
```json
{
  "appointment_id": "uuid",
  "doctor_id": "uuid",
  "patient_id": "uuid",
  "diagnosis": "Infección respiratoria leve",
  "medications": [
    { "nombre": "Paracetamol", "dosis": "500mg", "frecuencia": "Cada 8 horas", "duracion_dias": 5 }
  ]
}
```

---

## FollowUp Service `/followup`

### GET /followup/patient/:patientId 🔒
Obtener seguimientos del paciente.

### POST /followup/:id/response 🔒
Registrar respuesta de seguimiento.

**Body:**
```json
{
  "improvement_score": 4,
  "symptoms_improved": true,
  "new_symptoms": null
}
```

---

## Analytics Service `/analytics`

### GET /analytics/kpis 🔒 (Admin)
Obtener KPIs del sistema.

**Query params:** `start_date`, `end_date`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "total_patients": 150,
    "total_triages": 280,
    "triages_by_level": { "ROJO": 15, "AMARILLO": 85, "VERDE": 180 },
    "teleconsults": { "completed": 120, "cancelled": 8 },
    "in_person_visits_avoided": 156,
    "followup_response_rate": 0.72
  }
}
```

### GET /analytics/dashboard 🔒 (Admin)
Resumen en tiempo real para el día actual.

---

## Códigos de Error

| Código | Descripción |
|--------|-------------|
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - Token inválido o expirado |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Recurso no encontrado |
| 409 | Conflict - Recurso duplicado |
| 500 | Internal Server Error |

## Roles

- **PATIENT**: Pacientes que usan el sistema
- **DOCTOR**: Médicos que atienden teleconsultas
- **ADMIN**: Administradores del sistema
