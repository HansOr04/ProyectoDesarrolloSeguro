#!/bin/bash
# Sprint 5 — Ejecuta cobertura de tests y luego sonar-scanner en los 3 proyectos
# Requiere: sonar-scanner (o npx sonar-scanner) y SonarQube corriendo en localhost:9000
#
# Uso:
#   ./scripts/sonar-scan.sh
#
# Primera vez: entra a http://localhost:9000, crea los proyectos y genera tokens:
#   - triage-remoto       → SONAR_TOKEN_TRIAGE
#   - monetix-backend     → SONAR_TOKEN_MONETIX_BACKEND
#   - monetix-frontend    → SONAR_TOKEN_MONETIX_FRONTEND
# Luego cópialos en el .env y vuelve a correr este script.

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Cargar .env
if [ -f "$ROOT/.env" ]; then
  export $(grep -v '^#' "$ROOT/.env" | xargs)
fi

check_token() {
  local name="$1" token="$2"
  if [ -z "$token" ]; then
    echo "FALTA $name en el .env"
    echo "   Entra a http://localhost:9000 -> My Account -> Security -> Generate Token"
    exit 1
  fi
}

check_token "SONAR_TOKEN_TRIAGE"           "$SONAR_TOKEN_TRIAGE"
check_token "SONAR_TOKEN_MONETIX_BACKEND"  "$SONAR_TOKEN_MONETIX_BACKEND"
check_token "SONAR_TOKEN_MONETIX_FRONTEND" "$SONAR_TOKEN_MONETIX_FRONTEND"

# Normaliza backslashes en lcov.info generados en Windows (SF:src\file.ts -> SF:src/file.ts)
fix_lcov_paths() {
  local lcov_file="$1"
  if [ -f "$lcov_file" ]; then
    python3 -c "
import sys
f = sys.argv[1]
content = open(f, encoding='utf-8').read()
open(f, 'w', encoding='utf-8').write(content.replace(chr(92), '/'))
" "$lcov_file"
    echo "  lcov paths normalizados: $lcov_file"
  fi
}

# Esperar que SonarQube este listo
echo "Esperando SonarQube en http://localhost:9000..."
until curl -sf "http://localhost:9000/api/system/status" | grep -q '"status":"UP"'; do
  sleep 5
done
echo "SonarQube listo"
echo ""

# -- Triage Remoto ------------------------------------------------------------
echo "==============================================="
echo " Triage Remoto: generando cobertura de tests"
echo "==============================================="
cd "$ROOT/AplicacionesDistribuidas/services/analytics-service"
# No falla el build si los tests tienen errores; solo reporta cobertura real
pnpm test:coverage --passWithNoTests 2>&1 || echo "  [WARN] Algunos tests fallaron; cobertura parcial reportada de todos modos"
fix_lcov_paths "$ROOT/AplicacionesDistribuidas/services/analytics-service/coverage/lcov.info"

echo ""
echo "==============================================="
echo " Analizando: Triage Remoto"
echo "==============================================="
cd "$ROOT/AplicacionesDistribuidas"
npx sonar-scanner \
  -Dsonar.token="$SONAR_TOKEN_TRIAGE" \
  -Dsonar.host.url=http://localhost:9000

# -- Monetix Backend ----------------------------------------------------------
echo ""
echo "==============================================="
echo " Monetix Backend: generando cobertura de tests"
echo "==============================================="
cd "$ROOT/MonetixBackend"
pnpm test:coverage --passWithNoTests 2>&1 || echo "  [WARN] Algunos tests fallaron; cobertura parcial reportada de todos modos"
fix_lcov_paths "$ROOT/MonetixBackend/coverage/lcov.info"

echo ""
echo "==============================================="
echo " Analizando: Monetix Backend"
echo "==============================================="
npx sonar-scanner \
  -Dsonar.token="$SONAR_TOKEN_MONETIX_BACKEND" \
  -Dsonar.host.url=http://localhost:9000

# -- Monetix Frontend ---------------------------------------------------------
echo ""
echo "==============================================="
echo " Monetix Frontend: generando cobertura de tests"
echo "==============================================="
cd "$ROOT/MonetixFrontend"
pnpm test:coverage 2>&1 || echo "  [WARN] Algunos tests fallaron; cobertura parcial reportada de todos modos"
fix_lcov_paths "$ROOT/MonetixFrontend/coverage/lcov.info"

echo ""
echo "==============================================="
echo " Analizando: Monetix Frontend"
echo "==============================================="
npx sonar-scanner \
  -Dsonar.token="$SONAR_TOKEN_MONETIX_FRONTEND" \
  -Dsonar.host.url=http://localhost:9000

echo ""
echo "Analisis completos. Ver resultados en http://localhost:9000"
