# Testing Guide - Sistema de Triage Remoto

## Estructura de Tests

```
services/
├── auth-service/tests/
│   ├── unit/services.test.js         # JWT y Password tests
│   └── integration/auth.test.js      # API endpoints tests
├── triage-service/tests/
│   ├── unit/decisionTree.test.js     # Algoritmo de clasificación
│   └── integration/triage.test.js    # API endpoints tests
└── appointment-service/tests/
    └── unit/jitsi.test.js            # Integración Jitsi
```

## Ejecutar Tests

### Todos los tests de un servicio
```bash
cd services/auth-service
npm test

cd services/triage-service
npm test

cd services/appointment-service
npm test
```

### Tests con watch mode (desarrollo)
```bash
npm run test:watch
```

### Tests con coverage report
```bash
npm test -- --coverage
```

## Cobertura Esperada

| Servicio | Componente | Tests |
|----------|------------|-------|
| **Auth** | JWT Service | ✅ Token generation, verification |
| **Auth** | Password Service | ✅ Hash, compare, validation |
| **Auth** | API | ✅ Register, login endpoints |
| **Triage** | Decision Tree | ✅ Score calculation, classification |
| **Triage** | Critical Flags | ✅ Detection of urgent symptoms |
| **Triage** | API | ✅ Questionnaire, classify endpoints |
| **Appointment** | Jitsi Service | ✅ Room creation, join URLs |

## Tests del Algoritmo de Triage

El test más importante valida la correcta clasificación:

```javascript
// ROJO: Síntomas críticos
expect(result.classification).toBe('ROJO');
expect(result.critical_flags).toContain('DIFICULTAD_RESPIRATORIA_SEVERA');

// AMARILLO: Síntomas moderados (Score 20-39)
expect(result.classification).toBe('AMARILLO');

// VERDE: Síntomas leves (Score <20)
expect(result.classification).toBe('VERDE');
```

## CI/CD Integration

Agregar al `docker-compose.test.yml`:
```yaml
services:
  test-runner:
    build: .
    command: npm test
    environment:
      NODE_ENV: test
```

## Mocking

Los tests utilizan mocking para:
- Base de datos (Sequelize)
- RabbitMQ (amqplib)
- Redis (ioredis)
- APIs externas (Twilio, SMTP)
