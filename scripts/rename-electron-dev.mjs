#!/usr/bin/env node
// Patches node_modules/electron/.../Info.plist so the macOS dock label and
// Cmd-Tab switcher read "SideNotes" instead of "Electron" while running `npm run dev`.
// electron-builder produces a properly-branded bundle for packaged builds — this
// script only addresses the in-development experience.
//
// Idempotent. macOS-only. Failure is non-fatal so it doesn't break installs.

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const APP_NAME = 'SideNotes';

if (process.platform !== 'darwin') {
  process.exit(0);
}

const plist = join(
  process.cwd(),
  'node_modules',
  'electron',
  'dist',
  'Electron.app',
  'Contents',
  'Info.plist'
);

if (!existsSync(plist)) {
  // Electron not installed yet (or installed in a hoisted location). Skip silently.
  process.exit(0);
}

function set(key, value) {
  // PlistBuddy is part of macOS — no extra deps required.
  try {
    execSync(`/usr/libexec/PlistBuddy -c "Set :${key} ${value}" "${plist}"`, {
      stdio: 'pipe',
    });
  } catch {
    // Key may not exist yet; try Add instead.
    try {
      execSync(
        `/usr/libexec/PlistBuddy -c "Add :${key} string ${value}" "${plist}"`,
        { stdio: 'pipe' }
      );
    } catch (err) {
      console.warn(`[rename-electron-dev] could not set ${key}:`, err.message);
    }
  }
}

set('CFBundleName', APP_NAME);
set('CFBundleDisplayName', APP_NAME);

// macOS caches Info.plist values per-bundle path. Touching the bundle's
// modification time invalidates the cache so the next launch reads our edits.
try {
  execSync(`touch "${join(plist, '..', '..')}"`);
} catch {
  /* best-effort */
}

console.log(`[rename-electron-dev] Electron bundle now identifies as "${APP_NAME}"`);
