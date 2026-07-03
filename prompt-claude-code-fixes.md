# Prompt para Claude Code — Corrección de hallazgos de seguridad y calidad

Copia todo el bloque de abajo (desde "## Contexto" hasta el final) y pégalo como prompt inicial en Claude Code, parado en la raíz del monorepo (`c:/proyecto` o donde esté clonado).

---

## Contexto

Trabajas sobre un monorepo académico (materia ISWZ3206) con dos sistemas:
- **Sistema A — Triage Remoto**: microservicios Node.js/Express en `AplicacionesDistribuidas/services/*`, gateway nginx, PostgreSQL/MongoDB/Redis/RabbitMQ.
- **Sistema B — Monetix**: backend monolítico Express/TypeScript en `MonetixBackend/`, MongoDB.
- Infraestructura compartida: Keycloak (`AplicacionesDistribuidas/keycloak/`), HashiCorp Vault (`scripts/vault/`, `AplicacionesDistribuidas/shared/utils/vault.js`, `MonetixBackend/src/services/vault.service.ts`), SonarQube (`SONARQUBE-REPORT.md`, `*/sonar-project.properties`).

Se realizó una auditoría de código (no solo el reporte de SonarQube) y se identificaron 10 hallazgos concretos. Tu tarea es corregirlos **uno por uno, en el orden dado**, haciendo un commit separado por hallazgo con mensaje descriptivo. No refactorices nada que no esté en esta lista. Antes de cada cambio, lee el archivo completo afectado para no romper contratos existentes (nombres de funciones exportadas, rutas, forma del payload). Después de cada cambio, si existen tests relacionados, ejecútalos; si no existen, créalos.

---

## Hallazgo 1 — Validación de `audience` condicional en JWT de Keycloak (severidad: alta)

**Archivos:** `AplicacionesDistribuidas/services/auth-service/src/middlewares/keycloak.middleware.js` y cualquier otro middleware Keycloak equivalente en los demás microservicios de Triage, más `MonetixBackend/src/middlewares/keycloak.middleware.ts`.

**Problema:** la validación de `audience` en `jwt.verify` es condicional:
```js
...(KEYCLOAK_CLIENT_ID ? { audience: KEYCLOAK_CLIENT_ID } : {})
```
Si `KEYCLOAK_CLIENT_ID` no está definido, no se valida audiencia — solo firma e `issuer`, que es el mismo para los 4 clients del realm. Esto permite en teoría que un token válido de `monetix-frontend`/`monetix-client` sea aceptado por un backend de Triage o viceversa.

**Fix requerido:**
1. Al arrancar el servicio, si `KEYCLOAK_JWKS_URI` está configurado pero `KEYCLOAK_CLIENT_ID` no, lanza un error explícito y detén el arranque (mismo patrón que ya usan para `POSTGRES_PASSWORD:?ERROR...` en `docker-compose.yml`, pero aplicado en el código Node, no solo en compose).
2. Elimina el spread condicional; `audience: KEYCLOAK_CLIENT_ID` debe pasarse siempre que Keycloak esté activo.
3. Repite el mismo fix en el middleware equivalente de Monetix (`.ts`).
4. Actualiza `.env.example` (raíz y de cada servicio) para dejar explícito que `KEYCLOAK_CLIENT_ID` es obligatorio si `KEYCLOAK_JWKS_URI` está presente.
5. Añade un test unitario que verifique que un token con `aud` incorrecto es rechazado con el error esperado.

---

## Hallazgo 2 — Generador no criptográfico para nombres de sala Jitsi (severidad: media)

**Archivo:** `AplicacionesDistribuidas/services/appointment-service/src/services/jitsi.service.js`, función `generateRoomName()`.

**Problema:** usa `Math.random().toString(36).substring(2, 8)` para el sufijo de la sala de videoconsulta médica — no es impredecible.

