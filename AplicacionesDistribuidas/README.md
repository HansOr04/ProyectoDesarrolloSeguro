# 🏥 Sistema Distribuido de Triage Remoto

Sistema de telemedicina basado en **arquitectura de microservicios** para clasificación de pacientes y teleconsultas médicas.

## 🏗️ Arquitectura

```
                              ┌─────────────────┐
                              │   API GATEWAY   │
                              │     (Nginx)     │
                              │   Puerto: 8000  │
                              └────────┬────────┘
                                       │
           ┌───────────────────────────┼───────────────────────────┐
           │                           │                           │
    ┌──────▼──────┐           ┌───────▼────────┐         ┌───────▼────────┐
    │   AUTH      │           │   PATIENT      │         │    TRIAGE      │
    │  SERVICE    │           │   SERVICE      │         │   SERVICE      │
    │ Puerto:5001 │           │  Puerto: 5002  │         │  Puerto: 5003  │
    └──────┬──────┘           └────────┬───────┘         └────────┬───────┘
           │                           │                          │
           └───────────────────────────┼──────────────────────────┘
                                       │
                              ┌────────▼─────────┐
                              │   MESSAGE QUEUE  │
                              │    (RabbitMQ)    │
                              │   Puerto: 5672   │
                              └────────┬─────────┘
                                       │
           ┌───────────────────────────┼───────────────────────────┐
           │                           │                           │
    ┌──────▼──────┐           ┌───────▼────────┐         ┌───────▼────────┐
    │ APPOINTMENT │           │  NOTIFICATION  │         │   FOLLOWUP     │
    │  SERVICE    │           │   SERVICE      │         │   SERVICE      │
    │ Puerto:5004 │           │  Puerto: 5005  │         │  Puerto: 5006  │
    └─────────────┘           └────────────────┘         └────────────────┘
```

## 🚀 Inicio Rápido

### Prerrequisitos
- Docker Desktop instalado
- Git

### Pasos

```bash
# 1. Clonar el proyecto
git clone <repo-url>
cd triage-remoto-distribuido

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales (Twilio, SMTP, etc.)

# 3. Levantar todo el sistema
docker-compose up --build

# 4. ¡Listo! Acceder a:
# - Frontend: http://localhost:3000
# - API Gateway: http://localhost:8000
# - RabbitMQ Management: http://localhost:15672
# - Adminer (PostgreSQL): http://localhost:8080
# - Mongo Express: http://localhost:8081
```

## 📋 Microservicios

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| API Gateway | 8000 | Punto de entrada único, enrutamiento |
| Auth Service | 5001 | Autenticación y autorización (JWT) |
| Patient Service | 5002 | Gestión de pacientes |
| Triage Service | 5003 | Clasificación de pacientes (Rojo/Amarillo/Verde) |
| Appointment Service | 5004 | Citas y teleconsultas (Jitsi) |
| Notification Service | 5005 | SMS (Twilio) y Email |
| FollowUp Service | 5006 | Seguimiento post-consulta |
| Analytics Service | 5007 | KPIs y reportes |

## 🗄️ Bases de Datos

- **PostgreSQL**: Una base de datos por servicio (auth_db, patient_db, triage_db, appointment_db, followup_db, analytics_db)
- **MongoDB**: Logs y auditoría centralizada
- **Redis**: Caché de sesiones y clasificaciones

## 📡 Comunicación

- **Síncrona**: REST APIs entre servicios
- **Asíncrona**: RabbitMQ para notificaciones y eventos

## 🔑 Credenciales por Defecto (Desarrollo)

| Servicio | Usuario | Contraseña |
|----------|---------|------------|
| PostgreSQL | triage_admin | triage_secret_2024 |
| MongoDB | mongo_admin | mongo_secret_2024 |
| RabbitMQ | rabbit_admin | rabbit_secret_2024 |
| Redis | - | redis_secret_2024 |

## 📚 Documentación

- [Arquitectura Detallada](./docs/ARCHITECTURE.md)
- [APIs de Microservicios](./docs/API.md)
- [Guía de Microservicios](./docs/MICROSERVICES.md)

## 🧪 Usuarios de Prueba

Después de iniciar el sistema, puedes usar:

| Email | Contraseña | Rol |
|-------|------------|-----|
| admin@triage.com | admin123 | ADMIN |
| doctor@triage.com | doctor123 | DOCTOR |
| paciente@triage.com | paciente123 | PATIENT |

## 📊 Funcionalidades Principales

### Para Pacientes
- ✅ Registro con datos médicos
- ✅ Cuestionario de triage (8 preguntas)
- ✅ Clasificación automática (Rojo/Amarillo/Verde)
- ✅ Agendamiento de teleconsultas
- ✅ Videollamada con Jitsi
- ✅ Recepción de recetas digitales
- ✅ Seguimiento post-consulta

### Para Médicos
- ✅ Dashboard de pacientes
- ✅ Sala de teleconsulta
- ✅ Emisión de recetas digitales (PDF)
- ✅ Referencias a especialistas
- ✅ Historial de consultas

### Para Administradores
- ✅ Panel en tiempo real
- ✅ Dashboard de KPIs
- ✅ Estadísticas por clasificación
- ✅ Exportación de reportes

## 🛠️ Desarrollo

```bash
# Ver logs de un servicio específico
docker-compose logs -f auth-service

# Reiniciar un servicio
docker-compose restart triage-service

# Acceder a PostgreSQL
docker exec -it triage-postgres psql -U triage_admin -d auth_db

# Detener todo
docker-compose down

# Detener y eliminar volúmenes
docker-compose down -v
```

## 📝 Licencia

Proyecto académico - Sistemas Distribuidos
