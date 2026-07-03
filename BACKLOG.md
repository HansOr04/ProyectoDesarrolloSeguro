# BACKLOG — Proyecto Integrador ISWZ3206
## Desarrollo de Software Seguro — Sistema A (Triage Remoto) + Sistema B (Monetix)

---

## Historias de Usuario

Las estimaciones siguen la escala Fibonacci: **1 · 2 · 3 · 5 · 8 · 13**

---

### HU-01 — Autenticación Centralizada via Keycloak
**Como** usuario (doctor, paciente, administrador, usuario Monetix)  
**Quiero** iniciar sesión a través de un proveedor de identidad centralizado (Keycloak)  
**Para** no tener que gestionar contraseñas separadas por cada sistema y garantizar que mis credenciales estén protegidas con estándares industriales (OpenID Connect + PKCE)

| Campo | Detalle |
|-------|---------|
| **Estimación** | 5 puntos de historia |
| **Sprint** | Sprint 2 |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] El botón "Iniciar sesión con SSO" en Triage redirige al formulario de Keycloak (realm `universidad`)
- [ ] El botón "Iniciar sesión con SSO" en Monetix redirige al mismo realm
- [ ] Tras autenticarse, el token JWT contiene el claim `roles` con el rol correcto del usuario
- [ ] El backend valida la firma RS256 del token contra el JWKS endpoint de Keycloak (`/realms/universidad/protocol/openid-connect/certs`)
- [ ] Un token manipulado o expirado es rechazado con 401

---

### HU-02 — Control de Acceso por Roles
**Como** administrador del sistema  
**Quiero** que cada usuario solo pueda acceder a los recursos correspondientes a su rol  
**Para** garantizar que un paciente no pueda ver triajes de otros pacientes ni que un usuario de Monetix acceda a datos médicos

| Campo | Detalle |
|-------|---------|
| **Estimación** | 5 puntos de historia |
| **Sprint** | Sprint 2 |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Los roles `doctor` y `admin` pueden ver el dashboard de KPIs (`GET /api/analytics/kpis`)
- [ ] El rol `patient` recibe 403 al intentar acceder al dashboard de KPIs
- [ ] Solo el rol `admin` puede acceder a `GET /api/users` (lista completa de usuarios)
- [ ] Los roles de Monetix (`monetix-user`, `monetix-admin`) no tienen acceso a ningún endpoint de Triage
- [ ] El middleware de autorización verifica el campo `roles` del token, no solo la autenticación

---

### HU-03 — Single Sign-On entre Triage y Monetix
**Como** usuario con acceso a ambos sistemas  
**Quiero** que al iniciar sesión en uno de los sistemas pueda acceder al otro sin volver a ingresar credenciales  
**Para** tener una experiencia de usuario fluida y reducir la fatiga de autenticación

| Campo | Detalle |
|-------|---------|
| **Estimación** | 5 puntos de historia |
| **Sprint** | Sprint 2 |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Al abrir Monetix después de autenticarse en Triage (misma sesión de navegador), el usuario aparece autenticado automáticamente sin redirección adicional
- [ ] El método `check-sso` silencioso se ejecuta al cargar cada SPA
- [ ] La cookie de sesión de Keycloak persiste durante `ssoSessionMaxLifespan` (86400 s = 24h)
- [ ] Al cerrar sesión en un sistema, el logout cruzado cierra la sesión en Keycloak y ambas SPAs redirigen al login
- [ ] El flujo usa PKCE con método S256 (verificable en Network tab: parámetro `code_challenge_method=S256`)

---

### HU-04 — Segundo Factor de Autenticación para Roles Privilegiados
**Como** administrador de seguridad  
**Quiero** que los usuarios con roles privilegiados (admin, doctor, monetix-admin) deban configurar y usar un segundo factor de autenticación (TOTP)  
**Para** proteger las cuentas de alto impacto ante compromisos de contraseña

