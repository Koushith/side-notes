// Lightweight markdown helpers — extract wikilinks, tags, frontmatter.
// We store user content as plain markdown on disk and let TipTap render it.

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;
const WIKILINK_RE = /\[\[([^\]\n|]+?)(?:\|([^\]\n]+))?\]\]/g;
// Markdown link or image embed pointing at a local file: `[text](path.ext)` / `![alt](path.ext)` /
// `[text](path.ext "title")`. We accept both syntaxes so attachment-style references (images,
// `.pen`, `.base`, etc.) reach the graph as Obsidian-style ghost nodes.
const MD_LINK_RE = /!?\[[^\]\n]*\]\(([^)\s"]+)(?:\s+"[^"]*")?\)/g;
// File extensions Obsidian treats as graph-eligible — notes (md/mdx/etc), canvases, common attachments.
const LINKABLE_EXT_RE = /\.(md|markdown|mdx|mdown|mkd|mkdn|mdwn|canvas|base|pen|png|jpe?g|gif|webp|svg|pdf|mp3|mp4|webm|csv|json)$/i;
const MARKDOWN_EXT_RE = /\.(md|markdown|mdx|mdown|mkd|mkdn|mdwn)$/i;
// Only count #tag if not part of a heading (line start with #), code, or url fragment
const TAG_RE = /(^|[\s(>])#([A-Za-z][A-Za-z0-9_\-/]{0,63})\b/g;

/** Resolve a relative POSIX-style path (e.g. `../foo/bar`) against a base directory. */
function resolveRelPath(baseDir: string, rel: string): string {
  const parts = (baseDir ? baseDir.split('/') : []).concat(rel.split('/'));
  const out: string[] = [];
  for (const p of parts) {
    if (!p || p === '.') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  return out.join('/');
}

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

export function extractLinks(body: string, sourceRel?: string): string[] {
  const out = new Set<string>();
  // Skip code blocks before matching so fenced examples don't create false links.
  const stripped = body.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');

  // Wikilinks: [[Note]] or [[Note|alias]]
  WIKILINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = WIKILINK_RE.exec(stripped))) {
    out.add(m[1].trim());
  }

  // Markdown links to local .md files — Obsidian accepts both syntaxes interchangeably.
  // Resolve the captured path against the source file's directory so basename collisions
  // (e.g. two `02-products.md` in different folders) resolve to the right note.
  const srcDir = sourceRel && sourceRel.includes('/')
    ? sourceRel.slice(0, sourceRel.lastIndexOf('/'))
    : '';
  MD_LINK_RE.lastIndex = 0;
  while ((m = MD_LINK_RE.exec(stripped))) {
    const raw = m[1].trim();
    if (/^[a-z]+:\/\//i.test(raw) || raw.startsWith('mailto:')) continue;
    // Strip fragment + query, then URL-decode (`%20` → space).
    const noHash = raw.split('#')[0].split('?')[0];
    if (!noHash || !LINKABLE_EXT_RE.test(noHash)) continue;
    let decoded: string;
    try { decoded = decodeURIComponent(noHash); } catch { decoded = noHash; }
    const resolved = decoded.startsWith('/')
      ? decoded.replace(/^\/+/, '')
      : resolveRelPath(srcDir, decoded);
    // Drop only the markdown suffix — non-markdown attachments keep their extension so the
    // graph can show them as distinct ghost nodes (e.g. `Obsidian Reference.png`).
    out.add(MARKDOWN_EXT_RE.test(resolved) ? resolved.replace(MARKDOWN_EXT_RE, '') : resolved);
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

export function parseNote(raw: string, fallbackTitle: string, sourceRel?: string): ParsedNote {
  const { fm, body } = stripFrontmatter(raw);
  return {
    frontmatter: fm,
    body,
    links: extractLinks(body, sourceRel),
    tags: extractTags(body),
    title: typeof fm.title === 'string' && fm.title ? (fm.title as string) : deriveTitle(body, fallbackTitle),
  };
}

/** Resolve a wikilink target ("Foo" or "folder/Foo") against the vault index.
 *  Returns the relative path of the matched note, or null. */
export function resolveWikilink(target: string, files: { rel: string }[]): string | null {
  const norm = target.toLowerCase();
  // exact rel match
  const exact = files.find((f) => f.rel.replace(MARKDOWN_EXT_RE, '').toLowerCase() === norm);
  if (exact) return exact.rel;
  // basename match
  const base = files.find(
    (f) =>
      f.rel
        .split(/[\\/]/)
        .pop()!
        .replace(MARKDOWN_EXT_RE, '')
        .toLowerCase() === norm
  );
  return base?.rel ?? null;
}
