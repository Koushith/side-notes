// Stills capture rig — drives the Electron app through a series of product
// states and writes one screenshot per state to public/shots/raw/*.png. These
// are then composed into Dribbble-style publishable images by Remotion stills.

import { _electron as electron, test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { seedDemoVault } from './seedVault';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../..');
const SHOTS_DIR = path.resolve(HERE, '../public/shots/raw');
const ELECTRON_MAIN =
  process.env.ELECTRON_APP_PATH ?? path.join(REPO_ROOT, 'dist-electron', 'main.js');

test('SideNotes v0.3.0 product stills', async () => {
  await fs.rm(SHOTS_DIR, { recursive: true, force: true });
  await fs.mkdir(SHOTS_DIR, { recursive: true });

  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sidenotes-stills-'));
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
  await window.waitForTimeout(800);

  // Dismiss onboarding + mark "what's new" as seen so the modals don't pop.
  await window.keyboard.press('Escape');
  await window.evaluate(() => {
    try {
      window.localStorage.setItem('second-brain.onboarding.v1', '1');
      window.localStorage.setItem('side.whats-new.seen', '0.3.0');
    } catch {}
  });
  await window.waitForTimeout(600);

  const hold = (ms: number) => window.waitForTimeout(ms);
  const shot = async (name: string) => {
    const p = path.join(SHOTS_DIR, `${name}.png`);
    await window.screenshot({ path: p, omitBackground: false, fullPage: false });
    console.log(`  📸 ${name}.png`);
    return p;
  };

  // Helper: focus a specific file by clicking the most-recently-rendered match.
  // Some sidebar names (Todos, 2026-05-22) appear multiple times — we use
  // .last() so we hit the dated file at the leaf rather than a folder header.
  const clickLast = async (text: string, ms = 1500) => {
    try {
      await window.getByText(text, { exact: true }).last().click({ timeout: ms });
    } catch {}
  };

  // ----- 01 · Hero — full app on welcome state ----------------------------
  await hold(400);
  await shot('01-hero');

  // ----- 02 · Today's daily note (streak + carry-forward) -----------------
  // Click the Today nav row in the sidebar — most reliable way to open it.
  try {
    await window.getByText('Today', { exact: true }).first().click({ timeout: 1500 });
  } catch {}
  await hold(1400);
  await shot('02-daily');

  // ----- 03a · Year/Month grouping — collapsed (default) view -------------
  // Capture the clean state first: only most-recent year/month open, the rest
  // are tidy collapsed rows. This is how the sidebar looks on launch.
  await hold(400);
  await shot('03a-grouping-collapsed');

  // ----- 03b · Year/Month grouping — expanded view ------------------------
  // Now expand March + April so the entire history is visible.
  await clickLast('March');
  await hold(400);
  await clickLast('April');
  await hold(700);
  await shot('03b-grouping-expanded');

  // ----- 04 · Todos file with checklist + progress bar --------------------
  // Open Daily Notes/Todos/2026-05-22.md by clicking the Todos folder first,
  // then the dated file inside (last match = the file, not the folder label).
  await clickLast('Todos');
  await hold(400);
  await clickLast('2026-05-22');
  await hold(1600);
  await shot('04-todo');

  // ----- 05 · Mermaid + image-rich note (drafts/v030-changes) -------------
  // Click the drafted blog post — folder names are unique enough at top-level.
  try {
    await window.getByText('drafts', { exact: true }).click({ timeout: 1500 });
    await hold(300);
    await window.getByText('v030-changes', { exact: true }).click({ timeout: 1500 });
  } catch {}
  await hold(2000);
  await shot('05-mermaid');

  // ----- 06 · Graph view --------------------------------------------------
  await window.keyboard.press('Meta+2');
  await hold(2400);
  await shot('06-graph');

  // ----- 07 · Command palette (captured WHILE open, before Escape) -------
  await window.keyboard.press('Meta+1');
  await hold(500);
  await window.keyboard.press('Meta+K');
  await hold(700);
  await window.keyboard.type('daily', { delay: 70 });
  await hold(900);
  await shot('07-palette');         // ← BEFORE Escape
  await window.keyboard.press('Escape');
  await hold(400);

  // ----- 08 · All notes view ---------------------------------------------
  try {
    await window.getByText('All notes', { exact: true }).first().click({ timeout: 1500 });
  } catch {}
  await hold(1200);
  await shot('08-allnotes');

  // ----- 09 · Themed delete confirm dialog --------------------------------
  // Right-click a daily note in the sidebar → click Delete → screenshot
  // while the themed dialog is open (don't actually confirm).
  await window.keyboard.press('Meta+1');
  await hold(400);
  try {
    // Right-click the topmost dated entry in Daily Notes
    const entry = window.getByText('2026-05-11', { exact: true }).last();
    await entry.click({ button: 'right', timeout: 1500 });
    await hold(500);
    await window.getByText('Delete', { exact: true }).first().click({ timeout: 1500 });
    await hold(600);
    await shot('09-dialog');
    // Dismiss
    await window.getByText('Cancel', { exact: true }).first().click({ timeout: 1500 });
  } catch {
    // Fall back to a plain editor shot
    await shot('09-dialog');
  }
  await hold(400);

  await app.close();

  // Sanity check
  const written = await fs.readdir(SHOTS_DIR);
  console.log(`\nCaptured ${written.length} screenshots to ${SHOTS_DIR}:`);
  written.forEach((f) => console.log(`  · ${f}`));
  expect(written.length).toBeGreaterThanOrEqual(8);
});
