# Guía Técnica — Trabajo Final ISWZ3206
## Aplicaciones Distribuidas con Seguridad

**Materia:** ISWZ3206 — Aplicaciones Distribuidas con Seguridad  
**Repositorio:** monorepo `c:/proyecto` (rama `master`)  
**Fecha:** Junio 2026

---

## 1. Resumen Ejecutivo

El proyecto integra dos sistemas de software en un monorepo bajo un esquema de seguridad unificado. **Sistema A (Triage Remoto)** es una plataforma de consulta médica remota construida con 7 microservicios Node.js coordinados por un API Gateway nginx. **Sistema B (Monetix)** es un sistema de gestión financiera monolítico Express/TypeScript. Ambos comparten un IdP Keycloak (SSO con MFA condicional por rol), un gestor de secretos HashiCorp Vault (cifrado en tránsito y KV), y comunicación inter-sistema autenticada con tokens de corta vida. La infraestructura completa corre en Docker Compose con más de 20 servicios y soporte de análisis estático con SonarQube.

---

## 2. Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NAVEGADOR / CLIENTE                         │
│            Triage Frontend          Monetix Frontend                │
│          React/Vite :3000          React/Vite :5173                 │
│          (check-sso PKCE)          (check-sso PKCE)                 │
└──────────────┬──────────────────────────┬───────────────────────────┘
               │ Bearer JWT               │ Bearer JWT
               ▼                          ▼
┌──────────────────────┐      ┌───────────────────────────────────────┐
│  KEYCLOAK :8180      │◄─────┤  Realm: universidad                   │
│  (IdP compartido)    │      │  RS256 · JWKS · TOTP condicional      │
│  quay.io/keycloak    │      │  4 clients · 6 roles de realm         │
│  :23.0               │      └───────────────────────────────────────┘
└──────────────────────┘
               ▲ JWKS (validación token)
               │
┌──────────────┴──────────────────────────────────────────────────────┐
│                    SISTEMA A — TRIAGE REMOTO                        │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │  API GATEWAY (nginx :8000)                              │        │
│  │  • Rate-limit: auth 10r/m · api 60r/s                  │        │
│  │  • Inyecta X-Gateway-Token en cada proxy               │        │
│  │  • CORS explícito (sin wildcard *)                      │        │
│  │  • Headers: X-Frame-Options, X-Content-Type-Options    │        │
│  └───┬──────┬──────┬──────┬──────┬──────┬─────────────────┘        │
│      │      │      │      │      │      │                           │
│  :5001   :5002  :5003  :5004  :5005  :5006  :5007                   │
│  auth  patient triage appoint notify followup analytics             │
│  -svc   -svc   -svc    -svc   -svc    -svc    -svc                 │
│  (PG)   (PG)   (PG)    (PG)  (Mongo)  (PG)   (PG)                 │
│                  │      │     (AMQP)                                │
│                  │      │       │                                   │
│  ┌───────────────▼──────▼───────▼───────────────────────────┐      │
│  │  Infraestructura compartida                               │      │
│  │  PostgreSQL :5432 · MongoDB :27017 · Redis :6379         │      │
│  │  RabbitMQ :5672 (eventos async: notif, followup)         │      │
│  └───────────────────────────────────────────────────────────┘      │
│                  │ Vault Transit encrypt                             │
│                  ▼ POST /api/inter/triage-report                    │
└─────────────────────────────────────────────────────────────────────┘
               │ X-Service-Token (HMAC-HS256, 30s TTL)
               │ body: { payload: "vault:v1:CIPHERTEXT" }
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SISTEMA B — MONETIX                              │
│                                                                     │
│  monetix-backend (Express/TS :3000) ─── MongoDB                    │
│  monetix-frontend (React/TS  :5173)                                │
│  Vault Transit decrypt → crea Transaction en MongoDB               │
└─────────────────────────────────────────────────────────────────────┘
               ▲
               │ KV v2 + Transit Engine
