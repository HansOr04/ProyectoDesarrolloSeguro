# Reporte de Análisis Estático — SonarQube
## Proyecto ISWZ3206 — Triage Remoto + Monetix

---

## Estado actual

✅ **Análisis ejecutado y completo** (2026-06-28). SonarQube 10.4 Community corriendo en `http://localhost:9000`, los 3 proyectos creados, tokens generados y persistidos en `.env` (no se exponen en este documento), `sonar-scanner` ejecutado vía contenedor oficial `sonarsource/sonar-scanner-cli` contra cada proyecto.

---

## Instrucciones para ejecutar el análisis

### Paso 1 — Levantar SonarQube

```bash
# SonarQube usa el profile "tools" — no levanta en un docker-compose up normal
COMPOSE_PROFILES=tools docker-compose up -d sonarqube

# Esperar ~2 minutos hasta que el healthcheck pase
docker-compose ps sonarqube
# Estado esperado: healthy
```

### Paso 2 — Generar los tokens en http://localhost:9000

1. Abre **http://localhost:9000** en el navegador
2. Inicia sesión con `admin` / `admin` (primer login pedirá cambio de contraseña)
3. Ve a **My Account → Security → Generate Token**
4. Crea un token para **cada proyecto**:

| Token | Nombre sugerido en SonarQube |
|-------|------------------------------|
| `SONAR_TOKEN_TRIAGE` | `triage-remoto-token` |
| `SONAR_TOKEN_MONETIX_BACKEND` | `monetix-backend-token` |
| `SONAR_TOKEN_MONETIX_FRONTEND` | `monetix-frontend-token` |

### Paso 3 — Agregar los tokens al `.env`

```bash
# Edita .env y rellena estas variables con los tokens generados:
SONAR_TOKEN_TRIAGE=squ_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SONAR_TOKEN_MONETIX_BACKEND=squ_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SONAR_TOKEN_MONETIX_FRONTEND=squ_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Paso 4 — Crear los proyectos en SonarQube

En **http://localhost:9000**:
1. **Projects → Create Project → Manually**
2. Crear proyecto con clave `triage-remoto`
3. Repetir con `monetix-backend` y `monetix-frontend`

### Paso 5 — Ejecutar el análisis

```bash
# Requiere sonar-scanner instalado:
# https://docs.sonarqube.org/latest/analyzing-source-code/scanners/sonarscanner/

bash scripts/sonar-scan.sh

