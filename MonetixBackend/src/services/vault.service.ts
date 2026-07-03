/**
 * Sprint 4 — Cliente Vault para MonetixBackend (TypeScript)
 * Provee: lectura de secrets KV y descifrado Transit para mensajes de Triage.
 *
 * IMPLEMENTACIÓN PARALELA INTENCIONAL
 * Este archivo y AplicacionesDistribuidas/shared/utils/vault.js implementan
 * la misma lógica de autenticación AppRole y renovación de token de forma
 * independiente. MonetixBackend es un proyecto TypeScript autónomo sin acceso
 * al directorio shared/ de Triage, por lo que no puede importar ese módulo.
 *
 * ⚠ Si modificas la lógica de autenticación AppRole, renovación de token o
 *   manejo de errores en este archivo, DEBES replicar el cambio manualmente en
 *   AplicacionesDistribuidas/shared/utils/vault.js y viceversa.
 */

const VAULT_ADDR     = process.env.VAULT_ADDR     || 'http://vault:8200';
const VAULT_TOKEN    = process.env.VAULT_TOKEN;
const VAULT_ROLE_ID  = process.env.VAULT_ROLE_ID;
const VAULT_SECRET_ID = process.env.VAULT_SECRET_ID;

let _token: string | null = VAULT_TOKEN || null;

async function _fetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = await getToken();
  const res = await fetch(`${VAULT_ADDR}${path}`, {
    ...options,
    headers: {
      'X-Vault-Token': token,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vault ${options.method || 'GET'} ${path} → ${res.status}: ${body}`);
  }
  return res.json();
}

async function getToken(): Promise<string> {
  if (_token) return _token;
  if (!VAULT_ROLE_ID || !VAULT_SECRET_ID) {
    throw new Error('Vault: falta VAULT_TOKEN o VAULT_ROLE_ID+VAULT_SECRET_ID');
  }
  const res = await fetch(`${VAULT_ADDR}/v1/auth/approle/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role_id: VAULT_ROLE_ID, secret_id: VAULT_SECRET_ID }),
  });
  if (!res.ok) throw new Error(`Vault AppRole login failed: ${await res.text()}`);
  const data = await res.json() as { auth: { client_token: string; lease_duration: number } };
  _token = data.auth.client_token;
  const ttlMs = (data.auth.lease_duration - 60) * 1000;
  setTimeout(() => { _token = null; }, ttlMs > 0 ? ttlMs : 30_000);
  return _token;
}

export async function readSecret(secretPath: string): Promise<Record<string, string>> {
  const data = await _fetch(`/v1/secret/data/${secretPath}`);
  return data.data.data as Record<string, string>;
}

export async function encrypt(keyName: string, plaintext: string): Promise<string> {
  const b64 = Buffer.from(plaintext, 'utf8').toString('base64');
  const data = await _fetch(`/v1/transit/encrypt/${keyName}`, {
    method: 'POST',
    body: JSON.stringify({ plaintext: b64 }),
  });
  return data.data.ciphertext as string;
}

export async function decrypt(keyName: string, ciphertext: string): Promise<string> {
  const data = await _fetch(`/v1/transit/decrypt/${keyName}`, {
    method: 'POST',
    body: JSON.stringify({ ciphertext }),
  });
  return Buffer.from(data.data.plaintext as string, 'base64').toString('utf8');
}

/** Descifra un payload cifrado enviado por Triage usando Transit */
export async function decryptTriagePayload<T = unknown>(ciphertext: string): Promise<T> {
  const json = await decrypt('triage-monetix-channel', ciphertext);
  return JSON.parse(json) as T;
}

export const VaultService = {
  readSecret,
  encrypt,
  decrypt,
  decryptTriagePayload,
  getToken,
};
