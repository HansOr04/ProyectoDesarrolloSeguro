'use strict';
/**
 * Sprint 4 — Cliente Vault para microservicios de Triage
 * Provee: lectura de secrets KV y cifrado/descifrado vía Transit Engine
 */

const VAULT_ADDR  = process.env.VAULT_ADDR  || 'http://vault:8200';
const VAULT_TOKEN = process.env.VAULT_TOKEN;
const VAULT_ROLE_ID    = process.env.VAULT_ROLE_ID;
const VAULT_SECRET_ID  = process.env.VAULT_SECRET_ID;

let _token = VAULT_TOKEN || null;

async function _fetchVault(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${VAULT_ADDR}${path}`, {
    ...options,
    headers: {
      'X-Vault-Token': token,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vault ${options.method || 'GET'} ${path} → ${res.status}: ${body}`);
  }
  return res.json();
}

// Autentica con AppRole si no hay token directo
async function getToken() {
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
  const data = await res.json();
  _token = data.auth.client_token;
  // Renovar antes de que expire
  const ttlMs = (data.auth.lease_duration - 60) * 1000;
  setTimeout(() => { _token = null; }, ttlMs > 0 ? ttlMs : 30_000);
  return _token;
}

/**
 * Lee un secret del KV v2.
 * @param {string} secretPath  p.ej. "triage/database"
 * @returns {Promise<Record<string, string>>}
 */
async function readSecret(secretPath) {
  const data = await _fetchVault(`/v1/secret/data/${secretPath}`);
  return data.data.data;
}

/**
 * Cifra texto plano con una clave Transit.
 * @param {string} keyName  p.ej. "patient-data"
 * @param {string} plaintext  texto UTF-8 a cifrar
 * @returns {Promise<string>}  ciphertext Base64 de Vault
 */
async function encrypt(keyName, plaintext) {
  const b64 = Buffer.from(plaintext, 'utf8').toString('base64');
  const data = await _fetchVault(`/v1/transit/encrypt/${keyName}`, {
    method: 'POST',
    body: JSON.stringify({ plaintext: b64 }),
  });
  return data.data.ciphertext;
}

/**
 * Descifra un ciphertext de Vault Transit.
 * @param {string} keyName  clave usada al cifrar
 * @param {string} ciphertext  valor devuelto por encrypt()
 * @returns {Promise<string>}  texto plano UTF-8
 */
async function decrypt(keyName, ciphertext) {
  const data = await _fetchVault(`/v1/transit/decrypt/${keyName}`, {
    method: 'POST',
    body: JSON.stringify({ ciphertext }),
  });
  return Buffer.from(data.data.plaintext, 'base64').toString('utf8');
}

/**
 * Cifra un payload JSON para enviarlo entre Triage y Monetix.
 * Usa la clave "triage-monetix-channel".
 */
async function encryptInterServicePayload(payload) {
  return encrypt('triage-monetix-channel', JSON.stringify(payload));
}

/**
 * Descifra un payload recibido desde Triage en Monetix.
 */
async function decryptInterServicePayload(ciphertext) {
  const json = await decrypt('triage-monetix-channel', ciphertext);
  return JSON.parse(json);
}

module.exports = {
  readSecret,
  encrypt,
  decrypt,
  encryptInterServicePayload,
  decryptInterServicePayload,
  getToken,
};