**Fix requerido:**
1. Reemplaza `Math.random()` por `crypto.randomBytes(6).toString('hex')` (importar `crypto` del core de Node, sin dependencias nuevas).
2. Mantén el mismo formato de nombre resultante (`triage-{appointmentId}-{timestamp}-{sufijo}`) para no romper integraciones que parseen el nombre de sala.
3. Actualiza o crea el test unitario que cubra `generateRoomName()`, verificando longitud y que dos llamadas seguidas no generen colisión en 1000 iteraciones.

---

## Hallazgo 3 — Cobertura de tests no integrada al pipeline de SonarQube (severidad: media)

**Archivos:** `*/sonar-project.properties` (Triage, MonetixBackend, MonetixFrontend), `scripts/sonar-scan.sh`, `package.json`/`jest.config.js` de cada proyecto con tests.

**Problema:** SonarQube reporta 0.0% de cobertura en los 3 proyectos porque nunca se genera `coverage/lcov.info`.

**Fix requerido:**
1. En cada `package.json` con Jest, agrega o ajusta el script `test:coverage` para que genere reporte `lcov` (`jest --coverage --coverageReporters=lcov`).
2. En cada `sonar-project.properties`, agrega la propiedad `sonar.javascript.lcov.reportPaths=coverage/lcov.info` (o `sonar.typescript.lcov.reportPaths` según corresponda).
3. Actualiza `scripts/sonar-scan.sh` para que ejecute `test:coverage` antes de invocar `sonar-scanner` en cada proyecto.
4. No falles el build si algún proyecto todavía no tiene suficientes tests — solo asegura que el pipeline mida y reporte cobertura real, aunque sea baja.
5. Actualiza la sección correspondiente de `SONARQUBE-REPORT.md` explicando el cambio.

---

## Hallazgo 4 — Complejidad cognitiva alta sin refactorizar (severidad: media, deuda técnica)

Refactoriza estas funciones específicas, manteniendo el comportamiento externo idéntico (mismos inputs/outputs, mismos endpoints):

| Archivo | Función/línea | Complejidad actual | Refactor sugerido |
|---|---|---|---|
| `MonetixFrontend/src/pages/Comparisons.tsx:13` | componente principal | 71/15 | Extraer a hooks: `useComparisonsData()` (fetch + transformación) y `useComparisonsChart()` (lógica de render condicional). El componente debe quedar solo orquestando estos hooks. |
| `MonetixFrontend/src/pages/Comparisons.tsx:51,509` | funciones auxiliares | 61/15, 30/15 | Mismo patrón de extracción a hooks/funciones puras testeables. |
| `MonetixFrontend/src/pages/Predictions.tsx:329` | función interna | 31/15 | Extraer lógica de cálculo a un módulo `utils/predictionsHelpers.ts` con funciones puras. |
| `AplicacionesDistribuidas/services/analytics-service/src/services/kpi.service.js:30` | `calculateKPIs()` | 29/15 | Extraer cada bloque de cálculo a funciones propias: `getPatientsTotal()`, `getTriagesByLevel()`, etc. `calculateKPIs()` debe quedar como orquestador que las llama y compone el resultado. |
| `MonetixBackend/src/core/models/LinearRegression.ts:168` | método del modelo | 26/15 | Separar validación de datos, cálculo de coeficientes y cálculo de residuales en métodos privados independientes. |
| `AplicacionesDistribuidas/services/triage-service/src/services/decisionTree.service.js:113,151` | árbol de decisión clínico | 17/15, 23/15 | Reemplazar el if/else anidado por una tabla de reglas (array de objetos `{ condicion, resultado }`) recorrida con `.find()`. |
| `MonetixBackend/src/services/GeminiService.ts:23` | método del servicio | 23/15 | Separar construcción del prompt, llamada a la API y parseo de respuesta en tres métodos. |
| `AplicacionesDistribuidas/services/analytics-service/src/middlewares/auth.middleware.js:23` | middleware | 18/15 | Simplificar condicionales anidados, early returns. |
| `AplicacionesDistribuidas/services/analytics-service/src/routes/analytics.routes.js:29` | definición de rutas | 17/15 | Extraer validaciones inline a middlewares reutilizables. |

