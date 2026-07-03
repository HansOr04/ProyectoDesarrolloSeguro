#!/usr/bin/env node
/**
 * Sprint 3 — Federación de usuarios
 * Lee usuarios de postgres (auth_db) y mongodb (monetix) y los crea en Keycloak
 * via Admin REST API.
 *
 * Uso:
 *   node migrate-users.js [--dry-run]
 *
 * Requiere que los contenedores estén corriendo:
 *   docker-compose up -d postgres mongodb keycloak
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { Client }   = require('pg');
const { MongoClient } = require('mongodb');

const DRY_RUN = process.argv.includes('--dry-run');

// ── Configuración ──────────────────────────────────────────────────────────────
const KC_URL      = process.env.KEYCLOAK_URL        || 'http://localhost:8180';
const KC_REALM    = process.env.KEYCLOAK_REALM       || 'universidad';
const KC_ADMIN    = process.env.KEYCLOAK_ADMIN       || 'admin';
const KC_PASS     = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin_secret_2024';

const PG_URL      = process.env.DATABASE_URL?.replace('/auth_db', '') || null;
const PG_AUTH_URL = `${PG_URL}/auth_db`;

const MONGO_URL   = process.env.MONGO_URI
  || `mongodb://${process.env.MONGO_USER || 'mongo_admin'}:${process.env.MONGO_PASSWORD || 'mongo_secret_2024'}@localhost:27017/monetix?authSource=admin`;

// Rol Keycloak por tipo de fuente
const TRIAGE_ROLE_MAP = {
  admin:   'admin',
  doctor:  'doctor',
  patient: 'patient',
};
const MONETIX_ROLE_MAP = {
  admin: 'monetix-admin',
  user:  'monetix-user',
};

// ── Keycloak Admin API ─────────────────────────────────────────────────────────
async function getAdminToken() {
  const res = await fetch(`${KC_URL}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id:  'admin-cli',
      username:   KC_ADMIN,
      password:   KC_PASS,
    }),
  });
  if (!res.ok) throw new Error(`Keycloak auth failed: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

async function getExistingUsernames(token) {
  const res = await fetch(
    `${KC_URL}/admin/realms/${KC_REALM}/users?max=1000`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Could not list KC users: ${await res.text()}`);
  const users = await res.json();
  return new Set(users.map(u => u.username));
}

async function getRoleId(token, roleName) {
  const res = await fetch(
    `${KC_URL}/admin/realms/${KC_REALM}/roles/${roleName}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  const role = await res.json();
  return role;
}

async function createKeycloakUser(token, user) {
  if (DRY_RUN) {
    console.log(`[DRY-RUN] Would create: ${user.username} (${user.email}) roles=${user.realmRoles}`);
    return null;
  }
  const res = await fetch(`${KC_URL}/admin/realms/${KC_REALM}/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username:      user.username,
      email:         user.email,
      firstName:     user.firstName || '',
      lastName:      user.lastName  || '',
      enabled:       true,
      emailVerified: true,
      credentials: [
        { type: 'password', value: user.temporaryPassword, temporary: true }
      ],
      requiredActions: user.requiresMfa ? ['CONFIGURE_TOTP'] : [],
    }),
  });

  if (res.status === 409) {
    console.log(`  [SKIP] Already exists: ${user.username}`);
    return null;
  }
  if (!res.ok) {
    console.error(`  [ERROR] Failed to create ${user.username}: ${await res.text()}`);
    return null;
  }

  // Obtener ID del usuario recién creado
  const location = res.headers.get('Location');
  const userId = location?.split('/').pop();
  return userId;
}

async function assignRoles(token, userId, roleNames) {
  const roles = [];
  for (const roleName of roleNames) {
    const role = await getRoleId(token, roleName);
    if (role) roles.push({ id: role.id, name: role.name });
  }
  if (!roles.length) return;

  const res = await fetch(
    `${KC_URL}/admin/realms/${KC_REALM}/users/${userId}/role-mappings/realm`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(roles),
    }
  );
  if (!res.ok) {
    console.error(`  [ERROR] Could not assign roles to ${userId}: ${await res.text()}`);
  }
}

// ── Leer usuarios de PostgreSQL (auth_db) ──────────────────────────────────────
async function fetchTriageUsers() {
  const client = new Client({ connectionString: PG_AUTH_URL });
  try {
    await client.connect();
    const { rows } = await client.query(
      `SELECT id, email, nombre AS first_name, apellido AS last_name, role, created_at FROM users WHERE is_active = true ORDER BY created_at`
    );
    return rows;
  } catch (err) {
    console.warn('[WARN] Could not read triage users from postgres:', err.message);
    return [];
  } finally {
    await client.end();
  }
}

// ── Leer usuarios de MongoDB (monetix) ────────────────────────────────────────
async function fetchMonetixUsers() {
  const client = new MongoClient(MONGO_URL);
  try {
    await client.connect();
    const db = client.db('monetix');
    const users = await db.collection('users').find({}, {
      projection: { _id: 1, username: 1, email: 1, name: 1, role: 1, createdAt: 1 }
    }).toArray();
    return users;
  } catch (err) {
    console.warn('[WARN] Could not read monetix users from mongodb:', err.message);
    return [];
  } finally {
    await client.close();
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔐 Federación de usuarios → Keycloak realm "${KC_REALM}"`);
  console.log(`   Keycloak: ${KC_URL}`);
  if (DRY_RUN) console.log('   Modo: DRY-RUN (no se crearán usuarios)\n');

  // Token de admin
  let token;
  try {
    token = await getAdminToken();
    console.log('✅ Token de administrador obtenido\n');
  } catch (err) {
    console.error('❌ No se pudo conectar a Keycloak:', err.message);
    console.error('   Verifica que Keycloak esté corriendo en', KC_URL);
    process.exit(1);
  }

  const existing = await getExistingUsernames(token);
  console.log(`   Usuarios ya en Keycloak: ${existing.size}\n`);

  let created = 0, skipped = 0, errors = 0;

  // ── Migrar usuarios de Triage (postgres) ──
  console.log('─── Triage (PostgreSQL → auth_db) ───────────────────────────');
  const triageUsers = await fetchTriageUsers();
  console.log(`   Encontrados: ${triageUsers.length} usuarios\n`);

  for (const u of triageUsers) {
    const username = u.username || u.email.split('@')[0];
    if (existing.has(username)) { skipped++; continue; }

    const roleKey  = (u.role || '').toLowerCase();
    const kcRole   = TRIAGE_ROLE_MAP[roleKey] || 'patient';
    const requiresMfa = ['admin', 'doctor'].includes(roleKey);

    console.log(`  → ${username} (${u.email}) role=${kcRole} mfa=${requiresMfa}`);
    const userId = await createKeycloakUser(token, {
      username,
      email:             u.email,
      firstName:         u.first_name || '',
      lastName:          u.last_name  || '',
      realmRoles:        [kcRole],
      requiresMfa,
      temporaryPassword: 'Temp1234!',
    });

    if (userId) {
      await assignRoles(token, userId, [kcRole]);
      existing.add(username);
      created++;
      console.log(`     ✅ Creado (id=${userId})`);
    } else if (!DRY_RUN) {
      errors++;
    }
  }

  // ── Migrar usuarios de Monetix (mongodb) ──
  console.log('\n─── Monetix (MongoDB) ───────────────────────────────────────');
  const monetixUsers = await fetchMonetixUsers();
  console.log(`   Encontrados: ${monetixUsers.length} usuarios\n`);

  for (const u of monetixUsers) {
    const nameParts = (u.name || '').split(' ');
    const username  = u.username || u.email.split('@')[0];
    if (existing.has(username)) { skipped++; continue; }

    const kcRole    = MONETIX_ROLE_MAP[u.role] || 'monetix-user';
    const requiresMfa = u.role === 'admin';

    console.log(`  → ${username} (${u.email}) role=${kcRole} mfa=${requiresMfa}`);
    const userId = await createKeycloakUser(token, {
      username,
      email:             u.email,
      firstName:         nameParts[0] || '',
      lastName:          nameParts.slice(1).join(' ') || '',
      realmRoles:        [kcRole],
      requiresMfa,
      temporaryPassword: 'Temp1234!',
    });

    if (userId) {
      await assignRoles(token, userId, [kcRole]);
      existing.add(username);
      created++;
      console.log(`     ✅ Creado (id=${userId})`);
    } else if (!DRY_RUN) {
      errors++;
    }
  }

  // ── Resumen ──
  console.log('\n══════════════════════════════════════════════');
  console.log(`  Creados:  ${created}`);
  console.log(`  Omitidos: ${skipped} (ya existían)`);
  console.log(`  Errores:  ${errors}`);
  if (created > 0) {
    console.log('\n  ⚠️  Contraseña temporal asignada: Temp1234!');
    console.log('     Los usuarios deben cambiarla en el primer login.');
  }
  console.log('══════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