# Resultados disponibles en: http://localhost:9000/projects
```

---

## Configuración de proyectos verificada

Los siguientes archivos de configuración están presentes y correctamente configurados:

| Proyecto | Archivo | projectKey |
|----------|---------|-----------|
| Triage Remoto | [AplicacionesDistribuidas/sonar-project.properties](AplicacionesDistribuidas/sonar-project.properties) | `triage-remoto` |
| Monetix Backend | [MonetixBackend/sonar-project.properties](MonetixBackend/sonar-project.properties) | `monetix-backend` |
| Monetix Frontend | [MonetixFrontend/sonar-project.properties](MonetixFrontend/sonar-project.properties) | `monetix-frontend` |

---

## Resultados del análisis

Todos los Quality Gates pasaron (**OK**) en los 3 proyectos. **0 Blockers** y **0 Vulnerabilidades** (tipo `VULNERABILITY`) en todo el monorepo. El hallazgo de seguridad real más importante apareció como **Security Hotspot** (ver más abajo), no como issue clásico — confirmado y corregido durante esta auditoría.

### Resumen por proyecto

| Proyecto | Bugs | Vulnerabilidades | Code Smells | Security Hotspots | Cobertura | Duplicación | Quality Gate |
|----------|------|------------------|-------------|--------------------|-----------|-------------|--------------|
| Triage Remoto (JS) | 1 | 0 | 60 | 32 | 0.0% | 2.0% | ✅ OK |
| Monetix Backend (TS) | 0 | 0 | 49 | 2 | 0.0% | 1.2% | ✅ OK |
| Monetix Frontend (TS/React) | 3 | 0 | 48 | 1 | 0.0% | 0.8% | ✅ OK |

> Cobertura 0.0% es esperada: no se generaron reportes LCOV (`coverage/lcov.info`) en esta corrida; los proyectos sí tienen suites de tests (ver suite E2E Playwright independiente), pero no se integró `nyc`/`jest --coverage` al pipeline de SonarQube todavía.

### Issues por severidad (issues clásicos: Bug + Code Smell)

| Severidad | Triage (61 total) | Monetix Backend (49 total) | Monetix Frontend (51 total) | Total |
|-----------|--------|-----------------|------------------|-------|
| 🔴 Blocker | 0 | 0 | 0 | **0** |
| 🟠 Critical | 5 | 2 | 4 | **11** |
| 🟡 Major | 27 | 5 | 15 | **47** |
| 🔵 Minor | 29 | 41 | 32 | **102** |
| ℹ️ Info | 0 | 1 | 0 | **1** |

Los 11 issues **Critical** son **100% de un solo tipo**: `S3776` (Cognitive Complexity), funciones que superan el umbral de 15. Son deuda técnica de mantenibilidad, no bugs ni vulnerabilidades — prioridad de refactor documentada abajo, no bloqueante para producción.

### Security Hotspots — el hallazgo real de seguridad

| Proyecto | Hotspots | De los cuales HIGH |
|----------|----------|---------------------|
| Triage Remoto | 32 | 7 (SQL Injection) |
| Monetix Backend | 2 | 0 |
| Monetix Frontend | 1 | 0 |

**Hallazgo crítico real — SQL Injection en `analytics-service`:** los parámetros `start_date`/`end_date` (tomados directo de `req.query`, sin sanitizar) se interpolaban como texto plano dentro de queries SQL crudas ejecutadas con `Sequelize.query()`, en 7 ubicaciones de `kpi.service.js`. El endpoint está protegido por `authenticate` + `authorize('ADMIN','DOCTOR')`, lo que reduce pero no elimina el riesgo (cuenta admin comprometida, insider). **Corregido en esta auditoría** — ver tabla de issues resueltos.

### Top 5 hallazgos más críticos

| # | Severidad/Prob. | Proyecto | Archivo | Línea | Descripción |
|---|-----------|----------|---------|-------|-------------|
| 1 | 🔴 HIGH (Hotspot) | Triage Remoto | `services/analytics-service/src/services/kpi.service.js` | 38, 44, 59, 78, 94, 142, 156 | SQL Injection — `start_date`/`end_date` interpolados sin parametrizar en 7 queries. **Corregido.** |
| 2 | 🟠 Critical | Triage Remoto | `services/analytics-service/src/services/kpi.service.js:30` | 30 | Complejidad cognitiva 29/15 en `calculateKPIs()` (post-fix sigue alta, pendiente refactor estructural) |
| 3 | 🟠 Critical | Monetix Frontend | `src/pages/Comparisons.tsx:13` | 13 | Complejidad cognitiva 71/15 — la más alta del monorepo |
| 4 | 🟠 Critical | Monetix Backend | `src/core/models/LinearRegression.ts:168` | 168 | Complejidad cognitiva 26/15 |
| 5 | 🟡 MEDIUM (Hotspot) | Triage Remoto | `services/appointment-service/src/services/jitsi.service.js:19` | 19 | Generador pseudoaleatorio débil usado para JWT/secret de sala Jitsi — revisar si debe ser `crypto.randomBytes` |

### Issues resueltos

| Issue | Archivo | Línea | Acción tomada |
|-------|---------|-------|---------------|
| SQL Injection (7 hotspots HIGH) | `AplicacionesDistribuidas/services/analytics-service/src/services/kpi.service.js` | 38-166 | Reescritas las 7 queries afectadas (`calculateKPIs`, `getDashboardSummary`) usando `replacements` parametrizados de Sequelize (`:startDate`/`:endDate`/`:today`) en vez de interpolación de template strings. Verificado: (1) las 3 rutas (con rango, sin rango, dashboard) siguen devolviendo datos reales correctos tras el fix; (2) un payload `'; DROP TABLE patients; --'` ahora es tratado como literal de texto y rechazado por Postgres (`invalid input syntax for type timestamp`), no se ejecuta como SQL. Imagen Docker reconstruida y redeployada (`docker compose build/up analytics-service`). |

### Issues estructurales documentados (no corregidos — prioridad para roadmap)

| Prioridad | Archivo:Línea | Complejidad actual/permitida | Nota |
|-----------|----------------|-------------------------------|------|
| Alta | `MonetixFrontend/src/pages/Comparisons.tsx:13` | 71/15 | El componente mezcla fetch, transformación de datos y render condicional en una sola función — candidato a split en hooks (`useComparisonsData`, `useComparisonsChart`) |
| Alta | `AplicacionesDistribuidas/services/analytics-service/src/services/kpi.service.js:30` | 29/15 | `calculateKPIs()` concatena 5 cálculos independientes secuenciales — extraer cada bloque (`getPatientsTotal`, `getTriagesByLevel`, etc.) a funciones propias |
| Media | `MonetixFrontend/src/pages/Comparisons.tsx:51,509`, `Predictions.tsx:329` | 61/15, 30/15, 31/15 | Mismo patrón que arriba, mismo módulo |
| Media | `AplicacionesDistribuidas/services/triage-service/src/services/decisionTree.service.js:113,151` | 17/15, 23/15 | Árbol de decisión clínico con muchas ramas anidadas — considerar tabla de reglas en vez de if/else anidado |
| Media | `MonetixBackend/src/core/models/LinearRegression.ts:168`, `src/services/GeminiService.ts:23` | 26/15, 23/15 | — |
| Baja | `AplicacionesDistribuidas/services/analytics-service/{auth.middleware.js:23, analytics.routes.js:29}` | 18/15, 17/15 | Levemente sobre el umbral |

---

## Qué buscar en los resultados (guía para la presentación)

### Vulnerabilidades de seguridad típicas en este stack

| Regla SonarQube | Descripción | Severidad esperada |
|-----------------|-------------|-------------------|
| `javascript:S2068` | Contraseña hardcodeada en código | Critical |
| `javascript:S4790` | Uso de hash débil (MD5, SHA1) | Critical |
| `javascript:S5547` | Cifrado simétrico débil | Critical |
| `javascript:S4423` | Protocolo SSL/TLS débil | Major |
| `typescript:S1854` | Variable asignada pero nunca usada | Minor |
| `typescript:S2737` | Catch vacío que silencia errores | Major |

### Puntos específicos a revisar en este proyecto

1. **Triage — auth.controller.js**: El `login()` local genera JWT sin pasar por Keycloak. SonarQube podría marcar la gestión directa de secretos.
2. **Monetix Backend — auth.controller.ts**: Mismo patrón de login local.
3. **Vault.js / vault.service.ts**: Verificar que no haya tokens hardcodeados como fallback.
4. **Dockerfiles**: SonarQube no analiza Dockerfiles, pero el sonar-scanner JS/TS puede detectar secretos en archivos `.env` si se incluyen en `sonar.sources`.

### Capturas de pantalla a incluir en la presentación

- [ ] Dashboard general de SonarQube con los 3 proyectos
- [ ] Quality Gate (passed/failed) de cada proyecto
- [ ] Lista de vulnerabilidades de seguridad (si hay)
- [ ] Evidencia de al menos 1 issue Blocker/Critical corregido (diff en git)

---

## Notas

- SonarQube está configurado con `profiles: [tools]` — no levanta en producción.
- La base de datos de SonarQube usa la misma instancia PostgreSQL del proyecto (schema `sonarqube`).
- Los tokens son personales por instalación de SonarQube; no se deben commitear al repositorio.
