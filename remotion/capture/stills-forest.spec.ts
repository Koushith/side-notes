import { _electron as electron, test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { seedDemoVault } from './seedVault';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../..');
const SHOTS_DIR = path.resolve(HERE, '../../side-deck-web-shots');
const ELECTRON_MAIN =
  process.env.ELECTRON_APP_PATH ?? path.join(REPO_ROOT, 'dist-electron', 'main.js');

test('SideNotes Forest theme stills for website', async () => {
  await fs.rm(SHOTS_DIR, { recursive: true, force: true });
  await fs.mkdir(SHOTS_DIR, { recursive: true });

  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sidenotes-forest-'));
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

  // Switch to Forest theme, light mode
  await window.evaluate(() => {
    try {
      const key = 'second-brain.ui';
      const raw = window.localStorage.getItem(key);
      const state = raw ? JSON.parse(raw) : {};
      state.state = state.state || {};
      state.state.themeKey = 'forest';
      state.state.mode = 'light';
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  });
  // Reload to apply theme
  await window.reload();
  await window.waitForLoadState('domcontentloaded');
  await window.waitForTimeout(1200);

  // Dismiss onboarding again after reload
  await window.keyboard.press('Escape');
  await window.waitForTimeout(400);

  const hold = (ms: number) => window.waitForTimeout(ms);
  const shot = async (name: string) => {
    const p = path.join(SHOTS_DIR, `${name}.png`);
    await window.screenshot({ path: p });
    console.log(`  📸 ${name}.png`);
  };

  // --- Hero: sidebar + welcome ---
  await shot('hero');

  // --- Daily note ---
  try {
    await window.getByText('Today', { exact: true }).first().click({ timeout: 1500 });
  } catch {}
  await hold(1400);
  await shot('daily');

  // --- Todos ---
  try {
    await window.getByText('Todos', { exact: true }).last().click({ timeout: 1500 });
    await hold(400);
    await window.getByText('2026-05-22', { exact: true }).last().click({ timeout: 1500 });
  } catch {}
  await hold(1400);
  await shot('todo');

  // --- Mermaid ---
  try {
    await window.getByText('drafts', { exact: true }).click({ timeout: 1500 });
    await hold(300);
    await window.getByText('v030-changes', { exact: true }).click({ timeout: 1500 });
  } catch {}
  await hold(2000);
  await shot('mermaid');

  // --- Graph ---
  await window.keyboard.press('Meta+2');
  await hold(2500);
  await shot('graph');

  // --- Command palette ---
  await window.keyboard.press('Meta+1');
  await hold(500);
  await window.keyboard.press('Meta+K');
  await hold(600);
  await window.keyboard.type('launch', { delay: 60 });
  await hold(800);
  await shot('palette');
  await window.keyboard.press('Escape');
  await hold(400);

  // --- Canvas ---
  try {
    await window.getByText('Launch plan', { exact: true }).first().click({ timeout: 1500 });
  } catch {}
  await hold(2200);
  await shot('canvas');

  // --- Journal ---
  const domClick = async (text: string, last = false) => {
    await window.evaluate(({ text, last }) => {
      const btns = Array.from(document.querySelectorAll('button'));
      const matches = btns.filter(b => b.textContent?.trim() === text);
      const t = last ? matches[matches.length - 1] : matches[0];
      if (t) (t as HTMLButtonElement).click();
    }, { text, last });
  };
  await domClick('journal');
  await hold(500);
  await domClick('on-shipping-quietly');
  await hold(2000);
  await shot('journal');

  // --- All notes ---
  try {
    await window.getByText('All notes', { exact: true }).first().click({ timeout: 1500 });
  } catch {}
  await hold(1200);
  await shot('allnotes');

  // --- Theme picker ---
  try {
    await window.locator('button[title="Theme & Mode"]').first().click({ timeout: 1500 });
    await hold(800);
    await shot('theme');
    await window.keyboard.press('Escape');
  } catch {}

  await app.close();

  const written = await fs.readdir(SHOTS_DIR);
  console.log(`\nCaptured ${written.length} Forest-theme screenshots to ${SHOTS_DIR}`);
  expect(written.length).toBeGreaterThanOrEqual(6);
});
