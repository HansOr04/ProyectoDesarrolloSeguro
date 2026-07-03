import { test, expect } from '@playwright/test';
import { loginTriageSSO, loginMonetixSSO, TRIAGE_URL, MONETIX_URL } from './helpers/sso';
import { shot } from './helpers/report';

// e2e-dual@test.com tiene ambos roles: 'patient' (Triage) y 'monetix-user' (Monetix).
const DUAL = { email: 'e2e-dual@test.com', password: 'E2eDual123!' };

test.describe('Mismo usuario SSO en ambos sistemas', () => {
  test('e2e-dual entra a Triage con su cuenta SSO', async ({ page }) => {
    await loginTriageSSO(page, DUAL.email, DUAL.password);
    await expect(page).toHaveURL(`${TRIAGE_URL}/dashboard`);
    await expect(page.getByText('Panel del Paciente')).toBeVisible();
    await shot(page, '05-dual_entra_a_triage');
  });

  test('el mismo usuario e2e-dual entra a Monetix con la misma cuenta SSO', async ({ page }) => {
    await loginMonetixSSO(page, DUAL.email, DUAL.password);
    await expect(page).toHaveURL(`${MONETIX_URL}/`);
    await expect(page.getByText(/Bienvenido,/)).toBeVisible();
    await shot(page, '06-dual_entra_a_monetix');
  });

  test('cada app crea/usa su propia sesión sin pedir registro de cuenta nueva', async ({ browser }) => {
    // Dos contextos de navegador independientes (simula dos pestañas/sesiones distintas)
    // autenticados con el mismo usuario Keycloak, uno por sistema.
    const triageCtx = await browser.newContext();
    const monetixCtx = await browser.newContext();

    const triagePage = await triageCtx.newPage();
    const monetixPage = await monetixCtx.newPage();

    await loginTriageSSO(triagePage, DUAL.email, DUAL.password);
    await loginMonetixSSO(monetixPage, DUAL.email, DUAL.password);

    await expect(triagePage).toHaveURL(`${TRIAGE_URL}/dashboard`);
    await expect(monetixPage).toHaveURL(`${MONETIX_URL}/`);
    await shot(triagePage, '07a-sesion_independiente_triage');
    await shot(monetixPage, '07b-sesion_independiente_monetix');

    await triageCtx.close();
    await monetixCtx.close();
  });
});
