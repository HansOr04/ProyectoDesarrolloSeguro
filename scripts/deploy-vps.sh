#!/usr/bin/env bash
# ============================================================
# deploy-vps.sh — Script de despliegue para VPS (Ubuntu/Debian)
#
# Uso:
#   chmod +x scripts/deploy-vps.sh
#   ./scripts/deploy-vps.sh [--first-run]
#
# --first-run: instala Docker, configura firewall y clona el repo
# Sin flag:    actualiza el código y reinicia servicios
# ============================================================
set -euo pipefail

REPO_URL="${REPO_URL:-}"
APP_DIR="${APP_DIR:-/opt/proyecto}"
COMPOSE_CMD="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Primera instalación ──────────────────────────────────────────
first_run() {
    info "Instalando Docker..."
    apt-get update -q
    apt-get install -y -q ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
| tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -q
    apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker

    info "Configurando firewall (ufw)..."
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp    comment 'SSH'
    ufw allow 80/tcp    comment 'HTTP (Traefik → redirige a HTTPS)'
    ufw allow 443/tcp   comment 'HTTPS (Traefik)'
    ufw allow 10000/udp comment 'Jitsi media'
    # IMPORTANTE: Docker bypassa ufw. Los puertos 127.0.0.1:* del .yml no son accesibles externamente.
    # Verificar con: docker ps --format "table {{.Ports}}" y confirmar que solo 80/443/10000 son 0.0.0.0
    ufw --force enable
    info "Firewall configurado."

    if [ -n "$REPO_URL" ]; then
        info "Clonando repositorio en $APP_DIR..."
        git clone "$REPO_URL" "$APP_DIR"
        cd "$APP_DIR"
    fi
}

# ── Verificar requisitos ─────────────────────────────────────────
check_requirements() {
    command -v docker >/dev/null 2>&1 || error "Docker no instalado. Ejecuta con --first-run primero."
    [ -f .env ] || error "Archivo .env no encontrado. Copia .env.example a .env y rellena los valores."
    [ -f docker-compose.prod.yml ] || error "docker-compose.prod.yml no encontrado."

    # Verificar variables críticas de producción
    local required_vars=(
        POSTGRES_PASSWORD MONGO_PASSWORD REDIS_PASSWORD RABBITMQ_PASSWORD
        KEYCLOAK_ADMIN_PASSWORD KEYCLOAK_DB_PASSWORD
        TRIAGE_JWT_SECRET MONETIX_JWT_SECRET
        INTERNAL_API_SECRET INTERNAL_SERVICE_SECRET
        KEYCLOAK_HOSTNAME TRIAGE_API_HOSTNAME TRIAGE_FRONTEND_HOSTNAME
        MONETIX_API_HOSTNAME MONETIX_FRONTEND_HOSTNAME
        ACME_EMAIL CORS_ORIGIN_TRIAGE CORS_ORIGIN_MONETIX
    )
    local missing=()
    for var in "${required_vars[@]}"; do
        grep -q "^${var}=" .env 2>/dev/null || missing+=("$var")
    done
    if [ ${#missing[@]} -gt 0 ]; then
        error "Variables requeridas no definidas en .env:\n  ${missing[*]}"
    fi
}

# ── Despliegue principal ─────────────────────────────────────────
deploy() {
    info "Actualizando código..."
    git pull --rebase origin main 2>/dev/null || warn "No se pudo hacer pull (puede ser la primera vez o sin remote)"

    info "Construyendo imágenes..."
    $COMPOSE_CMD build --parallel

    info "Iniciando servicios..."
    $COMPOSE_CMD up -d --remove-orphans

    info "Esperando health checks (60s)..."
    sleep 60

    info "Estado de los servicios:"
    $COMPOSE_CMD ps
}

# ── Inicializar Vault (solo si es el primer despliegue) ──────────
init_vault() {
    if $COMPOSE_CMD ps vault-init 2>/dev/null | grep -q "Exited (0)"; then
        info "Vault ya fue inicializado."
        return
    fi
    warn "Inicializando Vault... (guarda las unseal keys en un lugar seguro)"
    COMPOSE_PROFILES=init $COMPOSE_CMD up vault-init
    info "Vault inicializado. Revisa los logs: $COMPOSE_CMD logs vault-init"
}

# ── Main ─────────────────────────────────────────────────────────
cd "$(dirname "$0")/.."

if [[ "${1:-}" == "--first-run" ]]; then
    [ "$EUID" -eq 0 ] || error "El modo --first-run requiere permisos de root (sudo)"
    first_run
fi

check_requirements
deploy
init_vault

info "✓ Despliegue completado."
info "  Triage frontend:  https://$(grep TRIAGE_FRONTEND_HOSTNAME .env | cut -d= -f2)"
info "  Triage API:       https://$(grep TRIAGE_API_HOSTNAME .env | cut -d= -f2)"
info "  Monetix frontend: https://$(grep MONETIX_FRONTEND_HOSTNAME .env | cut -d= -f2)"
info "  Monetix API:      https://$(grep MONETIX_API_HOSTNAME .env | cut -d= -f2)"
info "  Keycloak:         https://$(grep KEYCLOAK_HOSTNAME .env | cut -d= -f2)"
