// Script de un solo uso: genera los 3 tokens de analisis de proyecto en SonarQube
// usando la password admin ya vigente en .env, y los persiste en .env.
// No imprime ningun secreto completo en stdout.

const { chromium } = require('@playwright/test');
const fs = require('fs');

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

(async () => {
  const env = fs.readFileSync(ENV_PATH, 'utf8');
  const adminPw = env.match(/^SONARQUBE_ADMIN_PASSWORD=(.*)$/m)[1];

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${BASE_URL}/`);
  await page.waitForLoadState('networkidle');
  await page.fill('#login-input', 'admin');
  await page.fill('#password-input', adminPw);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(500);

  for (const proj of PROJECTS) {
    await page.goto(`${BASE_URL}/account/security`);
    await page.waitForLoadState('networkidle');
    await page.fill('#token-name', `${proj.key}-analysis-token`);

    await page.click('#react-select-2-placeholder');
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    const projectSelectId = await page.locator('#token-select-project').getAttribute('aria-describedby');
    await page.click(`#${projectSelectId}`);
    await page.waitForTimeout(400);
    const optionPrefix = projectSelectId.replace('-placeholder', '-option');
    await page.locator(`[id^="${optionPrefix}"]`, { hasText: proj.key }).click();
    await page.waitForTimeout(300);

    await page.click('button:has-text("Generate")');
    await page.waitForTimeout(1500);

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
  console.log('Tokens generados.');
})();
