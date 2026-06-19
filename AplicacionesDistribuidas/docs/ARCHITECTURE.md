# Arquitectura del Sistema de Triage Remoto Distribuido

## Visión General

Este documento describe la arquitectura técnica del sistema de Triage Remoto, una plataforma de telemedicina construida con arquitectura de microservicios.

## Diagrama de Arquitectura

```
                                    ┌─────────────────────────────┐
                                    │      FRONTEND (React)       │
                                    │        Puerto 3000          │
                                    └─────────────┬───────────────┘
                                                  │
                                    ┌─────────────▼───────────────┐
                                    │      API GATEWAY (Nginx)    │
                                    │        Puerto 8000          │
                                    └─────────────┬───────────────┘
                                                  │
          ┌───────────────────────────────────────┼───────────────────────────────────────┐
          │                                       │                                       │
┌─────────▼─────────┐  ┌─────────────────┐  ┌─────▼─────────┐  ┌─────────────┐  ┌─────────▼─────────┐
│  AUTH SERVICE     │  │ PATIENT SERVICE │  │TRIAGE SERVICE │  │ APPOINTMENT │  │NOTIFICATION SERVICE│
│    Puerto 5001    │  │   Puerto 5002   │  │  Puerto 5003  │  │SERVICE 5004 │  │    Puerto 5005     │
└─────────┬─────────┘  └────────┬────────┘  └───────┬───────┘  └──────┬──────┘  └─────────┬─────────┘
          │                     │                   │                 │                   │
┌─────────▼─────────┐  ┌────────▼────────┐  ┌───────▼───────┐  ┌──────▼──────┐          │
│    PostgreSQL     │  │   PostgreSQL    │  │  PostgreSQL   │  │ PostgreSQL  │          │
│    (auth_db)      │  │  (patient_db)   │  │  (triage_db)  │  │(appoint_db) │          │
└───────────────────┘  └─────────────────┘  └───────────────┘  └─────────────┘          │
                                                                                          │
┌─────────────────────┐  ┌─────────────────────┐                        ┌─────────────────▼─────────┐
│  FOLLOWUP SERVICE   │  │  ANALYTICS SERVICE  │                        │         MongoDB           │
│     Puerto 5006     │  │     Puerto 5007     │                        │        (logs_db)          │
└──────────┬──────────┘  └──────────┬──────────┘                        └───────────────────────────┘
           │                        │
     ┌─────▼──────┐           ┌─────▼──────┐
     │ PostgreSQL │           │Cross-DB    │
     │(followup_db│           │Queries     │
     └────────────┘           └────────────┘
                   
                   ┌───────────────────────────┐
                   │       RabbitMQ            │
                   │   (Message Broker)        │
                   │     Puerto 5672           │
                   └───────────────────────────┘
                   
                   ┌───────────────────────────┐
                   │         Redis             │
                   │     (Cache/Sessions)      │
                   │     Puerto 6379           │
                   └───────────────────────────┘
```

## Microservicios

### 1. Auth Service (Puerto 5001)
- **Responsabilidad**: Autenticación y autorización
- **Base de datos**: PostgreSQL (auth_db)
- **Endpoints principales**:
  - `POST /register` - Registro de usuarios
  - `POST /login` - Inicio de sesión (JWT)
  - `POST /refresh-token` - Renovación de tokens
  - `GET /profile` - Perfil del usuario
  - `GET /doctors` - Listado de médicos

### 2. Patient Service (Puerto 5002)
- **Responsabilidad**: Gestión de pacientes
- **Base de datos**: PostgreSQL (patient_db)
- **Endpoints principales**:
  - `POST /` - Crear paciente
  - `GET /` - Listar pacientes
  - `GET /:id` - Detalle de paciente
  - `GET /:id/medical-history` - Historial médico

### 3. Triage Service (Puerto 5003)
- **Responsabilidad**: Clasificación de urgencias (ROJO/AMARILLO/VERDE)
- **Base de datos**: PostgreSQL (triage_db)
- **Cache**: Redis (para resultados de triage)
- **Endpoints principales**:
  - `GET /questionnaire` - Obtener cuestionario
  - `POST /classify` - Clasificar paciente
  - `GET /pending` - Triages pendientes
  - `GET /stats` - Estadísticas

### 4. Appointment Service (Puerto 5004)
- **Responsabilidad**: Gestión de citas y teleconsultas
- **Base de datos**: PostgreSQL (appointment_db)
- **Integraciones**: Jitsi Meet (videollamadas), PDFKit (recetas)
- **Endpoints principales**:
  - `POST /` - Crear cita
  - `GET /available-slots` - Horarios disponibles
  - `GET /teleconsult/:id/join` - Unirse a teleconsulta
  - `POST /prescriptions` - Generar receta PDF

### 5. Notification Service (Puerto 5005)
- **Responsabilidad**: Envío de notificaciones
- **Base de datos**: MongoDB (logs_db)
- **Integraciones**: Twilio (SMS), Nodemailer (Email)
- **Colas RabbitMQ**: `sms_queue`, `email_queue`

### 6. FollowUp Service (Puerto 5006)
- **Responsabilidad**: Seguimiento post-consulta
- **Base de datos**: PostgreSQL (followup_db)
- **Jobs**: Scheduler con node-cron
- **Endpoints principales**:
  - `GET /patient/:id` - Seguimientos del paciente
  - `POST /:id/response` - Registrar respuesta

### 7. Analytics Service (Puerto 5007)
- **Responsabilidad**: KPIs y reportes
- **Consultas**: Cross-database (múltiples PostgreSQL)
- **Endpoints principales**:
  - `GET /kpis` - Indicadores clave
  - `GET /dashboard` - Resumen en tiempo real

## Comunicación

### REST (Sincrónica)
- Frontend → API Gateway → Microservicios
- Servicio a servicio para validaciones

### Message Queue (Asincrónica)
- **Exchange `notifications`**: Envío de SMS/Email
- **Exchange `events`**: Eventos del sistema (triage.created, appointment.completed)
- **Exchange `dead_letter`**: Mensajes fallidos

## Seguridad

- **JWT**: Tokens de acceso (15min) y refresh (7 días)
- **Bcrypt**: Hash de contraseñas (10 rounds)
- **CORS**: Configurado en API Gateway
- **Helmet**: Headers de seguridad en todos los servicios

## Escalabilidad

- Servicios independientes escalables horizontalmente
- Redis para caché distribuida
- RabbitMQ para balanceo de carga de mensajes
- PostgreSQL con connection pooling
