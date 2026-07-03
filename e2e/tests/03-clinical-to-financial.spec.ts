import { test, expect, request as playwrightRequest } from '@playwright/test';
import crypto from 'node:crypto';
import { loginMonetixSSO, MONETIX_URL } from './helpers/sso';
import { shot } from './helpers/report';

// Paciente e2e-dual@test.com, ya registrado en patient-service con este id fijo.
const PATIENT_ID = '8289576f-63fc-4d04-b606-07ace4c25759';
const DUAL = { email: 'e2e-dual@test.com', password: 'E2eDual123!' };

const TRIAGE_API = 'http://localhost:5003';
const APPOINTMENT_API = 'http://localhost:5004';

// Respuestas fijas que el motor de clasificación siempre resuelve como VERDE
// (score 9) -> $40, categoría "Salud". Ver MONTO_POR_CLASIFICACION en
// triage-service/src/services/monetix.service.js.
const FIXED_RESPONSES = [
  { question_id: 1, answer_value: 'No' },
  { question_id: 2, answer_value: 2 },
  { question_id: 3, answer_value: 'No' },
  { question_id: 4, answer_value: 'No' },
  { question_id: 5, answer_value: '6-24 horas' },
  { question_id: 6, answer_value: [] },
  { question_id: 7, answer_value: 'No' },
  { question_id: 8, answer_value: 'No' },
];

const EXPECTED_DESCRIPTION = 'Consulta de triage completada — clasificación VERDE';
const EXPECTED_AMOUNT = '-$40.00';

// NOTA: no existe en la UI de Triage un flujo para crear una Appointment desde
// una pantalla de triage (el botón "Iniciar Teleconsulta" en TriageDetailsPage
// navega a /teleconsult/new, una ruta que no está registrada en App.jsx), así
// que este paso del flujo clínico (crear cita + marcarla COMPLETADA) se dispara
// vía llamadas directas a las APIs reales de triage-service/appointment-service
// — exactamente lo que el botón "Finalizar Consulta" del doctor termina haciendo
// internamente. La verificación del resultado financiero sí se hace 100% por UI
// real en Monetix, con sesión SSO genuina.
test('Triage ATENDIDO genera automáticamente un gasto en Monetix para el mismo paciente', async ({ page }) => {
  const api = await playwrightRequest.newContext();

  const classifyRes = await api.post(`${TRIAGE_API}/classify`, {
    data: { patient_id: PATIENT_ID, responses: FIXED_RESPONSES },
  });
  expect(classifyRes.ok()).toBeTruthy();
  const classifyBody = await classifyRes.json();
  const triageId = classifyBody.data.triage_id;
  expect(classifyBody.data.classification).toBe('VERDE');

  // Doctor y fecha/hora únicos por corrida para no chocar con citas de
  // ejecuciones anteriores del test (appointment-service rechaza dobles
  // reservas para el mismo doctor en el mismo horario).
  const doctorId = crypto.randomUUID();
  const randomDayOffset = Math.floor(Math.random() * 1000);
  const scheduledDate = new Date(Date.UTC(2031, 0, 1));
  scheduledDate.setUTCDate(scheduledDate.getUTCDate() + randomDayOffset);
  const apptRes = await api.post(`${APPOINTMENT_API}/`, {
    data: {
      patient_id: PATIENT_ID,
      doctor_id: doctorId,
      triage_id: triageId,
      scheduled_date: scheduledDate.toISOString().slice(0, 10),
      scheduled_time: '10:00:00',
      reason: 'E2E Playwright - flujo clínico-financiero',
    },
  });
  expect(apptRes.ok()).toBeTruthy();
  const appointmentId = (await apptRes.json()).data.id;

  // Equivalente a que el doctor presione "Finalizar Consulta" en TeleconsultPage.
  const completeRes = await api.patch(`${APPOINTMENT_API}/${appointmentId}/status`, {
    data: { status: 'COMPLETADA', notes: 'E2E Playwright' },
  });
  expect(completeRes.ok()).toBeTruthy();

  // Da tiempo a la cadena de eventos asíncrona:
  // appointment.completed -> (RabbitMQ) -> triage-service marca ATENDIDO
  // -> notifyConsulta cifra vía Vault Transit -> POST a monetix-backend -> Transaction.
  await page.waitForTimeout(4000);

  const triageStatusRes = await api.get(`${TRIAGE_API}/${triageId}`);
  const triageStatus = (await triageStatusRes.json()).data.status;
  expect(triageStatus).toBe('ATENDIDO');

  // Verificación 100% por UI real: login SSO en Monetix como el mismo paciente
  // y comprobar que el gasto aparece en su lista de transacciones.
  await loginMonetixSSO(page, DUAL.email, DUAL.password);
  await expect(page).toHaveURL(`${MONETIX_URL}/`);
  await shot(page, '08-dual_login_monetix_post_atencion');

  // Navegación SPA (no page.goto) para no forzar un remount de Keycloak con
  // check-sso, que puede ser lento/inestable en navegador headless.
  await page.getByRole('link', { name: 'Transacciones' }).click();
  await expect(page).toHaveURL(`${MONETIX_URL}/transactions`);
  await expect(page.getByText(EXPECTED_DESCRIPTION).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(EXPECTED_AMOUNT).first()).toBeVisible();
  await shot(page, '09-gasto_automatico_visible_en_monetix');

  await api.dispose();
});
