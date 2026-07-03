#!/bin/bash
# Sprint 5 — Ejecuta sonar-scanner en los 3 proyectos
# Requiere: sonar-scanner instalado en el PATH y SonarQube corriendo en localhost:9000
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
    echo "❌ Falta $name en el .env"
    echo "   Entra a http://localhost:9000 → My Account → Security → Generate Token"
    exit 1
  fi
}

check_token "SONAR_TOKEN_TRIAGE"           "$SONAR_TOKEN_TRIAGE"
check_token "SONAR_TOKEN_MONETIX_BACKEND"  "$SONAR_TOKEN_MONETIX_BACKEND"
check_token "SONAR_TOKEN_MONETIX_FRONTEND" "$SONAR_TOKEN_MONETIX_FRONTEND"

# Esperar que SonarQube esté listo
echo "⏳ Esperando SonarQube en http://localhost:9000..."
until curl -sf "http://localhost:9000/api/system/status" | grep -q '"status":"UP"'; do
  sleep 5
done
echo "✅ SonarQube listo"
echo ""

# ── Triage Remoto ──────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════"
echo " Analizando: Triage Remoto"
echo "═══════════════════════════════════════════════"
cd "$ROOT/AplicacionesDistribuidas"
sonar-scanner \
  -Dsonar.token="$SONAR_TOKEN_TRIAGE" \
  -Dsonar.host.url=http://localhost:9000

# ── Monetix Backend ────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
echo " Analizando: Monetix Backend"
echo "═══════════════════════════════════════════════"
cd "$ROOT/MonetixBackend"
sonar-scanner \
  -Dsonar.token="$SONAR_TOKEN_MONETIX_BACKEND" \
  -Dsonar.host.url=http://localhost:9000

# ── Monetix Frontend ───────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
echo " Analizando: Monetix Frontend"
echo "═══════════════════════════════════════════════"
cd "$ROOT/MonetixFrontend"
sonar-scanner \
  -Dsonar.token="$SONAR_TOKEN_MONETIX_FRONTEND" \
  -Dsonar.host.url=http://localhost:9000

echo ""
echo "✅ Análisis completos. Ver resultados en http://localhost:9000"