| Campo | Detalle |
|-------|---------|
| **Estimación** | 3 puntos de historia |
| **Sprint** | Sprint 2 |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] En el primer login, los usuarios con rol `admin`, `doctor` o `monetix-admin` son redirigidos a configurar Google Authenticator / Authy / FreeOTP
- [ ] En logins subsiguientes, se solicita el código TOTP de 6 dígitos después de ingresar usuario y contraseña
- [ ] Los usuarios con rol `patient` o `monetix-user` no son obligados a configurar 2FA
- [ ] El flujo condicional de OTP se activa únicamente para usuarios con el rol compuesto `mfa` (heredado por admin, doctor, monetix-admin)
- [ ] Un código TOTP incorrecto bloquea el acceso y muestra mensaje de error

---

### HU-05 — Federación de Usuarios Existentes hacia Keycloak
**Como** administrador del sistema  
**Quiero** migrar los usuarios existentes en las bases de datos de Triage (PostgreSQL) y Monetix (MongoDB) hacia Keycloak  
**Para** que los usuarios no tengan que crear una nueva cuenta y puedan usar SSO desde el primer día

| Campo | Detalle |
|-------|---------|
| **Estimación** | 8 puntos de historia |
| **Sprint** | Sprint 3 |
| **Prioridad** | Media |

**Criterios de aceptación:**
- [ ] El script `scripts/federation/migrate-users.js` se ejecuta sin errores cuando PostgreSQL, MongoDB y Keycloak están disponibles
- [ ] Los usuarios de Triage se crean en Keycloak con su rol correspondiente (`admin`, `doctor`, `patient`)
- [ ] Los usuarios de Monetix se crean en Keycloak con su rol correspondiente (`monetix-admin`, `monetix-user`)
- [ ] Los usuarios con roles privilegiados reciben la `requiredAction: CONFIGURE_TOTP` para que configuren 2FA en su primer login
- [ ] Usuarios duplicados (ya existentes en Keycloak) son omitidos sin error
- [ ] El flag `--dry-run` lista los usuarios a migrar sin crearlos realmente
- [ ] Las contraseñas originales NO se migran; se asigna contraseña temporal con cambio obligatorio en primer login

---

### HU-06 — Reporte Cifrado de Consulta Médica de Triage hacia Monetix
**Como** sistema de gestión de gastos de salud (Monetix)  
**Quiero** recibir automáticamente un registro cifrado cuando se completa una consulta en Triage  
**Para** registrar el gasto médico correspondiente en la categoría "Salud" del paciente sin exponer datos sensibles en tránsito

| Campo | Detalle |
|-------|---------|
| **Estimación** | 8 puntos de historia |
| **Sprint** | Sprint 4 |
| **Prioridad** | Alta |

**Criterios de aceptación:**
- [ ] Al marcar un triage como `ATENDIDO`, triage-service cifra el resumen de consulta usando Vault Transit Engine (clave `triage-monetix-channel`)
- [ ] El payload cifrado (ciphertext Vault: `vault:v1:...`) se envía mediante `POST /api/inter/triage-report` a Monetix
- [ ] La comunicación incluye `X-Service-Token` firmado con HMAC-HS256 (`INTERNAL_SERVICE_SECRET`) con vigencia de 30 segundos
- [ ] Monetix valida el `X-Service-Token` antes de intentar descifrar el payload
- [ ] Monetix descifra el payload usando el mismo Vault Transit Engine
- [ ] Se crea una transacción en Monetix de tipo `expense` en la categoría `Salud` con el monto correspondiente al nivel de triage (ROJO: $150, AMARILLO: $80, VERDE: $40)
- [ ] Si la llamada a Monetix falla, el triage se marca como ATENDIDO de todas formas (operación no bloqueante)
- [ ] Las claves de cifrado nunca salen de Vault; solo circula el ciphertext entre servicios

---

### HU-07 — Análisis Estático de Seguridad del Código
**Como** responsable de seguridad del proyecto  
**Quiero** que el código de ambos sistemas sea analizado automáticamente por una herramienta de análisis estático (SonarQube)  
**Para** detectar vulnerabilidades, bugs y deuda técnica antes del despliegue

| Campo | Detalle |
|-------|---------|
| **Estimación** | 5 puntos de historia |
| **Sprint** | Sprint 5 |
| **Prioridad** | Media |