**Regla obligatoria para todo este hallazgo:** después de cada refactor, corre la suite de tests existente relacionada a ese archivo/servicio y confirma que sigue en verde antes de pasar al siguiente. Si no hay tests para ese archivo, escribe al menos 2-3 casos básicos antes de refactorizar (test primero, para poder comparar comportamiento antes/después).

---

## Hallazgo 5 — Vault inicializado con una sola clave de unseal (severidad: baja para el alcance académico, documentar como producción real)

**Archivo:** `scripts/vault/init-vault.sh`.

**Fix requerido (no cambiar el comportamiento por defecto en dev, solo hacerlo configurable):**
1. Parametriza `key-shares` y `key-threshold` con variables de entorno `VAULT_KEY_SHARES` y `VAULT_KEY_THRESHOLD`, con default `1` y `1` respectivamente (mantiene compatibilidad con el flujo académico actual).
2. Agrega un bloque de comentario explícito arriba del `vault operator init` explicando que en producción real se recomienda `VAULT_KEY_SHARES=5 VAULT_KEY_THRESHOLD=3` (o superior) repartiendo las claves entre distintos responsables.
3. Actualiza `.env.example` (raíz) agregando estas dos variables como opcionales, con el comentario de la recomendación de producción.

---

## Hallazgo 6 — Root token de Vault persistido sin revocación (severidad: baja-media)

**Archivo:** `scripts/vault/init-vault.sh`.

**Fix requerido:**
1. Después de crear las políticas (`triage-policy`, `monetix-policy`) y los AppRoles (`triage-role`, `monetix-role`), agrega un paso opcional controlado por variable de entorno `VAULT_REVOKE_ROOT_TOKEN=true/false` (default `false` para no romper el flujo de desarrollo actual) que ejecute `vault token revoke -self` usando el root token, **después** de haber generado y exportado los `role_id`/`secret_id` de ambos AppRoles.
2. Si se revoca, imprime un mensaje claro indicando que futuras operaciones administrativas requerirán generar un nuevo root token con `vault operator generate-root` usando las claves de unseal.
3. Documenta esta opción en el comentario del script y en `GUIA-TECNICA-PRESENTACION.md`, sección de Vault.

---

## Hallazgo 7 — `X-Service-Token` sin protección anti-replay (severidad: media-alta)

**Archivos:** `AplicacionesDistribuidas/shared/utils/serviceAuth.js`, `MonetixBackend/src/middlewares/serviceAuth.middleware.ts`, y el middleware equivalente `requireService`/`requireGateway` en `shared/middlewares/gatewayAuth.middleware.js`.

**Problema:** el JWT HMAC de 30 segundos no tiene `jti` (identificador único) ni verificación de un solo uso — un token interceptado dentro de la ventana de 30s podría reenviarse.

**Fix requerido:**
1. En `signServiceRequest()` (JS y TS), agrega un claim `jti` generado con `crypto.randomUUID()`.
2. En `verifyServiceToken()`/`requireService()` (ambos lenguajes), después de verificar la firma:
   - Consulta Redis (ya está disponible en la infraestructura compartida, usado por `triage-service`) por la clave `service-token-used:{jti}`.
   - Si existe, rechaza con `401` y código `SERVICE_TOKEN_REPLAYED`.
   - Si no existe, márcala con `SET service-token-used:{jti} 1 EX 35` (35s, un poco más que el TTL del token) y continúa.
3. Si Redis no está disponible (error de conexión), decide explícitamente el comportamiento: **falla cerrado** (rechaza la request) en vez de fallar abierto, y deja un comentario explicando la decisión.
4. Actualiza el diagrama de flujo en `GUIA-TECNICA-PRESENTACION.md` (sección 5) para reflejar el nuevo paso de verificación anti-replay.
5. Agrega tests: un mismo token usado dos veces debe fallar la segunda vez.

---

## Hallazgo 8 — Falta de test de regresión para el mapeo de roles en `migrate-users.js` (severidad: baja, prevención)

**Archivo:** `scripts/federation/migrate-users.js` (o su carpeta de tests si existe).

