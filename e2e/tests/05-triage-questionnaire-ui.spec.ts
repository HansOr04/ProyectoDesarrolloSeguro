import { test, expect } from '@playwright/test';
import { loginTriageSSO, TRIAGE_URL } from './helpers/sso';
import { shot } from './helpers/report';

// e2e-triage-only@test.com tiene rol 'patient'. Mismas respuestas que
// FIXED_RESPONSES en spec 3 (clasifican VERDE, score 9); 'Ninguna' en la
// pregunta 6 tiene weight 0 en decisionTree.service.js, igual que el array
// vacío [] usado en el test API-only — por eso el resultado esperado es el mismo.
const TRIAGE_ONLY = { email: 'e2e-triage-only@test.com', password: 'E2eTriage123!' };

test('paciente completa el cuestionario de triage por la UI real y obtiene clasificación VERDE', async ({ page }) => {
  await loginTriageSSO(page, TRIAGE_ONLY.email, TRIAGE_ONLY.password);
  await expect(page).toHaveURL(`${TRIAGE_URL}/dashboard`);

  await page.getByRole('link', { name: /Iniciar Triage/ }).first().click();
  await expect(page).toHaveURL(`${TRIAGE_URL}/triage`);

  const nextButton = page.getByRole('button', { name: /Siguiente|Finalizar/ });

  // Q1: ¿Presenta dificultad para respirar? -> No
  await page.getByRole('button', { name: 'No', exact: true }).click();
  await shot(page, '19-triage_q1_respondida');
  await nextButton.click();

  // Q2: ¿Tiene dolor en el pecho? (scale 0-10) -> 2
  const slider = page.locator('input[type="range"]');
  await slider.evaluate((el: HTMLInputElement) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(el, '2');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.getByText('2', { exact: true })).toBeVisible();
  await shot(page, '20-triage_q2_respondida');
  await nextButton.click();

  // Q3: ¿Ha perdido el conocimiento recientemente? (boolean) -> No
  await page.getByRole('button', { name: 'No', exact: true }).click();
  await nextButton.click();

  // Q4: ¿Presenta fiebre? (conditional) -> No
  await page.getByRole('button', { name: 'No', exact: true }).click();
  await nextButton.click();

  // Q5: ¿Cuánto tiempo lleva con los síntomas? -> 6-24 horas
  await page.getByRole('button', { name: '6-24 horas' }).click();
  await nextButton.click();

  // Q6: ¿Tiene antecedentes de enfermedades crónicas? (multiple_choice) -> Ninguna
  await page.getByRole('button', { name: 'Ninguna' }).click();
  await shot(page, '21-triage_q6_respondida');
  await nextButton.click();

  // Q7: ¿Está tomando medicación actualmente? (conditional) -> No
  await page.getByRole('button', { name: 'No', exact: true }).click();
  await nextButton.click();

  // Q8 (última): ¿Los síntomas han empeorado en las últimas horas? -> No
  await page.getByRole('button', { name: 'No', exact: true }).click();
  await shot(page, '22-triage_q8_respondida_ultima');
  await page.getByRole('button', { name: 'Finalizar' }).click();

  await expect(page.getByText('Clasificación: VERDE')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Puntuación: 9 puntos')).toBeVisible();
  await shot(page, '23-triage_resultado_verde');
});
