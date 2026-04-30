import { useMemo } from 'react';
import { ListTree } from 'lucide-react';
import { useVault } from '@/stores/vault';
import { api } from '@/lib/api';
import { joinPath } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Heading {
  level: number;
  text: string;
  id: string;
}

export function OutlinePanel() {
  const activeFile = useVault((s) => s.activeFile);
  const vaultPath = useVault((s) => s.vaultPath);
  const files = useVault((s) => s.files);
  const [headings, setHeadings] = useState<Heading[]>([]);

  const file = activeFile ? files.get(activeFile) : null;

  useEffect(() => {
    if (!activeFile || !vaultPath) {
      setHeadings([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const raw = await api.files.read(joinPath(vaultPath, activeFile));
        if (cancelled) return;
        setHeadings(extractHeadings(raw));
      } catch {
        setHeadings([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeFile, vaultPath, file?.mtime]);

  const items = useMemo(() => headings, [headings]);

  if (!activeFile || items.length === 0) return null;

  const minLevel = Math.min(...items.map((h) => h.level));

  return (
    <aside className="w-60 shrink-0 border-l border-border bg-bg-elevated overflow-y-auto">
      <div className="px-4 pt-4 pb-2 border-b border-border-subtle">
        <div className="font-serif text-[14px] font-semibold text-text">Outline</div>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-text-muted mt-0.5 flex items-center gap-1.5">
          <ListTree size={10} />
          {items.length} sections
        </div>
      </div>
      <div className="px-2 py-2">
        {items.map((h, i) => (
          <button
            key={i}
            onClick={() => scrollToHeading(h.text)}
            className={cn(
              'w-full text-left px-2 py-[5px] rounded text-[12.5px] font-serif text-text-muted hover:text-text hover:bg-bg-hover truncate transition-colors'
            )}
            style={{ paddingLeft: 8 + (h.level - minLevel) * 12 }}
            title={h.text}
          >
            {h.text}
          </button>
        ))}
      </div>
    </aside>
  );
}

function extractHeadings(md: string): Heading[] {
  const out: Heading[] = [];
  const noFm = md.replace(/^---\n[\s\S]*?\n---\n?/, '');
  let inFence = false;
  for (const line of noFm.split('\n')) {
    if (/^```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (m) {
      out.push({
        level: m[1].length,
        text: m[2].trim().replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, t, l) => l ?? t),
        id: '',
      });
    }
  }
  return out;
}

function scrollToHeading(text: string) {
  const editor = document.querySelector('.ProseMirror');
  if (!editor) return;
  const headings = editor.querySelectorAll('h1, h2, h3, h4, h5, h6');
  for (const h of Array.from(headings)) {
    if ((h.textContent ?? '').trim() === text) {
      h.scrollIntoView({ behavior: 'smooth', block: 'start' });
      (h as HTMLElement).style.transition = 'background 0.4s';
      (h as HTMLElement).style.background = 'rgba(124, 140, 255, 0.15)';
      setTimeout(() => ((h as HTMLElement).style.background = ''), 800);
      return;
    }
  }
}
