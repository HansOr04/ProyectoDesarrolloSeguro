import { Page } from '@playwright/test';
import path from 'node:path';

export const SHOTS_DIR = path.join(__dirname, '..', '..', 'screenshots');

export async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SHOTS_DIR, `${name}.png`) });
}