┌──────────────┴──────────────────────────────────────────────────────┐
│  HASHICORP VAULT :8200                                              │
│  KV v2:  secret/triage/* · secret/monetix/* · secret/shared/*      │
│  Transit: clave "triage-monetix-channel" (AES-256-GCM)            │
│  AppRole: triage-role (encrypt) · monetix-role (decrypt only)      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  HERRAMIENTAS (perfil [tools])                                      │
│  SonarQube :9000 · Adminer :8080 · MailHog :8025/:1025            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Componentes del Sistema

### Sistema A — Triage Remoto

| Servicio | Puerto | Tecnología | Responsabilidad |
|---|---|---|---|
| api-gateway | 8000 | nginx + envsubst | Proxy, rate-limit, X-Gateway-Token, CORS |
| auth-service | 5001 | Node.js + PostgreSQL | Login local + validación Keycloak (dual-path) |
| patient-service | 5002 | Node.js + PostgreSQL | CRUD pacientes |
| triage-service | 5003 | Node.js + PostgreSQL | Cuestionario clínico, árbol de decisión, Redis cache |
| appointment-service | 5004 | Node.js + PostgreSQL | Citas, recetas, derivaciones (Jitsi) |
| notification-service | 5005 | Node.js + MongoDB | Emails (MailHog/SMTP) vía RabbitMQ consumer |
| followup-service | 5006 | Node.js + PostgreSQL | Seguimiento post-consulta vía RabbitMQ |
| analytics-service | 5007 | Node.js + PostgreSQL | Métricas y reportes del sistema |
| triage-frontend | 3000 | React + Vite (SPA) | Interfaz para pacientes y médicos |

### Sistema B — Monetix

| Componente | Puerto | Tecnología | Responsabilidad |
|---|---|---|---|
| monetix-backend | 3000 | Express + TypeScript + MongoDB | API REST monolítica, recibe reportes cifrados |
| monetix-frontend | 5173 | React + TypeScript + Vite | Interfaz financiera |

### Infraestructura Compartida

| Servicio | Puerto | Rol |
|---|---|---|
| Keycloak | 8180 | IdP SSO + TOTP |
| HashiCorp Vault | 8200 | Secrets + cifrado Transit |
| PostgreSQL | 5432 | DB relacional (6 bases) |
| MongoDB | 27017 | DB documental (logs, Monetix) |
| Redis | 6379 | Caché de sesiones y triage |
| RabbitMQ | 5672/15672 | Eventos async |
| SonarQube | 9000 | Análisis estático (perfil tools) |

---

## 4. Seguridad Implementada

### 4.1 Keycloak — SSO, MFA y PKCE

**Realm `universidad`** compartido por ambas aplicaciones. Cuatro clientes registrados:

| Client ID | Tipo | Uso |
|---|---|---|
| `triage-frontend` | Public + PKCE S256 | SPA Triage (sin client secret) |
| `triage-client` | Confidential | Backend Triage (server-to-server) |
| `monetix-frontend` | Public + PKCE S256 | SPA Monetix (sin client secret) |
| `monetix-client` | Confidential | Backend Monetix (server-to-server) |

**PKCE S256** (Proof Key for Code Exchange) protege el Authorization Code Flow en SPAs: el frontend genera un `code_verifier` aleatorio, envía su hash SHA-256 (`code_challenge`) al iniciar el flujo y prueba posesión del verifier al intercambiar el code por tokens. Elimina la necesidad de client_secret en el navegador.

**MFA condicional por rol:** Los roles `admin`, `doctor` y `monetix-admin` son roles compuestos que incluyen el rol `mfa`. Keycloak evalúa un flujo de autenticación `browser-with-otp` que exige TOTP cuando el token contiene ese rol. Usuarios con rol `patient` o `monetix-user` pasan por el flujo `browser` estándar.

**check-sso silencioso** en el frontend:
```js
// keycloakService.js
await keycloak.init({
  onLoad: 'check-sso',
  checkLoginIframe: true,
  pkceMethod: 'S256',
});
```
El iframe comprueba la sesión Keycloak sin redirigir — si existe sesión activa, obtiene tokens; si no, el usuario ve la UI sin autenticar hasta que pulse "Iniciar sesión".

**Tokens RS256:** Keycloak firma con clave RSA privada. Los backends validan contra el JWKS endpoint público (`/realms/universidad/protocol/openid-connect/certs`) sin necesidad de compartir secretos.

### 4.2 HashiCorp Vault — Transit Engine, KV v2 y AppRole

**Transit Engine** opera como "encryption as a service": las claves criptográficas nunca salen de Vault. El servicio solicita cifrar/descifrar datos y Vault devuelve el resultado. La clave `triage-monetix-channel` usa AES-256-GCM.

**KV v2** almacena todos los secretos de configuración:
- `secret/triage/*` — credenciales de BD, JWT secrets, API keys de Triage
- `secret/monetix/*` — credenciales de MongoDB, configuración Monetix
- `secret/shared/*` — secretos compartidos entre sistemas

**AppRole** implementa el principio de menor privilegio:
- `triage-role` → puede cifrar con `triage-monetix-channel` (operación `encrypt`)
- `monetix-role` → solo puede descifrar (operación `decrypt`)

Autenticación AppRole en tiempo de ejecución:
```js
// shared/utils/vault.js
async function getToken() {
  const res = await fetch(`${VAULT_ADDR}/v1/auth/approle/login`, {
    method: 'POST',
    body: JSON.stringify({ role_id: VAULT_ROLE_ID, secret_id: VAULT_SECRET_ID }),
  });
  const data = await res.json();
  _token = data.auth.client_token;
  // Se renueva automáticamente antes de que expire
  setTimeout(() => { _token = null; }, (data.auth.lease_duration - 60) * 1000);
  return _token;
}
```

#### Inicialización y gestión de claves de unseal

`scripts/vault/init-vault.sh` acepta dos variables de entorno:

| Variable | Default (dev) | Recomendado en producción |
|---|---|---|
| `VAULT_KEY_SHARES` | `1` | `5` |
| `VAULT_KEY_THRESHOLD` | `1` | `3` |

Con `1/1` (entorno académico), una sola clave desbloquea Vault. En producción se generan 5 fragmentos y se requieren 3 para desbloquear, distribuyendo los fragmentos entre distintos responsables de seguridad.

**Revocación del root token** (`VAULT_REVOKE_ROOT_TOKEN=true`):
Una vez que los AppRoles funcionan, el root token puede revocarse para minimizar superficie de ataque. El script lo hace automáticamente si la variable está activa:
```sh
vault token revoke -self   # el script lo ejecuta tras crear roles y secret_ids
```
Para recuperar acceso administrativo posterior:
```sh
# Necesitas los VAULT_KEY_SHARES fragmentos de unseal:
vault operator generate-root -init
vault operator generate-root -nonce=<nonce> -otp=<otp> <unseal_key_1>
vault operator generate-root -nonce=<nonce> -otp=<otp> <unseal_key_2>
# ... hasta alcanzar VAULT_KEY_THRESHOLD fragmentos
vault operator generate-root -decode=<encoded_token> -otp=<otp>
```

### 4.3 Seguridad Inter-Servicio — Gateway Token y Service Token

Dos capas de protección independientes para comunicaciones internas:

**Capa 1 — X-Gateway-Token (nginx → microservicios)**  
nginx inyecta el valor de `INTERNAL_API_SECRET` como header en cada request que proxea. Los microservicios validan con `requireGateway()`:

```js
// nginx.conf (fragmento)
proxy_set_header X-Gateway-Token ${INTERNAL_API_SECRET};

// shared/middlewares/gatewayAuth.middleware.js
function requireGateway(req, res, next) {
  if (req.headers['x-gateway-token'] === INTERNAL_API_SECRET) return next();
  return res.status(403).json({ error: { code: 'DIRECT_ACCESS_FORBIDDEN' } });
}
```
Sin este header, cualquier request directo al puerto del microservicio es rechazado en producción.

**Capa 2 — X-Service-Token (microservicio → microservicio)**  
Para llamadas entre servicios (no de usuario), se usa un JWT HMAC-HS256 de 30 segundos:

```js
// shared/utils/serviceAuth.js
function signServiceRequest(callerName) {
  return jwt.sign(
    { sub: callerName, type: 'service-token' },
    INTERNAL_SERVICE_SECRET,
    { expiresIn: '30s', issuer: 'internal-bus' }
  );
}

function verifyServiceToken(token) {
  const payload = jwt.verify(token, INTERNAL_SERVICE_SECRET, {
    issuer: 'internal-bus', algorithms: ['HS256'],
  });
  if (payload.type !== 'service-token') throw new Error('Token type inválido');
  return payload;
}
```

**Por qué no reutilizar el JWT del usuario para inter-servicio:**  
El token de usuario emitido para `triage-client` tiene `aud: triage-client`. Monetix espera `aud: monetix-client`. El servidor de Keycloak rechazaría la validación por audience mismatch. El X-Service-Token es un secreto completamente separado del plano de identidad de usuario.

---

## 5. Flujo Cifrado A→B (Triage → Monetix)

```
Médico                triage-service         Vault              monetix-backend
  │                        │                   │                      │
  │  PATCH /triage/:id     │                   │                      │
  │  { status: ATENDIDO }  │                   │                      │
  ├───────────────────────►│                   │                      │
  │                        │                   │                      │
  │                        │ 1. Construye payload JSON               │
  │                        │    { patientId, consultaRef,            │
  │                        │      clasificacion, monto, fecha }      │
  │                        │                   │                      │
  │                        │ 2. POST /v1/transit/encrypt/            │
  │                        │    triage-monetix-channel               │
  │                        ├──────────────────►│                      │
  │                        │                   │                      │
  │                        │  3. "vault:v1:CIPHERTEXT"               │
  │                        │◄──────────────────┤                      │
  │                        │                   │                      │
  │                        │ 4. signServiceRequest('triage-service') │
  │                        │    → X-Service-Token (HS256, 30s)       │
  │                        │                   │                      │
  │                        │ 5. POST /api/inter/triage-report        │
  │                        │    X-Service-Token: <jwt>               │
  │                        │    body: { payload: "vault:v1:..." }    │
  │                        ├──────────────────────────────────────── ►│
  │                        │                   │                      │
  │                        │                   │  6. verifyServiceToken()
  │                        │                   │     POST /v1/transit/decrypt/
  │                        │                   │     triage-monetix-channel
  │                        │                   │◄─────────────────────┤
  │                        │                   │                      │
  │                        │                   │  7. JSON plaintext   │
  │                        │                   ├─────────────────────►│
  │                        │                   │                      │
  │                        │                   │  8. crea Transaction │
  │                        │                   │     en MongoDB       │
  │  200 OK                │                   │                      │
  │◄───────────────────────┤                   │                      │
```

**Código clave en `triage-service/src/services/monetix.service.js`:**
```js
async function notifyConsulta({ patientId, triageId, classification, doctorId, keycloakSub }) {
  const payload = { patientId, consultaRef: triageId, clasificacion: classification,
    monto: classification === 'ROJO' ? 150 : classification === 'AMARILLO' ? 80 : 40,
    fecha: new Date().toISOString(), auditSub: keycloakSub || 'system' };

  const ciphertext = await encryptInterServicePayload(payload);  // → vault:v1:...
  const serviceToken = signServiceRequest('triage-service');     // JWT 30s

  await fetch(`${MONETIX_BACKEND_URL}/api/inter/triage-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Service-Token': serviceToken },
    body: JSON.stringify({ payload: ciphertext }),
  });
}
```

**Propiedades de seguridad del flujo:**
- La clave AES-256-GCM **nunca sale de Vault** — triage-service y monetix-backend solo ven el ciphertext
- El X-Service-Token expira en 30 segundos — inútil si es capturado en tránsito
- Vault registra cada operación de cifrado/descifrado (audit log)
- `triage-role` no puede descifrar; `monetix-role` no puede cifrar — separación de responsabilidades

---

## 6. Roles y Control de Acceso

### Roles de Realm Keycloak

| Rol | Sistema | MFA | Descripción |
|---|---|---|---|
| `admin` | Triage | SI (compuesto con `mfa`) | Administrador del sistema de triage |
| `doctor` | Triage | SI (compuesto con `mfa`) | Médico — puede ver y actualizar triages |
| `patient` | Triage | NO | Paciente — acceso a sus propios datos |
| `monetix-admin` | Monetix | SI (compuesto con `mfa`) | Administrador financiero |
| `monetix-user` | Monetix | NO | Usuario financiero estándar |
| `mfa` | Ambos | — | Rol marcador; activado por los compuestos |

### Matriz de Permisos Triage

| Recurso | patient | doctor | admin |
|---|---|---|---|
| `GET /api/patients/me` | propio | todos | todos |
| `POST /api/triage` | SI | SI | SI |
| `GET /api/triage` | propio | todos | todos |
| `PATCH /api/triage/:id/status` | NO | SI | SI |
| `GET /api/analytics` | NO | NO | SI |
| `GET /api/appointments` | propias | todas | todas |
| `POST /api/auth/login` | SI | SI | SI |

### Dual-Path Auth (coexistencia JWT propio + Keycloak)

```js
// auth-service/src/middlewares/auth.middleware.js
async function authenticate(req, res, next) {
  const token = req.headers.authorization.split(' ')[1];

  if (isKeycloakToken(token)) {
    // Claim iss === KEYCLOAK_ISSUER → validar RS256 via JWKS
    const payload = await verifyKeycloakToken(token);
    req.user = mapKeycloakPayload(payload);
    return next();
  }

  // Sin claim iss de Keycloak → validar HS256 local
  const decoded = verifyToken(token);
  const user = await User.findByPk(decoded.id);
  if (!user?.is_active) throw new UnauthorizedError('User not found or inactive');
  req.user = decoded;
  next();
}
```

Esta estrategia permitió integrar Keycloak de forma incremental sin romper los logins locales existentes.

### 6.4 Federación de Usuarios — HU-05 (Triage + Monetix → Keycloak)

**Objetivo:** migrar los usuarios existentes en PostgreSQL (`auth_db`, Triage) y MongoDB (`monetix`, Monetix) hacia Keycloak como identity provider único, vía `scripts/federation/migrate-users.js`, asignando el rol de realm correcto y exigiendo MFA (`CONFIGURE_TOTP`) a roles privilegiados (`admin`, `doctor`).

**Dry-run inicial — 2 bugs reales encontrados:**

El primer `node migrate-users.js --dry-run` falló y luego, tras corregir el query, mostró un resultado incorrecto:

1. **Error de esquema** — el script asumía columnas `username`, `first_name`, `last_name` en `auth_db.users` que no existen; la tabla real usa `email` (sin `username`) y columnas en español `nombre`/`apellido`.
   ```sql
   -- Antes (rompía con "column \"username\" does not exist"):
   SELECT id, username, email, first_name, last_name, role, created_at FROM users ORDER BY created_at

   -- Después:
   SELECT id, email, nombre AS first_name, apellido AS last_name, role, created_at
   FROM users WHERE is_active = true ORDER BY created_at
   ```

2. **Bug de mayúsculas/minúsculas (silencioso, no lanzaba error)** — una vez corregido el query, el dry-run mostraba **los 5 usuarios de Triage migrando como `role=patient mfa=false`**, sin importar su rol real. Causa: los valores reales de la columna `role` en Postgres son `DOCTOR`/`ADMIN`/`PATIENT` (mayúsculas), pero `TRIAGE_ROLE_MAP` tiene claves en minúsculas (`admin`, `doctor`, `patient`), así que el lookup `TRIAGE_ROLE_MAP[u.role]` siempre devolvía `undefined` y caía al fallback `'patient'` para todos. Se detectó comparando el dry-run contra una consulta agregada segura (`SELECT role, COUNT(*) FROM users GROUP BY role`, sin PII) que confirmó la distribución real de roles.
   ```js
   // Antes:
   const kcRole   = TRIAGE_ROLE_MAP[u.role] || 'patient';
   const requiresMfa = ['admin', 'doctor'].includes(u.role);

   // Después:
   const roleKey  = (u.role || '').toLowerCase();
   const kcRole   = TRIAGE_ROLE_MAP[roleKey] || 'patient';
   const requiresMfa = ['admin', 'doctor'].includes(roleKey);
   ```

**Dry-run corregido (resultado mostrado al usuario antes de ejecutar la migración real):**

| Usuario | Origen | Rol Keycloak asignado | MFA requerido | Acción |
|---|---|---|---|---|
| doctor | Triage (Postgres) | `doctor` | SI | Crear |
| doctor2 | Triage (Postgres) | `doctor` | SI | Crear |
| doctor3 | Triage (Postgres) | `doctor` | SI | Crear |
| paciente | Triage (Postgres) | `patient` | NO | Crear |
| admin-triage | Triage (Postgres) | `admin` | — | Omitir (ya existe en Keycloak) |
| 3 usuarios e2e-test | Monetix (MongoDB) | `monetix-user` | NO | Crear |

**Migración real ejecutada** (con aprobación explícita del usuario tras revisar el dry-run): resultado final `Creados: 4, Omitidos: 1 (ya existía), Errores: 3*`.

> \* Los "3 errores" reportados por el contador del script corresponden en realidad a los 3 usuarios e2e-test de Monetix, que respondieron `409 Conflict` (ya existían en Keycloak desde una corrida anterior) — el script los maneja correctamente como `[SKIP]` y no crea duplicados; es solo un detalle cosmético en el contador de resumen, no afecta la corrección del resultado.

**Verificación independiente vía Keycloak Admin API** (no se confió únicamente en el log del script — se reconsultó cada usuario creado):

| Usuario | `enabled` | `requiredActions` | `realmRoles` |
|---|---|---|---|
| doctor | true | `CONFIGURE_TOTP`, `UPDATE_PASSWORD` | `doctor`, `default-roles-universidad` |
| doctor2 | true | `CONFIGURE_TOTP`, `UPDATE_PASSWORD` | `doctor`, `default-roles-universidad` |
| doctor3 | true | `CONFIGURE_TOTP`, `UPDATE_PASSWORD` | `doctor`, `default-roles-universidad` |
| paciente | true | `UPDATE_PASSWORD` (sin `CONFIGURE_TOTP`) | `patient`, `default-roles-universidad` |

Esto confirma que la regla de negocio se aplicó correctamente: los roles `doctor`/`admin` quedan forzados a configurar MFA en su primer login (`CONFIGURE_TOTP`), mientras que `patient` solo debe cambiar su contraseña temporal (`Temp1234!`), sin exigencia de MFA.

---

## 7. Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Microservicios | Node.js + Express | 18+ LTS |
| Backend monolítico | Express + TypeScript | 5.x / TS 5.x |
| Frontend Triage | React + Vite | React 18 |
| Frontend Monetix | React + TypeScript + Vite | React 18 |
| IdP | Keycloak | 23.0 |
| Secrets/Cifrado | HashiCorp Vault | latest |
| API Gateway | nginx | alpine |
| DB relacional | PostgreSQL | 15 |
| DB documental | MongoDB | 6.0 |
| Caché | Redis | 7 |
| Mensajería async | RabbitMQ | 3.12 |
| Calidad de código | SonarQube Community | latest |
| Contenedores | Docker Compose | v2 |
| JWT | jsonwebtoken + jwks-rsa | — |
| Monitoreo dev | MailHog, Adminer | — |

---

## 8. Cómo Ejecutar el Proyecto

### Prerrequisitos
- Docker Desktop con Docker Compose v2
- Mínimo 8 GB RAM disponibles (Keycloak + SonarQube son pesados)
- Archivo `.env` configurado (copiar desde `.env.example`)

### Pasos

**1. Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env: definir POSTGRES_PASSWORD, MONGO_PASSWORD, REDIS_PASSWORD,
# KEYCLOAK_ADMIN_PASSWORD, INTERNAL_API_SECRET, INTERNAL_SERVICE_SECRET,
# VAULT_TOKEN (o VAULT_ROLE_ID + VAULT_SECRET_ID)
```

**2. Iniciar infraestructura base + Keycloak**
```bash
# Desde c:/proyecto
docker compose up -d postgres mongodb redis rabbitmq keycloak
# Esperar ~60s a que Keycloak importe el realm
docker compose logs -f keycloak | grep "Finished importing"
```

**3. Inicializar Vault** (primera vez)
```bash
docker compose --profile init up vault-init
# vault-init aplica políticas AppRole y crea las claves Transit
```

**4. Levantar todos los microservicios de Triage**
```bash
docker compose up -d api-gateway auth-service patient-service \
  triage-service appointment-service notification-service \
  followup-service analytics-service triage-frontend
```

**5. Levantar Monetix**
```bash
docker compose up -d monetix-backend monetix-frontend
```

**6. (Opcional) Levantar herramientas de desarrollo**
```bash
docker compose --profile tools up -d
# Levanta: SonarQube :9000, Adminer :8080, MailHog :8025
```

**7. Verificar que todo está activo**
```bash
docker compose ps
curl http://localhost:8000/health
# {"status":"ok","service":"api-gateway"}
```

### URLs de Acceso

| Servicio | URL |
|---|---|
| Triage Frontend | http://localhost:3000 |
| Monetix Frontend | http://localhost:5173 |
| API Gateway | http://localhost:8000 |
| Keycloak Admin | http://localhost:8180 |
| Vault UI | http://localhost:8200 |
| RabbitMQ Management | http://localhost:15672 |
| SonarQube | http://localhost:9000 |
| MailHog | http://localhost:8025 |

---

## 9. Puntos Clave para la Presentación

**Decisiones de arquitectura que vale la pena destacar:**

- **X-Gateway-Token como primera línea de defensa**: nginx inyecta el secret compartido en cada proxy; los microservicios rechazan cualquier acceso directo en producción. Esto garantiza que todo el tráfico de usuario pase por el rate-limiter y los headers de seguridad del gateway.

- **Dual-path auth en vez de migración abrupta**: detectar el token por el claim `iss` permitió integrar Keycloak sin eliminar los logins locales existentes. Los endpoints `/login` funcionan para ambas rutas de autenticación simultáneamente.

- **Vault Transit como "encryption as a service"**: la clave `triage-monetix-channel` nunca abandona Vault. Si el canal de red fuera comprometido, el atacante obtendría `vault:v1:CIPHERTEXT` — inutilizable sin acceso al Vault y al rol de descifrado.

- **AppRole con capacidades asimétricas**: `triage-role` puede cifrar pero no descifrar; `monetix-role` puede descifrar pero no cifrar. Un compromiso de credenciales de Triage no permite a un atacante leer datos históricos en Monetix.

- **X-Service-Token con TTL de 30 segundos**: pensado para ventanas de replay mínimas. Un token interceptado es inútil en media minuto. Cada llamada genera un token nuevo.

- **MFA condicional por rol compuesto**: los roles `admin`, `doctor` y `monetix-admin` son roles compuestos que heredan el rol marcador `mfa`. El flujo `browser-with-otp` de Keycloak evalúa la presencia de ese rol — no requiere lógica adicional en la aplicación.

- **Puertos vinculados a 127.0.0.1**: ningún servicio expone puertos en `0.0.0.0`. Todos los accesos externos deben ir por el API Gateway o por túneles explícitos.

- **PKCE S256 en SPAs**: los frontends nunca manejan un `client_secret`. La prueba de posesión del `code_verifier` protege el Authorization Code contra intercepción, incluso en redes no confiables.

- **Perfiles de Docker Compose**: `[tools]` agrupa SonarQube, Adminer y MailHog para no consumir recursos en cada arranque; `[init]` ejecuta vault-init de forma idempotente solo cuando se necesita.

- **RabbitMQ para desacoplamiento async**: `notification-service` y `followup-service` son consumers. Si un email falla, el mensaje permanece en la cola — no bloquea el flujo principal del triage.
