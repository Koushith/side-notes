// Playwright capture rig — drives the real Electron app through a scripted demo
// on a fresh fake vault and writes:
//   - public/captures/<id>.webm  (the recording)
//   - public/captures/beats.json (timestamp markers per beat for Remotion to crop)
//
// Run after building the renderer + electron bundle:
//   cd .. && npm run build
//   cd remotion && npm run capture
//
// Override the binary by setting ELECTRON_APP_PATH=/path/to/main.js if needed.

import { _electron as electron, test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { seedDemoVault } from './seedVault';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../..');
const CAPTURE_DIR = path.resolve(HERE, '../public/captures');
const ELECTRON_MAIN =
  process.env.ELECTRON_APP_PATH ?? path.join(REPO_ROOT, 'dist-electron', 'main.js');

interface Beat {
  id: string;
  label: string;
  startMs: number;
  endMs?: number;
}

test('SideNotes v0.3.0 live demo capture', async () => {
  await fs.mkdir(CAPTURE_DIR, { recursive: true });
  // Throwaway demo vault + isolated userData so we never touch the real settings.
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sidenotes-capture-'));
  const seeded = await seedDemoVault(tmpRoot);

  const app = await electron.launch({
    args: [
      ELECTRON_MAIN,
      `--user-data-dir=${seeded.userDataPath}`,
    ],
    env: {
      ...process.env,
      NODE_ENV: 'production',
    },
    recordVideo: { dir: CAPTURE_DIR, size: { width: 1920, height: 1080 } },
  });

  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');

  // Force exact window size for clean composite.
  await app.evaluate(async ({ BrowserWindow }) => {
    const wins = BrowserWindow.getAllWindows();
    if (wins[0]) {
      wins[0].setBounds({ x: 0, y: 0, width: 1920, height: 1080 });
      wins[0].setMenuBarVisibility(false);
    }
  });
  await window.waitForTimeout(800);

  // Dismiss the first-run onboarding overlay so it doesn't cover the demo.
  // Onboarding listens for Escape (src/components/Onboarding.tsx:26).
  // Sending Escape twice is safe — if any other modal is open it'll close that too.
  await window.keyboard.press('Escape');
  await window.waitForTimeout(150);
  await window.keyboard.press('Escape');
  // Also belt-and-suspenders: set the onboarding-complete flag in localStorage so
  // a re-render of the modal (race with hydration) can't pop it back up.
  await window.evaluate(() => {
    try {
      window.localStorage.setItem('second-brain.onboarding.v1', '1');
      window.localStorage.setItem('side.whats-new.seen', '0.3.0');
    } catch {
      /* ignore */
    }
  });
  await window.waitForTimeout(600);

  const captureStart = Date.now();
  const beats: Beat[] = [];
  const beat = (id: string, label: string) => {
    if (beats.length > 0 && beats[beats.length - 1].endMs === undefined) {
      beats[beats.length - 1].endMs = Date.now() - captureStart;
    }
    beats.push({ id, label, startMs: Date.now() - captureStart });
  };

  // Helper: pause without messing with focus.
  const hold = (ms: number) => window.waitForTimeout(ms);

  // ----- Beat 1: hero — sidebar + welcome ----------------------------------
  beat('hero', 'SideNotes · v0.3.0');
  await hold(2200);

  // ----- Beat 2: open today — see streak + carry-forward -------------------
  beat('today', "Today's note — streak + carry-forward");
  await window.keyboard.press('Meta+D');
  await hold(2600);

  // ----- Beat 3: type a thought, watch words count tick up -----------------
  beat('typing', 'Live word + task counts');
  await window.keyboard.press('Meta+ArrowDown');
  await window.keyboard.type('Shipping v0.3.0 today. Big day.', { delay: 36 });
  await hold(1200);
  // Toggle one of the carry-forward checkboxes by scrolling up + clicking
  await hold(800);

  // ----- Beat 4: virtual year/month grouping -------------------------------
  beat('grouping', 'Daily Notes auto-group by Year / Month');
  // Click on the Daily Notes folder in sidebar. We use a selector that matches
  // the rendered text. If it fails the beat still has a timestamp and Remotion
  // can fall back to a label-over-still.
  try {
    await window.click('text=Daily Notes', { timeout: 2000 });
  } catch {
    /* sidebar may already be open */
  }
  await hold(2400);

  // ----- Beat 5: open a dated todo file ------------------------------------
  beat('todo', 'Todo notes — progress + Add task');
  try {
    await window.click('text=Todos', { timeout: 2000 });
    await hold(600);
    await window.click('text=2026-05-22', { timeout: 2000 });
  } catch {
    /* no-op fallback */
  }
  await hold(2800);

  // ----- Beat 6: command palette ------------------------------------------
  beat('palette', 'Jump anywhere · ⌘K');
  await window.keyboard.press('Meta+K');
  await hold(800);
  await window.keyboard.type('launch', { delay: 50 });
  await hold(1400);
  await window.keyboard.press('Escape');
  await hold(400);

  // ----- Beat 7: graph view ------------------------------------------------
  beat('graph', 'Graph view');
  await window.keyboard.press('Meta+2');
  await hold(3200);

  // ----- Beat 8: back to editor — outro ------------------------------------
  beat('outro', 'Get SideNotes · v0.3.0');
  await window.keyboard.press('Meta+1');
  await hold(2200);

  // Close last beat
  beats[beats.length - 1].endMs = Date.now() - captureStart;

  // Snapshot the video path before closing so we can rename it
  const videoPath = await window.video()?.path();
  await app.close();

  // Find the actual recording (Playwright names it deterministically post-close).
  const files = await fs.readdir(CAPTURE_DIR);
  const webm = files.filter((f) => f.endsWith('.webm')).sort().pop();
  expect(webm, 'video file should exist').toBeTruthy();

  // Move to a stable filename for Remotion.
  if (webm) {
    const src = path.join(CAPTURE_DIR, webm);
    const dst = path.join(CAPTURE_DIR, 'live-demo.webm');
    await fs.rename(src, dst);
  }
  await fs.writeFile(path.join(CAPTURE_DIR, 'beats.json'), JSON.stringify(beats, null, 2));
  // Console output for the user.
  console.log('\nCapture complete:');
  console.log('  video:', path.join(CAPTURE_DIR, 'live-demo.webm'));
  console.log('  beats:', JSON.stringify(beats, null, 2));
  console.log('  video path (raw):', videoPath ?? '(unknown)');
});