**Criterios de aceptación:**
- [ ] SonarQube 10.4 Community levanta con `COMPOSE_PROFILES=tools docker-compose up -d sonarqube`
- [ ] Los 3 proyectos (Triage Remoto, Monetix Backend, Monetix Frontend) tienen `sonar-project.properties` configurado
- [ ] El script `bash scripts/sonar-scan.sh` analiza los 3 proyectos en secuencia
- [ ] El reporte muestra la cantidad de issues por severidad (Blocker, Critical, Major, Minor)
- [ ] Los issues de severidad Blocker y Critical son revisados y, cuando es posible, corregidos antes del Sprint Review

---

### HU-08 — Despliegue Seguro en VPS con TLS Automático
**Como** equipo de desarrollo  
**Quiero** desplegar el sistema completo en un VPS con HTTPS automático mediante Let's Encrypt  
**Para** que el sistema sea accesible de forma segura desde internet sin configuración manual de certificados

| Campo | Detalle |
|-------|---------|
| **Estimación** | 5 puntos de historia |
| **Sprint** | Sprint 5 |
| **Prioridad** | Media |

**Criterios de aceptación:**
- [ ] Traefik v3 actúa como reverse proxy y gestiona certificados Let's Encrypt via ACME http-01
- [ ] El script `bash scripts/deploy-vps.sh --first-run` instala Docker, configura ufw y levanta todos los servicios
- [ ] Todos los puertos internos están vinculados a `127.0.0.1` (no accesibles directamente desde internet)
- [ ] Solo los puertos 80, 443 y 10000/UDP (Jitsi) son accesibles públicamente
- [ ] Keycloak funciona en modo producción (`start --proxy=edge`) detrás de Traefik
- [ ] Las URLs de producción se configuran mediante variables de entorno (sin hardcode)

---

## Planificación de Sprints

| Sprint | Fechas | Objetivo | Historias | Velocidad |
|--------|--------|----------|-----------|-----------|
| **Sprint 1** | 2026-03-01 → 2026-03-21 | Arquitectura base y microservicios Triage | Infraestructura Docker, 7 microservicios, API Gateway nginx, bases de datos | — |
| **Sprint 2** | 2026-03-22 → 2026-04-11 | Control de identidades con Keycloak | HU-01, HU-02, HU-03, HU-04 | 18 pts |
| **Sprint 3** | 2026-04-12 → 2026-05-02 | Federación y seguridad de secretos | HU-05 + HashiCorp Vault (Transit + KV + AppRole) | 8 pts |
| **Sprint 4** | 2026-05-03 → 2026-05-23 | Comunicación cifrada inter-sistema A→B | HU-06 | 8 pts |
| **Sprint 5** | 2026-05-24 → 2026-06-20 | Calidad de código y despliegue | HU-07, HU-08 | 10 pts |

### Resumen de velocidad

| Métrica | Valor |
|---------|-------|
| Total de puntos de historia | 39 pts |
| Sprints completados | 5 |
| Velocidad promedio | ~8 pts/sprint |
| Duración de sprint | 3 semanas |

---

## Definition of Done

Una historia se considera **completada** cuando:
1. El código está implementado y en el repositorio (`main`)
2. La funcionalidad es demostrable con `docker-compose up -d` sin configuración adicional
3. No quedan issues Blocker o Critical en SonarQube relacionados a esa historia
4. La historia aparece cubierta en la presentación de Sprint Review

---

## Gestión de riesgos identificados

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Vault no inicializado en primer arranque | Alto — flujo A→B falla | Script `init-vault.sh` automatiza inicialización con `profiles: [init]` |
| Token de Keycloak con audience incorrecto en llamadas inter-servicio | Alto — 401 en todos los endpoints | Usar `X-Service-Token` (HMAC) para comunicación A→B, no el JWT de usuario |
| SonarQube consume mucha RAM en VPS pequeño | Medio | Activar solo con `COMPOSE_PROFILES=tools`; no corre en producción |
| Jitsi UDP 10000 requiere puerto público | Bajo | Excepción documentada; único puerto no vinculado a 127.0.0.1 |
