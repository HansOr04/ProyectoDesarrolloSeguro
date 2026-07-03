#!/bin/sh
# Sprint 4 — Inicialización de HashiCorp Vault (modo servidor)
# Maneja: inicialización, unseal, Transit Engine, KV, políticas y AppRole

set -e

VAULT_ADDR="${VAULT_ADDR:-http://vault:8200}"
INIT_FILE="/vault/data/.vault-init.json"

echo "Esperando que Vault esté disponible..."
# La imagen hashicorp/vault no trae curl instalado, así que no podemos depender de él.
# "vault status" devuelve 0 (unsealed) o 2 (sealed/uninitialized pero servidor alcanzable);
# solo el exit code 1 indica que el servidor no responde todavía.
until vault status -address="${VAULT_ADDR}" > /dev/null 2>&1; [ "$?" -ne 1 ]; do
  sleep 2
done
echo "Vault disponible"

# ── Inicialización (solo en primer arranque) ──────────────────────────────────
# OJO: "vault operator init -status" no es una bandera real del CLI (siempre fallaba
# y caía al fallback "false"), lo que provocaba reintentar "vault operator init" en
# cada arranque del contenedor y truncar $INIT_FILE con la salida de error.
# Detección correcta vía "vault status" (devuelve exit code 2 si está sellado, no es error).
INIT_STATUS=$(vault status -address="${VAULT_ADDR}" -format=json 2>/dev/null || true)
INITIALIZED=$(echo "$INIT_STATUS" | tr -d '\n' | grep -o '"initialized":[^,}]*' | cut -d: -f2 | tr -d ' "')

if [ "$INITIALIZED" != "true" ]; then
  echo "Primera ejecucion: inicializando Vault..."
  vault operator init \
    -address="${VAULT_ADDR}" \
    -key-shares=1 \
    -key-threshold=1 \
    -format=json > "$INIT_FILE"
  chmod 600 "$INIT_FILE"
  echo "Vault inicializado. Credenciales en $INIT_FILE (volumen vault_data — no commitear)"
fi

# Leer credenciales del archivo de inicialización
# tr -d '\n' aplana el JSON (vault -format=json puede imprimir el array en varias líneas,
# con espacios entre "[" y la comilla, p.ej. [    "valor"  ]) antes de extraer con sed.
INIT_FILE_FLAT=$(tr -d '\n' < "$INIT_FILE")
UNSEAL_KEY=$(echo "$INIT_FILE_FLAT" | sed -n 's/.*"unseal_keys_b64": *\[ *"\([^"]*\)".*/\1/p')
ROOT_TOKEN=$(echo "$INIT_FILE_FLAT" | sed -n 's/.*"root_token": *"\([^"]*\)".*/\1/p')
export VAULT_TOKEN="$ROOT_TOKEN"

# ── Unseal si está sellado ────────────────────────────────────────────────────
SEALED=$(vault status -address="${VAULT_ADDR}" -format=json 2>/dev/null | grep -o '"sealed":[^,}]*' | cut -d: -f2 | tr -d ' "')
if [ "$SEALED" = "true" ]; then
  echo "Desbloqueando Vault..."
  vault operator unseal -address="${VAULT_ADDR}" "$UNSEAL_KEY"
  echo "Vault desbloqueado"
fi

echo "Vault listo"

# ── Transit Engine ─────────────────────────────────────────────────────────────
echo "Habilitando Transit secrets engine..."
vault secrets enable -address="${VAULT_ADDR}" transit 2>/dev/null || echo "  Transit ya estaba habilitado"

vault write -address="${VAULT_ADDR}" -f transit/keys/triage-monetix-channel type=aes256-gcm96
echo "  Clave 'triage-monetix-channel' creada"

vault write -address="${VAULT_ADDR}" -f transit/keys/patient-data type=aes256-gcm96
echo "  Clave 'patient-data' creada"

vault write -address="${VAULT_ADDR}" -f transit/keys/inter-service-tokens type=aes256-gcm96
echo "  Clave 'inter-service-tokens' creada"

# ── KV Engine ─────────────────────────────────────────────────────────────────
echo "Habilitando KV secrets engine (v2)..."
vault secrets enable -address="${VAULT_ADDR}" -version=2 -path=secret kv 2>/dev/null || echo "  KV ya estaba habilitado"

vault kv put -address="${VAULT_ADDR}" secret/triage/database \
  postgres_user="${POSTGRES_USER:?POSTGRES_USER no definido}" \
  postgres_password="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD no definido}" \
  postgres_host="postgres" \
  postgres_port="5432"

