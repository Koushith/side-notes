// Lightweight markdown helpers — extract wikilinks, tags, frontmatter.
// We store user content as plain markdown on disk and let TipTap render it.

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;
const WIKILINK_RE = /\[\[([^\]\n|]+?)(?:\|([^\]\n]+))?\]\]/g;
// Only count #tag if not part of a heading (line start with #), code, or url fragment
const TAG_RE = /(^|[\s(>])#([A-Za-z][A-Za-z0-9_\-/]{0,63})\b/g;

export interface ParsedNote {
  frontmatter: Record<string, unknown>;
  body: string;
  links: string[];
  tags: string[];
  title: string;
}

export function stripFrontmatter(raw: string): { fm: Record<string, unknown>; body: string } {
  const m = raw.match(FRONTMATTER_RE);
  if (!m) return { fm: {}, body: raw };
  const fmText = m[1];
  const body = raw.slice(m[0].length);
  const fm: Record<string, unknown> = {};
  for (const line of fmText.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (!key) continue;
    fm[key] = val.replace(/^["']|["']$/g, '');
  }
  return { fm, body };
}

export function extractLinks(body: string): string[] {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  // Skip code blocks
  const stripped = body.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
  while ((m = WIKILINK_RE.exec(stripped))) {
    out.add(m[1].trim());
  }
  return [...out];
}

export function extractTags(body: string): string[] {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  const stripped = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/^#+\s.*$/gm, ''); // strip markdown headings
  while ((m = TAG_RE.exec(stripped))) {
    out.add(m[2]);
  }
  return [...out];
}

export function deriveTitle(body: string, fallback: string): string {
  const m = body.match(/^#\s+(.+)$/m);
  if (m) return m[1].trim();
  return fallback;
}

export function parseNote(raw: string, fallbackTitle: string): ParsedNote {
  const { fm, body } = stripFrontmatter(raw);
  return {
    frontmatter: fm,
    body,
    links: extractLinks(body),
    tags: extractTags(body),
    title: typeof fm.title === 'string' && fm.title ? (fm.title as string) : deriveTitle(body, fallbackTitle),
  };
}

/** Resolve a wikilink target ("Foo" or "folder/Foo") against the vault index.
 *  Returns the relative path of the matched note, or null. */
export function resolveWikilink(target: string, files: { rel: string }[]): string | null {
  const norm = target.toLowerCase();
  // exact rel match
  const exact = files.find((f) => f.rel.replace(/\.md$/i, '').toLowerCase() === norm);
  if (exact) return exact.rel;
  // basename match
  const base = files.find(
    (f) =>
      f.rel
        .split(/[\\/]/)
        .pop()!
        .replace(/\.md$/i, '')
        .toLowerCase() === norm
  );
  return base?.rel ?? null;
}
