import { test, expect } from '@playwright/test';
import { loginTriageSSO, loginMonetixSSO, TRIAGE_URL, MONETIX_URL } from './helpers/sso';
import { shot } from './helpers/report';

// e2e-triage-only@test.com tiene el rol 'patient' (sin 'monetix-user').
// e2e-monetix-only@test.com tiene el rol 'monetix-user' (sin 'patient'/'doctor'/'admin').
const TRIAGE_ONLY = { email: 'e2e-triage-only@test.com', password: 'E2eTriage123!' };
const MONETIX_ONLY = { email: 'e2e-monetix-only@test.com', password: 'E2eMonetix123!' };

test.describe('Acceso a un solo sistema vía SSO', () => {
  test('usuario con rol patient entra a Triage', async ({ page }) => {
    await loginTriageSSO(page, TRIAGE_ONLY.email, TRIAGE_ONLY.password);
    await expect(page).toHaveURL(`${TRIAGE_URL}/dashboard`);
    await expect(page.getByText('Panel del Paciente')).toBeVisible();
    await shot(page, '01-triage-only_entra_a_triage');
  });

  test('usuario con rol monetix-user (sin patient/doctor/admin) es rechazado por el frontend de Triage', async ({ page }) => {
    await loginTriageSSO(page, MONETIX_ONLY.email, MONETIX_ONLY.password);
    // keycloakService.getUser() en Triage filtra por roles ['admin','doctor','patient'];
    // si no coincide ninguno, devuelve null y la ruta /dashboard redirige a /login.
    await expect(page).toHaveURL(`${TRIAGE_URL}/login`);
    await shot(page, '02-monetix-only_rechazado_por_triage');
  });

  test('usuario con rol monetix-user entra a Monetix', async ({ page }) => {
    await loginMonetixSSO(page, MONETIX_ONLY.email, MONETIX_ONLY.password);
    await expect(page).toHaveURL(`${MONETIX_URL}/`);
    await expect(page.getByText(/Bienvenido,/)).toBeVisible();
    await shot(page, '03-monetix-only_entra_a_monetix');
  });

  // getKeycloakUser() en Monetix ahora filtra por roles ['monetix-user','monetix-admin'],
  // igual que Triage filtra por ['admin','doctor','patient']. Un usuario "solo Triage"
  // (rol patient, sin monetix-user/monetix-admin) ya no puede entrar a Monetix.
  test('usuario "solo Triage" (sin rol monetix-user/monetix-admin) es rechazado por el frontend de Monetix', async ({ page }) => {
    await loginMonetixSSO(page, TRIAGE_ONLY.email, TRIAGE_ONLY.password);
    await expect(page).toHaveURL(`${MONETIX_URL}/login`);
    await shot(page, '04-triage-only_rechazado_por_monetix');
  });
});
