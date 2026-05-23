#!/usr/bin/env node
// Render every Dribbble shot composition listed in src/shots/registry.ts to
// out/shots/<id>.png. Uses `remotion still` so each runs as a single-frame
// render and stays fast.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REMOTION_ROOT = path.resolve(HERE, '..');
const OUT_DIR = path.join(REMOTION_ROOT, 'out', 'shots');

// Pull the registry by transpile-importing the TS module via tsx loader.
// Simpler: read it as text and yank the ids out — registry is plain.
const registryTs = fs.readFileSync(path.join(REMOTION_ROOT, 'src/shots/registry.ts'), 'utf8');
const ids = [...registryTs.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);

if (ids.length === 0) {
  console.error('No shots found in src/shots/registry.ts');
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

console.log(`Rendering ${ids.length} Dribbble stills →`, OUT_DIR);
let ok = 0;
let failed = [];

for (const id of ids) {
  const outFile = path.join(OUT_DIR, `${id}.png`);
  const result = spawnSync(
    'npx',
    [
      'remotion',
      'still',
      'src/index.ts',
      id,
      outFile,
    ],
    { cwd: REMOTION_ROOT, stdio: 'inherit' }
  );
  if (result.status === 0) {
    ok++;
  } else {
    failed.push(id);
  }
}

console.log(`\nDone. ${ok}/${ids.length} rendered.`);
if (failed.length) {
  console.log('Failed:', failed.join(', '));
  process.exit(1);
}
