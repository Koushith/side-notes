import { useEffect, useMemo, useState } from 'react';
import { useVault } from '@/stores/vault';
import { api } from '@/lib/api';
import { resolveWikilink } from '@/lib/markdown';
import { basenameNoExt } from '@/lib/utils';

export function ConnectionsPanel() {
  const activeFile = useVault((s) => s.activeFile);
  const files = useVault((s) => s.files);
  const openFile = useVault((s) => s.openFile);
  const setSelectedTag = useVault((s) => s.setSelectedTag);

  const filesArr = useMemo(() => [...files.values()], [files]);
  const file = activeFile ? files.get(activeFile) ?? null : null;
  const targetName = (file?.title || file?.name || '').toLowerCase();

  const backlinks = useMemo(() => {
    if (!file || !activeFile) return [];
    return filesArr.filter((f) => {
      if (f.rel === activeFile) return false;
      return f.links.some((l) => {
        const lower = l.toLowerCase();
        if (lower === targetName) return true;
        const r = resolveWikilink(l, filesArr);
        return r === activeFile;
      });
    });
  }, [filesArr, activeFile, targetName, file]);

  const outgoing = useMemo(() => {
    if (!file) return [];
    const seen = new Set<string>();
    const out: { target: string; rel: string | null; vf: import('@/types').VaultFile | null }[] = [];
    for (const link of file.links) {
      const key = link.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const rel = resolveWikilink(link, filesArr);
      const vf = rel ? files.get(rel) ?? null : null;
      out.push({ target: link, rel, vf });
    }
    return out;
  }, [file, filesArr, files]);

  const [excerpts, setExcerpts] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!file) {
      setExcerpts({});
      return;
    }
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const bl of backlinks) {
        try {
          const raw = await api.files.read(bl.path);
          const line = findLinkingLine(raw, targetName);
          if (line) next[bl.rel] = line;
        } catch {
          /* skip */
        }
      }
      if (!cancelled) setExcerpts(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [backlinks, targetName, file]);

  if (!file || !activeFile) return null;
  const incomingCount = backlinks.length;
  const outgoingCount = outgoing.length;

  return (
    <aside className="w-[280px] shrink-0 border-l border-border bg-bg-elevated overflow-y-auto">
      <div className="px-4 pt-4 pb-3 border-b border-border-subtle">
        <div className="font-serif text-[14px] font-semibold text-text">Connections</div>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-text-muted mt-0.5">
          {incomingCount} incoming · {outgoingCount} outgoing
        </div>
      </div>

      {/* Linked from */}
      <Section label="Linked from" count={incomingCount}>
        {backlinks.length === 0 ? (
          <Empty>No backlinks yet.</Empty>
        ) : (
          <div className="flex flex-col gap-2 px-4 pb-4">
            {backlinks.map((bl) => (
              <button
                key={bl.rel}
                onClick={() => openFile(bl.rel)}
                className="text-left px-2.5 py-2 rounded-[6px] bg-bg border border-border hover:border-text-subtle transition-colors"
              >
                <div className="font-serif text-[13px] font-semibold text-text mb-1 leading-snug truncate">
                  {bl.title || bl.name}
                </div>
                {excerpts[bl.rel] ? (
                  <div className="font-serif text-[12px] leading-[1.55] text-text-muted">
                    "{renderExcerpt(excerpts[bl.rel], file.title || file.name)}"
                  </div>
                ) : (
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-text-subtle">
                    Loading…
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* Mentioned in this note */}
      <Section label="Mentioned in this note" count={outgoingCount}>
        {outgoing.length === 0 ? (
          <Empty>No outgoing links yet.</Empty>
        ) : (
          <div className="flex flex-col gap-2 px-4 pb-4">
            {outgoing.map((m) => (
              <button
                key={m.target}
                onClick={() => {
                  if (m.rel) openFile(m.rel);
                }}
                className="text-left px-2.5 py-2 rounded-[6px] bg-bg border border-border hover:border-text-subtle transition-colors"
              >
                <div className="font-serif text-[13px] font-semibold text-text leading-snug truncate">
                  {m.vf?.title || basenameNoExt(m.target)}
                </div>
                <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-text-subtle mt-0.5">
                  {m.vf
                    ? `${m.vf.tags.length} tag${m.vf.tags.length === 1 ? '' : 's'} · ${m.vf.links.length} link${m.vf.links.length === 1 ? '' : 's'}`
                    : 'Empty note · click to write'}
                </div>
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* Tags */}
      <Section label="Tags" count={file.tags.length}>
        {file.tags.length === 0 ? (
          <Empty>No tags on this note.</Empty>
        ) : (
          <div className="px-4 pb-5 flex flex-wrap gap-1.5">
            {file.tags.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTag(t)}
                className="font-mono text-[12px] text-tag bg-tag-soft px-1.5 py-[1px] rounded hover:brightness-95"
              >
                #{t}
              </button>
            ))}
          </div>
        )}
      </Section>
    </aside>
  );
}

function Section({
  label,
  count,
  children,
}: {
  label: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border-subtle">
      <div className="px-4 pt-3.5 pb-2 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.1em] text-text-muted">
        <span>{label}</span>
        {typeof count === 'number' && <span className="text-text-subtle">{count}</span>}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 pb-4 font-serif text-[12.5px] italic text-text-subtle">{children}</div>;
}

/** Find the first line in `md` that contains a `[[<target>]]` (or `[[<target>|...]]`)
 *  — case-insensitive — and return it as a clean snippet (no leading `#`, `-`, `>`). */
function findLinkingLine(md: string, target: string): string | null {
  const noFm = md.replace(/^---\n[\s\S]*?\n---\n?/, '');
  const re = new RegExp(`\\[\\[([^\\]\\n|]+?)(?:\\|[^\\]\\n]+)?\\]\\]`, 'gi');
  let inFence = false;
  for (const rawLine of noFm.split('\n')) {
    if (/^```/.test(rawLine)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(rawLine))) {
      if (m[1].trim().toLowerCase() === target.toLowerCase()) {
        return rawLine.replace(/^[ \t]*[#>*\-+]+[ \t]*/, '').trim().slice(0, 220);
      }
    }
  }
  return null;
}

/** Render a markdown line with `[[wikilinks]]` collapsed to display text and the
 *  substring matching `target` highlighted in sage. */
function renderExcerpt(line: string, target: string): React.ReactNode {
  const re = /\[\[([^\]\n|]+?)(?:\|([^\]\n]+))?\]\]/g;
  const parts: { kind: 'text' | 'hit'; value: string }[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m.index > last) parts.push({ kind: 'text', value: line.slice(last, m.index) });
    const link = m[1].trim();
    const display = (m[2]?.trim() || link).trim();
    const isHit = link.toLowerCase() === target.toLowerCase();
    parts.push({ kind: isHit ? 'hit' : 'text', value: display });
    last = m.index + m[0].length;
  }
  if (last < line.length) parts.push({ kind: 'text', value: line.slice(last) });
  if (parts.length === 0) parts.push({ kind: 'text', value: line });

  return parts.map((p, i) =>
    p.kind === 'hit' ? (
      <mark key={i} className="bg-tag-soft text-tag rounded-[2px] px-[3px] py-[1px] font-medium">
        {p.value}
      </mark>
    ) : (
      <span key={i}>{p.value}</span>
    )
  );
}
