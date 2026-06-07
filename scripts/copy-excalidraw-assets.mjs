// Copies Excalidraw's self-hosted fonts into public/ so the app never reaches
// out to a CDN (our renderer CSP is `connect-src 'self'` and packaged builds run
// offline under file://). Excalidraw resolves font URLs as
// `${EXCALIDRAW_ASSET_PATH}fonts/<Family>/<file>`, and we point the asset path at
// the index.html directory, so the fonts must live at <served-root>/fonts/…
//
// Runs on postinstall + before build. Safe to run repeatedly.
import { cp, mkdir, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'node_modules/@excalidraw/excalidraw/dist/prod/fonts');
const dest = resolve(root, 'public/fonts');

try {
  await access(src);
} catch {
  // Excalidraw not installed (e.g. fresh clone before npm i finishes) — skip quietly.
  console.log('[excalidraw] fonts source not found, skipping copy');
  process.exit(0);
}

await mkdir(dirname(dest), { recursive: true });
await cp(src, dest, { recursive: true });
console.log(`[excalidraw] copied fonts → ${dest}`);