**Contexto:** ya se corrigió un bug real donde `TRIAGE_ROLE_MAP[u.role]` fallaba silenciosamente por mayúsculas/minúsculas, cayendo siempre al fallback `'patient'`.

**Fix requerido:**
1. Extrae la función de mapeo de rol (`roleKey = (u.role || '').toLowerCase(); TRIAGE_ROLE_MAP[roleKey] || 'patient'`) a una función pura exportable, ej. `resolveKeycloakRole(rawRole)`.
2. Escribe un test unitario que cubra explícitamente: rol en mayúsculas (`'DOCTOR'`), minúsculas (`'doctor'`), rol inexistente/null (debe caer a `'patient'` con un warning logueado, no silenciosamente), y rol vacío.
3. Este test debe quedar como regresión permanente para que un bug de este tipo no vuelva a pasar desapercibido en un futuro cambio de esquema de base de datos.

---

## Hallazgo 9 — Cliente Vault duplicado entre Triage (JS) y Monetix (TS) (severidad: baja, mantenibilidad)

**Archivos:** `AplicacionesDistribuidas/shared/utils/vault.js`, `MonetixBackend/src/services/vault.service.ts`.

**Fix requerido (documentación, no extracción forzada de paquete):**
1. Agrega un comentario en la cabecera de ambos archivos indicando explícitamente que son implementaciones paralelas intencionales (Monetix es un proyecto TypeScript independiente sin acceso a `AplicacionesDistribuidas/shared/`), y que cualquier cambio en la lógica de autenticación AppRole o renovación de token debe replicarse manualmente en ambos.
2. No fusiones ni elimines ninguno de los dos archivos — el objetivo de este hallazgo es solo dejar constancia explícita en el código para evitar que a futuro alguien modifique uno y olvide el otro.

---

## Hallazgo 10 — Confirmar y dejar evidencia reproducible del fix de SQL Injection ya aplicado

**Archivo:** `AplicacionesDistribuidas/services/analytics-service/src/services/kpi.service.js`.

**Contexto:** el `SONARQUBE-REPORT.md` afirma que las 7 queries vulnerables (interpolación directa de `start_date`/`end_date` en `Sequelize.query()`) ya fueron reescritas con `replacements` parametrizados.

**Fix/verificación requerida:**..
1. Lee el archivo completo y confirma que **las 7 ubicaciones** (líneas 38, 44, 59, 78, 94, 142, 156 según el reporte) usan `replacements: { startDate, endDate, today }` con placeholders `:startDate`/`:endDate`/`:today`, y no interpolación de template strings (`${start_date}`).
2. Si encuentras alguna ubicación que todavía interpola directamente, corrígela con el mismo patrón parametrizado que las demás.
3. Escribe un test de integración que envíe `start_date="'; DROP TABLE patients; --"` al endpoint correspondiente y verifique que la respuesta es un error de validación/tipo (no un 500 de SQL ni una ejecución exitosa inesperada), confirmando que el payload se trata como literal de texto.
4. Deja este test como regresión permanente en la suite de `analytics-service`.

---

## Reglas generales para todo el trabajo

- Un commit por hallazgo, mensaje en formato `fix(seguridad): <resumen>` o `refactor(calidad): <resumen>` según corresponda.
- No cambies comportamiento observable desde fuera (rutas, forma de payloads JSON, nombres de variables de entorno ya usadas en `docker-compose.yml`) salvo que el hallazgo lo requiera explícitamente (como el Hallazgo 1).
- Si algún fix requiere una variable de entorno nueva, agrégala con un valor default seguro y actualízala en **todos** los `.env.example` relevantes.
- Al terminar los 10 hallazgos, actualiza `SONARQUBE-REPORT.md` añadiendo una sección "Correcciones aplicadas — auditoría de seguimiento" con una tabla igual de formato a la existente ("Issues resueltos"), listando cada hallazgo, archivo, y la verificación aplicada.
- Corre toda la suite de tests del monorepo al final y reporta el resultado.
- No toques nada fuera de esta lista de 10 hallazgos, aunque veas otras oportunidades de mejora — anótalas al final como sugerencias, no las implementes.
