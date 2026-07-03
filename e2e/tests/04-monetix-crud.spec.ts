import { test, expect } from '@playwright/test';
import { loginMonetixSSO, MONETIX_URL } from './helpers/sso';
import { shot } from './helpers/report';

// Mismo usuario dual que en spec 3, ya tiene rol monetix-user.
const DUAL = { email: 'e2e-dual@test.com', password: 'E2eDual123!' };

test.describe('CRUD real por UI en Monetix', () => {
  test.beforeEach(async ({ page }) => {
    await loginMonetixSSO(page, DUAL.email, DUAL.password);
    await expect(page).toHaveURL(`${MONETIX_URL}/`);
  });

  test('crear y eliminar una categoría', async ({ page }) => {
    const name = `E2E Categoría ${Date.now()}`;

    await page.getByRole('link', { name: 'Categorías' }).click();
    await expect(page).toHaveURL(`${MONETIX_URL}/categories`);

    await page.getByRole('button', { name: '+ Nueva Categoría' }).click();
    const modal = page.locator('.modal');
    await expect(modal).toBeVisible();

    await modal.locator('.form-group:has-text("Nombre") input').fill(name);
    await modal.locator('select').selectOption('expense');
    await modal.locator('.form-group:has-text("Icono") input').fill('🧪');
    await modal.locator('.form-group:has-text("Descripción") input').fill('Categoría creada por Playwright E2E');
    await shot(page, '10-categoria_modal_completo');
    await modal.getByRole('button', { name: 'Crear' }).click();

    await expect(modal).not.toBeVisible();
    await expect(page.getByText(name).first()).toBeVisible();
    await shot(page, '11-categoria_creada_en_tabla');

    const row = page.locator('tr', { hasText: name }).first();
    page.once('dialog', (d) => d.accept());
    await row.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByText(name)).toHaveCount(0);
    await shot(page, '12-categoria_eliminada');
  });

  test('crear y eliminar una meta', async ({ page }) => {
    const name = `E2E Meta ${Date.now()}`;

    await page.getByRole('link', { name: 'Mis Metas' }).click();
    await expect(page).toHaveURL(`${MONETIX_URL}/goals`);

    await page.getByRole('button', { name: /Nueva Meta/ }).first().click();
    const modal = page.locator('.modal');
    await expect(modal).toBeVisible();

    await modal.locator('.form-group:has-text("Nombre") input').fill(name);
    await modal.locator('.form-group:has-text("Monto Objetivo") input').fill('500');
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + 6);
    await modal.locator('.form-group:has-text("Fecha Límite") input').fill(targetDate.toISOString().split('T')[0]);
    await shot(page, '13-meta_modal_completo');
    await modal.getByRole('button', { name: 'Crear' }).click();

    await expect(modal).not.toBeVisible();
    await expect(page.getByText(name)).toBeVisible();
    await shot(page, '14-meta_creada_en_tarjeta');

    const card = page.locator('.goal-card', { hasText: name });
    page.once('dialog', (d) => d.accept());
    await card.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByText(name)).not.toBeVisible();
    await shot(page, '15-meta_eliminada');
  });

  test('crear y eliminar una transacción manual', async ({ page }) => {
    const description = `E2E Transacción ${Date.now()}`;

    await page.getByRole('link', { name: 'Transacciones' }).click();
    await expect(page).toHaveURL(`${MONETIX_URL}/transactions`);

    await page.getByRole('button', { name: '+ Nueva Transacción' }).click();
    const modal = page.locator('.modal');
    await expect(modal).toBeVisible();

    await modal.locator('.form-group:has-text("Monto") input').fill('15.50');
    // El <select> de Categoría solo lista categorías de tipo "expense" (default ya
    // seleccionado en "Tipo"); cualquiera que exista sirve, se toma la primera real.
    await modal.locator('.form-group:has-text("Categoría") select').selectOption({ index: 1 });
    await modal.locator('.form-group:has-text("Descripción") input').fill(description);
    await shot(page, '16-transaccion_modal_completo');
    await modal.getByRole('button', { name: 'Crear' }).click();

    await expect(modal).not.toBeVisible();
    await expect(page.getByText(description).first()).toBeVisible();
    await shot(page, '17-transaccion_creada_en_tabla');

    const row = page.locator('tr', { hasText: description }).first();
    page.once('dialog', (d) => d.accept());
    await row.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByText(description)).toHaveCount(0);
    await shot(page, '18-transaccion_eliminada');
  });
});
