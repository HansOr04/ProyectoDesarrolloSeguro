import { Page } from '@playwright/test';

export const TRIAGE_URL = 'http://localhost:3000';
export const MONETIX_URL = 'http://localhost:5173';

export async function loginTriageSSO(page: Page, email: string, password: string) {
  await page.goto(`${TRIAGE_URL}/login`);
  await page.getByRole('button', { name: 'Iniciar sesión con SSO (Universidad)' }).click();
  await page.waitForURL(/\/realms\/universidad\/protocol\/openid-connect\/auth/);
  await page.locator('#username').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#kc-login').click();
  await page.waitForURL((url) => !url.toString().includes('keycloak'), { timeout: 15_000 });
}

export async function loginMonetixSSO(page: Page, email: string, password: string) {
  await page.goto(`${MONETIX_URL}/login`);
  await page.getByRole('button', { name: 'INICIAR CON SSO (UNIVERSIDAD)' }).click();
  await page.waitForURL(/\/realms\/universidad\/protocol\/openid-connect\/auth/);
  await page.locator('#username').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#kc-login').click();
  await page.waitForURL((url) => !url.toString().includes('keycloak'), { timeout: 15_000 });
}
