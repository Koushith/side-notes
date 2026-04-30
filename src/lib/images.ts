import { api } from '@/lib/api';

const EXT_FROM_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/avif': 'avif',
  'image/heic': 'heic',
};

export async function saveImageToVault(
  vaultPath: string,
  file: File,
  noteRel: string
): Promise<{ relPath: string; mdPath: string }> {
  const ext = EXT_FROM_MIME[file.type] ?? file.name.split('.').pop() ?? 'png';
  const ts = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .replace(/Z$/, '');
  const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 40) || 'image';
  const relPath = `assets/${baseName}-${ts}.${ext}`;
  const bytes = await file.arrayBuffer();
  await api.files.writeAsset(vaultPath, relPath, { type: 'buffer', bytes });
  // Build a markdown path relative to the active note so portable across moves.
  const mdPath = relativePath(noteRel, relPath);
  return { relPath, mdPath };
}

function relativePath(fromRel: string, toRel: string): string {
  const fromParts = fromRel.split('/').slice(0, -1);
  const toParts = toRel.split('/');
  let i = 0;
  while (i < fromParts.length && i < toParts.length - 1 && fromParts[i] === toParts[i]) i++;
  const up = fromParts.length - i;
  const rel = [...Array(up).fill('..'), ...toParts.slice(i)].join('/');
  return rel || toRel;
}