vault kv put -address="${VAULT_ADDR}" secret/triage/jwt \
  jwt_secret="${TRIAGE_JWT_SECRET:?TRIAGE_JWT_SECRET no definido}" \
  jwt_expires_in="24h"

vault kv put -address="${VAULT_ADDR}" secret/monetix/database \
  mongo_user="${MONGO_USER:?MONGO_USER no definido}" \
  mongo_password="${MONGO_PASSWORD:?MONGO_PASSWORD no definido}" \
  mongo_host="mongodb" \
  mongo_port="27017"

vault kv put -address="${VAULT_ADDR}" secret/monetix/jwt \
  jwt_secret="${MONETIX_JWT_SECRET:?MONETIX_JWT_SECRET no definido}"

vault kv put -address="${VAULT_ADDR}" secret/shared/keycloak \
  url="${KEYCLOAK_ISSUER:?KEYCLOAK_ISSUER no definido}" \
  jwks_uri="${KEYCLOAK_JWKS_URI:?KEYCLOAK_JWKS_URI no definido}"

vault kv put -address="${VAULT_ADDR}" secret/shared/rabbitmq \
  user="${RABBITMQ_USER:?RABBITMQ_USER no definido}" \
  password="${RABBITMQ_PASSWORD:?RABBITMQ_PASSWORD no definido}" \
  host="rabbitmq" \
  port="5672"

echo "  Secrets de aplicacion almacenados"

# ── Políticas de acceso ────────────────────────────────────────────────────────
echo "Creando politicas de acceso..."

vault policy write -address="${VAULT_ADDR}" triage-policy - <<'EOF'
path "secret/data/triage/*" {
  capabilities = ["read"]
}
path "secret/data/shared/*" {
  capabilities = ["read"]
}
path "transit/encrypt/triage-monetix-channel" {
  capabilities = ["update"]
}
path "transit/encrypt/patient-data" {
  capabilities = ["update"]
}
path "transit/decrypt/patient-data" {
  capabilities = ["update"]
}
path "transit/encrypt/inter-service-tokens" {
  capabilities = ["update"]
}
path "transit/decrypt/inter-service-tokens" {
  capabilities = ["update"]
}
EOF
echo "  Politica 'triage-policy' creada"

vault policy write -address="${VAULT_ADDR}" monetix-policy - <<'EOF'
path "secret/data/monetix/*" {
  capabilities = ["read"]
}
path "secret/data/shared/*" {
  capabilities = ["read"]
}
path "transit/decrypt/triage-monetix-channel" {
  capabilities = ["update"]
}
EOF
echo "  Politica 'monetix-policy' creada"

# ── AppRole ───────────────────────────────────────────────────────────────────
echo "Configurando AppRole auth..."
vault auth enable -address="${VAULT_ADDR}" approle 2>/dev/null || echo "  AppRole ya estaba habilitado"

vault write -address="${VAULT_ADDR}" auth/approle/role/triage-role \
  token_policies="triage-policy" \
  token_ttl=1h \
  token_max_ttl=4h \
  secret_id_ttl=24h

vault write -address="${VAULT_ADDR}" auth/approle/role/monetix-role \
  token_policies="monetix-policy" \
  token_ttl=1h \
  token_max_ttl=4h \
  secret_id_ttl=24h

TRIAGE_ROLE_ID=$(vault read -address="${VAULT_ADDR}" -field=role_id auth/approle/role/triage-role/role-id)
TRIAGE_SECRET_ID=$(vault write -address="${VAULT_ADDR}" -field=secret_id -f auth/approle/role/triage-role/secret-id)

MONETIX_ROLE_ID=$(vault read -address="${VAULT_ADDR}" -field=role_id auth/approle/role/monetix-role/role-id)
MONETIX_SECRET_ID=$(vault write -address="${VAULT_ADDR}" -field=secret_id -f auth/approle/role/monetix-role/secret-id)

echo ""
echo "======================================================"
echo "Vault inicializado correctamente"
echo ""
echo "  Root token guardado en: $INIT_FILE (solo dentro del volumen)"
echo ""
echo "  AppRole — Triage:"
echo "    VAULT_ROLE_ID:    ${TRIAGE_ROLE_ID}"
echo "    VAULT_SECRET_ID:  [OMITIDO — consultar vault directamente o ver $INIT_FILE]"
echo ""
echo "  AppRole — Monetix:"
echo "    VAULT_ROLE_ID:    ${MONETIX_ROLE_ID}"
echo "    VAULT_SECRET_ID:  [OMITIDO — consultar vault directamente]"
echo ""
echo "  Agrega VAULT_ROLE_ID y VAULT_SECRET_ID al .env de cada servicio."
echo "======================================================"
