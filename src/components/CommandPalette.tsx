import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, FileText, Calendar, Network, Plus, FolderOpen, FileStack, LayoutGrid, Keyboard, BookOpen } from 'lucide-react';
import { useVault } from '@/stores/vault';
import { useOnboarding } from '@/stores/onboarding';
import { cn, basenameNoExt } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  onShowShortcuts?: () => void;
  onShowWhatsNew?: () => void;
  onOpenVaultSwitcher?: () => void;
}

interface Hit {
  kind: 'file' | 'action';
  title: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void | Promise<void>;
  rel?: string;
  snippet?: string;
}

export function CommandPalette({ open, onClose, onShowShortcuts, onShowWhatsNew, onOpenVaultSwitcher }: Props) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [contentHits, setContentHits] = useState<{ rel: string; title: string; snippet: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const files = useVault((s) => s.files);
  const openFile = useVault((s) => s.openFile);
  const setView = useVault((s) => s.setView);
  const createFile = useVault((s) => s.createFile);
  const openOrCreateDaily = useVault((s) => s.openOrCreateDaily);
  const searchContent = useVault((s) => s.searchContent);

  const createFromTemplate = useVault((s) => s.createFromTemplate);
  const createCanvas = useVault((s) => s.createCanvas);
  const startOnboarding = useOnboarding((s) => s.start);

  const templates = useMemo(
    () => [...files.values()].filter((f) => f.rel.startsWith('templates/')),
    [files]
  );

  // Reset on open / debounce content search
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setContentHits([]);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(async () => {
      if (query.trim().length < 2) {
        setContentHits([]);
        return;
      }
      const results = await searchContent(query);
      setContentHits(results);
    }, 200);
    return () => clearTimeout(handle);
  }, [query, open, searchContent]);

  const fileHits = useMemo<Hit[]>(() => {
    const filesArr = [...files.values()];
    const q = query.trim().toLowerCase();
    if (!q) {
      return filesArr
        .sort((a, b) => b.mtime - a.mtime)
        .slice(0, 8)
        .map((f) => ({
          kind: 'file' as const,
          title: f.title || f.name,
          hint: f.rel,
          icon: <FileText size={14} />,
          rel: f.rel,
          run: () => {
            openFile(f.rel);
            onClose();
          },
        }));
    }
    // merge name matches with content matches
    const nameMatches = filesArr
      .filter((f) => (f.title || f.name).toLowerCase().includes(q))
      .map((f) => ({ rel: f.rel, title: f.title || f.name, snippet: '' }));
    const merged = new Map<string, { rel: string; title: string; snippet: string }>();
    for (const m of nameMatches) merged.set(m.rel, m);
    for (const m of contentHits) {
      if (!merged.has(m.rel)) merged.set(m.rel, m);
      else if (m.snippet) merged.set(m.rel, { ...merged.get(m.rel)!, snippet: m.snippet });
    }
    return [...merged.values()].slice(0, 12).map((m) => ({
      kind: 'file' as const,
      title: m.title,
      hint: m.snippet || m.rel,
      icon: <FileText size={14} />,
      rel: m.rel,
      run: () => {
        openFile(m.rel);
        onClose();
      },
    }));
  }, [query, files, contentHits, openFile, onClose]);

  const actionHits = useMemo<Hit[]>(() => {
    const all: Hit[] = [
      {
        kind: 'action',
        title: 'New note',
        hint: '⌘N',
        icon: <Plus size={14} />,
        run: () => {
          createFile('Untitled');
          onClose();
        },
      },
      {
        kind: 'action',
        title: 'New canvas',
        hint: 'Whiteboard with cards',
        icon: <LayoutGrid size={14} />,
        run: async () => {
          const name = window.prompt('Canvas name:', 'Untitled canvas');
          if (!name) return onClose();
          await createCanvas(name.trim());
          onClose();
        },
      },
      {
        kind: 'action',
        title: 'Open today',
        hint: 'Daily note',
        icon: <Calendar size={14} />,
        run: async () => {
          await openOrCreateDaily();
          onClose();
        },
      },
      {
        kind: 'action',
        title: 'Open graph view',
        hint: '⌘2',
        icon: <Network size={14} />,
        run: () => {
          setView('graph');
          onClose();
        },
      },
      {
        kind: 'action',
        title: 'Switch vault',
        icon: <FolderOpen size={14} />,
        run: () => {
          onClose();
          onOpenVaultSwitcher?.();
        },
      },
      {
        kind: 'action',
        title: 'Keyboard shortcuts',
        hint: '⌘/',
        icon: <Keyboard size={14} />,
        run: () => {
          onClose();
          onShowShortcuts?.();
        },
      },
      {
        kind: 'action',
        title: 'Show the tour again',
        icon: <BookOpen size={14} />,
        run: () => {
          onClose();
          startOnboarding();
        },
      },
      {
        kind: 'action',
        title: "What's new",
        hint: 'Release notes',
        icon: <BookOpen size={14} />,
        run: () => {
          onClose();
          onShowWhatsNew?.();
        },
      },
      ...templates.map<Hit>((t) => ({
        kind: 'action',
        title: `New from template: ${basenameNoExt(t.rel.replace(/^templates\//, ''))}`,
        hint: t.rel,
        icon: <FileStack size={14} />,
        run: async () => {
          const name = window.prompt('Name for the new note:', basenameNoExt(t.rel));
          if (!name) return;
          try {
            await createFromTemplate(t.rel, name);
          } catch (err) {
            window.alert((err as Error).message);
          }
          onClose();
        },
      })),
    ];
    if (!query) return all;
    const q = query.toLowerCase();
    return all.filter((a) => a.title.toLowerCase().includes(q));
  }, [query, createFile, openOrCreateDaily, setView, onClose, templates, createFromTemplate, createCanvas, onShowShortcuts, startOnboarding, onOpenVaultSwitcher]);

  const allHits = useMemo(() => [...fileHits, ...actionHits], [fileHits, actionHits]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, allHits.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        allHits[selectedIdx]?.run();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, allHits, selectedIdx, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-[min(640px,92vw)] rounded-xl border border-border bg-bg-elevated shadow-2xl overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search size={16} className="text-text-subtle" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, run commands…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-text-subtle"
          />
          <kbd className="text-[10px] text-text-subtle border border-border rounded px-1.5 py-0.5">esc</kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto py-1">
          {fileHits.length > 0 && (
            <Section label={query ? 'Notes' : 'Recent'}>
              {fileHits.map((h, i) => (
                <Row key={h.rel} hit={h} active={i === selectedIdx} onHover={() => setSelectedIdx(i)} />
              ))}
            </Section>
          )}
          {actionHits.length > 0 && (
            <Section label="Actions">
              {actionHits.map((h, i) => {
                const idx = fileHits.length + i;
                return <Row key={h.title} hit={h} active={idx === selectedIdx} onHover={() => setSelectedIdx(idx)} />;
              })}
            </Section>
          )}
          {allHits.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-text-subtle">No matches.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <div className="px-4 py-1 text-[10px] uppercase tracking-wider text-text-subtle">{label}</div>
      {children}
    </div>
  );
}

function Row({ hit, active, onHover }: { hit: Hit; active: boolean; onHover: () => void }) {
  return (
    <button
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors',
        active ? 'bg-bg-hover' : 'hover:bg-bg-hover'
      )}
      onMouseEnter={onHover}
      onMouseDown={(e) => {
        e.preventDefault();
        hit.run();
      }}
    >
      <span className="text-text-muted shrink-0">{hit.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-text truncate">{hit.title}</div>
        {hit.hint && <div className="text-[11px] text-text-subtle truncate">{hit.hint}</div>}
      </div>
    </button>
  );
}
