import { test, expect, request as playwrightRequest } from '@playwright/test';
import { execSync } from 'node:child_process';

// Regresión del bug real: nginx (api-gateway) resolvía los hostnames de sus
// `upstream` una sola vez al arrancar. Si triage-service/appointment-service
// se reiniciaban después del gateway, su IP de Docker cambiaba y nginx se
// quedaba apuntando a la IP vieja -> 502 Bad Gateway (que el navegador
// reportaba como un bloqueo de CORS, porque el error_page de nginx no lleva
// los headers CORS). Corregido en nginx.conf con `resolver 127.0.0.11` +
// variables en cada `proxy_pass`, forzando a nginx a re-resolver DNS por
// request en vez de cachear la IP del arranque.
//
// Este test reinicia los contenedores backend (NO el gateway) y verifica que
// el gateway sigue respondiendo sin 502, demostrando que sobrevive al
// reinicio sin intervención manual.
test('el gateway sigue funcionando tras reiniciar triage-service/appointment-service, sin reiniciar el gateway', async () => {
  execSync('docker restart triage-triage-service triage-appointment-service', { stdio: 'pipe' });

  // Espera a que ambos healthchecks reporten "healthy" antes de pegarle al gateway.
  for (const container of ['triage-triage-service', 'triage-appointment-service']) {
    let healthy = false;
    for (let i = 0; i < 20 && !healthy; i++) {
      const status = execSync(`docker inspect -f "{{.State.Health.Status}}" ${container}`).toString().trim();
      healthy = status === 'healthy';
      if (!healthy) await new Promise((r) => setTimeout(r, 1000));
    }
    expect(healthy).toBeTruthy();
  }

  const api = await playwrightRequest.newContext();

  const triageRes = await api.post('http://localhost:8000/api/triage/classify', {
    headers: { Origin: 'http://localhost:3000' },
    data: { patient_id: 'gateway-resilience-test', responses: [] },
  });
  // 400 (validación) es la respuesta esperada de la app; lo que NO debe
  // pasar es un 502 (el gateway no pudo ni conectar con el backend).
  expect(triageRes.status()).not.toBe(502);
  expect(triageRes.headers()['access-control-allow-origin']).toBe('http://localhost:3000');

  const appointmentsRes = await api.get('http://localhost:8000/api/appointments?patient_id=gateway-resilience-test', {
    headers: { Origin: 'http://localhost:3000' },
  });
  expect(appointmentsRes.status()).not.toBe(502);

  await api.dispose();
});
