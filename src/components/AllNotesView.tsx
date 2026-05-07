import { useMemo, useState } from 'react';
import { FileText, LayoutGrid, ArrowDownAZ, Clock, Pin } from 'lucide-react';
import { useVault } from '@/stores/vault';
import { cn } from '@/lib/utils';

type SortMode = 'edited' | 'name';

export function AllNotesView() {
  const files = useVault((s) => s.files);
  const openFile = useVault((s) => s.openFile);
  const pinned = useVault((s) => s.pinned);
  const [sort, setSort] = useState<SortMode>('edited');
  const [filter, setFilter] = useState('');

  const items = useMemo(() => {
    const arr = [...files.values()];
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? arr.filter(
          (f) =>
            (f.title || f.name).toLowerCase().includes(q) ||
            f.rel.toLowerCase().includes(q) ||
            f.tags.some((t) => t.toLowerCase().includes(q))
        )
      : arr;
    return filtered.sort((a, b) => {
      if (sort === 'edited') return b.mtime - a.mtime;
      return (a.title || a.name).localeCompare(b.title || b.name);
    });
  }, [files, sort, filter]);

  const total = files.size;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-16 pt-14 pb-12">
        <header className="mb-6">
          <h1 className="font-serif text-[40px] font-semibold tracking-tight leading-[1.1] text-text">
            All notes
          </h1>
          <div className="text-[12.5px] text-text-muted mt-2.5">
            {total} note{total === 1 ? '' : 's'} in this vault
          </div>
        </header>

        <div className="flex items-center gap-2 mb-5">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by title, path, or tag…"
            className="flex-1 px-3 py-[7px] bg-bg-elevated border border-border rounded-md text-[12.5px] text-text placeholder:text-text-subtle focus:outline-none focus:border-accent/50"
          />
          <div className="flex items-center bg-bg-elevated border border-border rounded-md overflow-hidden">
            <SortBtn
              icon={<Clock size={12} />}
              label="Edited"
              active={sort === 'edited'}
              onClick={() => setSort('edited')}
            />
            <SortBtn
              icon={<ArrowDownAZ size={12} />}
              label="Name"
              active={sort === 'name'}
              onClick={() => setSort('name')}
            />
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 text-text-muted text-[13px]">
            {total === 0 ? 'No notes yet — create one from the sidebar.' : 'No notes match that filter.'}
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle border-t border-b border-border-subtle">
            {items.map((f) => {
              const isCanvas = f.rel.endsWith('.canvas');
              const parent = parentLabel(f.rel);
              return (
                <li key={f.rel}>
                  <button
                    onClick={() => openFile(f.rel)}
                    className="w-full text-left px-3 py-3 hover:bg-bg-hover transition-colors flex items-start gap-3"
                  >
                    <span className="text-text-subtle mt-[3px] shrink-0">
                      {isCanvas ? <LayoutGrid size={13} /> : <FileText size={13} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-[15px] text-text truncate">
                          {f.title || f.name}
                        </span>
                        {pinned.has(f.rel) && (
                          <Pin size={10} className="text-accent fill-current shrink-0" />
                        )}
                      </div>
                      <div className="text-[11.5px] text-text-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
                        {parent && (
                          <>
                            <span>{parent}</span>
                            <span className="text-text-subtle">·</span>
                          </>
                        )}
                        <span>Edited {formatRelativeTime(f.mtime)}</span>
                        {f.tags.length > 0 && (
                          <>
                            <span className="text-text-subtle">·</span>
                            <span className="flex items-center gap-1 flex-wrap">
                              {f.tags.slice(0, 3).map((t) => (
                                <span
                                  key={t}
                                  className="font-mono text-[10px] px-1.5 py-[1px] rounded bg-tag-soft text-tag"
                                >
                                  #{t}
                                </span>
                              ))}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function SortBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-[7px] text-[11.5px] transition-colors',
        active ? 'bg-bg-hover text-text' : 'text-text-muted hover:text-text'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function parentLabel(rel: string): string {
  const parts = rel.split('/');
  if (parts.length < 2) return '';
  return parts[parts.length - 2];
}

function formatRelativeTime(ms?: number): string {
  if (!ms) return 'just now';
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk} wk ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} mo ago`;
  const yr = Math.floor(day / 365);
  return `${yr} yr${yr === 1 ? '' : 's'} ago`;
}
