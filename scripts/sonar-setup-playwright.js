// Script de un solo uso: configura SonarQube via UI real con Playwright.
// Lee la password temporal de recuperacion desde RECOVERY_PW (env var, nunca impresa).
// Genera password nueva + 3 tokens de proyecto, los escribe directo en .env.
// No imprime ningun secreto completo en stdout.

const { chromium } = require('@playwright/test');
const fs = require('fs');
const crypto = require('crypto');

const ENV_PATH = 'C:/proyecto/.env';
const BASE_URL = 'http://localhost:9000';

const PROJECTS = [
  { key: 'triage-remoto', envVar: 'SONAR_TOKEN_TRIAGE' },
  { key: 'monetix-backend', envVar: 'SONAR_TOKEN_MONETIX_BACKEND' },
  { key: 'monetix-frontend', envVar: 'SONAR_TOKEN_MONETIX_FRONTEND' },
];

function writeEnvVar(name, value) {
  let content = fs.readFileSync(ENV_PATH, 'utf8');
  const line = `${name}=${value}`;
  const re = new RegExp(`^${name}=.*$`, 'm');
  if (re.test(content)) {
    content = content.replace(re, line);
  } else {
    content = content.replace(/\n*$/, '\n') + `${line}\n`;
  }
  fs.writeFileSync(ENV_PATH, content, 'utf8');
}

async function selectReactOption(page, placeholderSelector, optionFilter) {
  await page.click(placeholderSelector);
  await page.waitForTimeout(300);
  if (optionFilter === null) {
    await page.keyboard.press('Enter'); // primer opcion (ya enfocada por defecto)
  } else {
    const ariaId = await page.locator(placeholderSelector.replace('#', '')).first().getAttribute('id');
  }
}

(async () => {
  const recoveryPw = process.env.RECOVERY_PW;
  if (!recoveryPw) throw new Error('RECOVERY_PW no definido');

  const newAdminPw = crypto.randomBytes(16).toString('hex');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // 1. Login con password temporal de recuperacion
  await page.goto(`${BASE_URL}/`);
  await page.waitForLoadState('networkidle');
  await page.fill('#login-input', 'admin');
  await page.fill('#password-input', recoveryPw);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(500);

  // 2. Cambio de password real via My Account > Security
  //    (si hay reset_password forzado, login redirige ahi; si no, vamos directo)
  if (!page.url().includes('reset_password')) {
    await page.goto(`${BASE_URL}/account/security`);
    await page.waitForLoadState('networkidle');
  }
  await page.fill('#old_password', recoveryPw);
  await page.fill('#password', newAdminPw);
  await page.fill('#password_confirmation', newAdminPw);
  await page.click('button:has-text("Update")');
  await page.waitForTimeout(800);

  writeEnvVar('SONARQUBE_ADMIN_PASSWORD', newAdminPw);
  console.log('Admin password actualizada y persistida en .env (valor no impreso).');

  // 3. Crear los 3 proyectos (Local project, Clean as You Code = general/default)
  for (const proj of PROJECTS) {
    await page.goto(`${BASE_URL}/projects/create`);
    await page.waitForLoadState('networkidle');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.getByRole('link', { name: 'Create a local project' }).click(),
    ]);
    await page.fill('#project-name', proj.key);
    await page.fill('#project-key', proj.key);
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(800);
    await page.locator('input[type=radio][value=general]').click();
    await page.waitForTimeout(300);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}),
      page.click('button:has-text("Create project")'),
    ]);
    await page.waitForTimeout(800);
    console.log(`Proyecto '${proj.key}' creado.`);
  }

  // 4. Generar un Project Analysis Token por proyecto
  for (const proj of PROJECTS) {
    await page.goto(`${BASE_URL}/account/security`);
    await page.waitForLoadState('networkidle');
    await page.fill('#token-name', `${proj.key}-analysis-token`);

    // Tipo: "Project Analysis Token" es la primera opcion (ya enfocada al abrir)
    await page.click('#react-select-2-placeholder');
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Proyecto: abrir el segundo react-select dinamico y elegir por texto exacto
    const projectSelectId = await page.locator('#token-select-project').getAttribute('aria-describedby');
    await page.click(`#${projectSelectId}`);
    await page.waitForTimeout(400);
    const optionPrefix = projectSelectId.replace('-placeholder', '-option');
    await page.locator(`[id^="${optionPrefix}"]`, { hasText: proj.key }).click();
    await page.waitForTimeout(300);

    await page.click('button:has-text("Generate")');
    await page.waitForTimeout(1200);

    const tokenEl = page.locator('.fs-mask code').first();
    const tokenValue = await tokenEl.textContent().catch(() => null);

    if (tokenValue && tokenValue.trim().length > 10) {
      const clean = tokenValue.trim();
      writeEnvVar(proj.envVar, clean);
      console.log(`Token para '${proj.key}' generado y guardado en ${proj.envVar} (primeros 4: ${clean.slice(0, 4)}, len: ${clean.length}).`);
    } else {
      throw new Error(`No se pudo extraer el token para '${proj.key}'.`);
    }
  }

  await browser.close();
  console.log('Configuracion de SonarQube completada.');
})();
