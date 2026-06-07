#!/usr/bin/env node
// Render a full release kit into out/<version>/:
//   out/<version>/cinematic.mp4
//   out/<version>/trailer.mp4
//   out/<version>/dribbble-shots/<id>.png   (every shot: registry + mocks)
//
// Usage:  node scripts/render-release.mjs [version] [--force]
//   version  defaults to the latest entry in RELEASES below
//   --force  re-render even if the output file already exists (default: skip)
//
// For a new release, add a RELEASES entry mapping the version to its cinematic
// and trailer composition ids, then run `npm run render-release`.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

// version -> composition ids for that release's video cuts.
const RELEASES = {
  '0.4.0': { cinematic: 'V040Cinematic', trailer: 'V040' },
  '0.3.0': { cinematic: 'V030Cinematic', trailer: 'V030' },
};

const args = process.argv.slice(2);
const force = args.includes('--force');
const version = args.find((a) => !a.startsWith('--')) || Object.keys(RELEASES)[0];
const rel = RELEASES[version];
if (!rel) {
  console.error(`Unknown version "${version}". Add it to RELEASES in scripts/render-release.mjs.`);
  console.error(`Known: ${Object.keys(RELEASES).join(', ')}`);
  process.exit(1);
}

const outDir = path.join(ROOT, 'out', `v${version}`);
const shotsDir = path.join(outDir, 'dribbble-shots');
fs.mkdirSync(shotsDir, { recursive: true });

// Collect every shot id from both the real-screenshot registry and the mock shots.
const idsFrom = (file) => {
  const txt = fs.readFileSync(path.join(ROOT, file), 'utf8');
  return [...txt.matchAll(/id:\s*'(shot-[^']+)'/g)].map((m) => m[1]);
};
const shotIds = [...new Set([...idsFrom('src/shots/registry.ts'), ...idsFrom('src/shots/mockShots.tsx')])];

const run = (label, compId, outFile, kind) => {
  if (!force && fs.existsSync(outFile)) {
    console.log(`skip  ${label} (exists)`);
    return true;
  }
  const sub = kind === 'video' ? ['render', compId, outFile, '--codec', 'h264', '--concurrency', '4'] : ['still', compId, outFile];
  console.log(`render ${label} ...`);
  const r = spawnSync('npx', ['remotion', ...sub], { cwd: ROOT, stdio: 'inherit' });
  return r.status === 0;
};

console.log(`\nRelease kit v${version} -> ${path.relative(ROOT, outDir)}\n`);
let ok = 0;
let total = 0;
const tick = (label, comp, file, kind) => {
  total++;
  if (run(label, comp, file, kind)) ok++;
  else console.error(`FAILED: ${label}`);
};

tick('cinematic.mp4', rel.cinematic, path.join(outDir, 'cinematic.mp4'), 'video');
tick('trailer.mp4', rel.trailer, path.join(outDir, 'trailer.mp4'), 'video');
for (const id of shotIds) {
  tick(`dribbble-shots/${id}.png`, id, path.join(shotsDir, `${id}.png`), 'still');
}

console.log(`\nDone. ${ok}/${total} rendered into out/v${version}/`);
process.exit(ok === total ? 0 : 1);
