# HashiCorp Vault — configuración modo servidor
# Almacenamiento persistente en filesystem (volumen Docker)
# TLS deshabilitado para desarrollo local — habilitar en producción

storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1

  # Producción: descomentar y montar los certificados como secrets de Docker/K8s
  # tls_cert_file = "/vault/certs/vault.crt"
  # tls_key_file  = "/vault/certs/vault.key"
}

api_addr = "http://0.0.0.0:8200"
ui       = true
