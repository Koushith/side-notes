import { _electron as electron, test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { seedDemoVault } from './seedVault';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../..');
const OUT = path.resolve(REPO_ROOT, 'side-deck-web-shots');
const ELECTRON_MAIN =
  process.env.ELECTRON_APP_PATH ?? path.join(REPO_ROOT, 'dist-electron', 'main.js');

test('Capture hero screenshot in Paper light theme', async () => {
  await fs.mkdir(OUT, { recursive: true });

  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sidenotes-hero-'));
  const seeded = await seedDemoVault(tmpRoot);

  const app = await electron.launch({
    args: [ELECTRON_MAIN, `--user-data-dir=${seeded.userDataPath}`],
    env: { ...process.env, NODE_ENV: 'production' },
  });

  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');
  await app.evaluate(async ({ BrowserWindow }) => {
    const wins = BrowserWindow.getAllWindows();
    if (wins[0]) {
      wins[0].setBounds({ x: 0, y: 0, width: 1920, height: 1080 });
      wins[0].setMenuBarVisibility(false);
    }
  });
  await window.waitForTimeout(1000);

  // Dismiss onboarding
  await window.keyboard.press('Escape');
  await window.evaluate(() => {
    try {
      window.localStorage.setItem('second-brain.onboarding.v1', '1');
      window.localStorage.setItem('side.whats-new.seen', '0.4.0');
    } catch {}
  });
  await window.waitForTimeout(600);

  // Set Paper theme, light mode
  await window.evaluate(() => {
    try {
      const key = 'second-brain.ui';
      const raw = window.localStorage.getItem(key);
      const state = raw ? JSON.parse(raw) : {};
      state.state = state.state || {};
      state.state.themeKey = 'paper';
      state.state.mode = 'light';
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  });
  await window.reload();
  await window.waitForLoadState('domcontentloaded');
  await window.waitForTimeout(1200);
  await window.keyboard.press('Escape');
  await window.waitForTimeout(400);

  // Open today's daily note for a nice content-rich view
  try {
    await window.getByText('Today', { exact: true }).first().click({ timeout: 1500 });
  } catch {}
  await window.waitForTimeout(1400);

  // Take the screenshot
  const p = path.join(OUT, 'hero-paper.png');
  await window.screenshot({ path: p });
  console.log(`📸 hero-paper.png`);

  // Also take one of the journal note
  const domClick = async (text: string) => {
    await window.evaluate((t) => {
      const btns = Array.from(document.querySelectorAll('button'));
      const match = btns.find(b => b.textContent?.trim() === t);
      if (match) (match as HTMLButtonElement).click();
    }, text);
  };
  await domClick('journal');
  await window.waitForTimeout(500);
  await domClick('on-shipping-quietly');
  await window.waitForTimeout(2000);
  await window.screenshot({ path: path.join(OUT, 'hero-journal.png') });
  console.log(`📸 hero-journal.png`);

  await app.close();
  expect((await fs.readdir(OUT)).length).toBeGreaterThanOrEqual(1);
});
