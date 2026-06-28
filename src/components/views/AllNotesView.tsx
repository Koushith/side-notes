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

  // Group items by date (Granola-style)
  const grouped = useMemo(() => {
    const groups = new Map<string, typeof items>();
    items.forEach((item) => {
      const label = getDateLabel(item.mtime || Date.now());
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(item);
    });
    return Array.from(groups.entries());
  }, [items]);

  const total = files.size;

  return (
    <div className="h-full overflow-y-auto bg-bg">
      <div className="max-w-[880px] mx-auto px-8 pt-10 pb-20">
        <header className="mb-7">
          <h1 className="font-sans text-[28px] font-semibold tracking-[-0.02em] leading-[1.2] text-text mb-1.5">
            All notes
          </h1>
          <div className="text-[13px] text-text-muted">
            {total} note{total === 1 ? '' : 's'} in this vault
          </div>
        </header>

        <div className="flex items-center gap-2.5 mb-8">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by title, path, or tag…"
            className="flex-1 px-3.5 py-2 bg-bg-elevated border border-border rounded-lg text-[13px] text-text placeholder:text-text-subtle focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/50 transition-all"
          />
          <div className="flex items-center bg-bg-elevated border border-border rounded-lg overflow-hidden divide-x divide-border">
            <SortBtn
              icon={<Clock size={13} />}
              label="Edited"
              active={sort === 'edited'}
              onClick={() => setSort('edited')}
            />
            <SortBtn
              icon={<ArrowDownAZ size={13} />}
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
          <div className="space-y-9">
            {grouped.map(([dateLabel, groupItems]) => (
              <div key={dateLabel}>
                <h2 className="text-[12.5px] font-medium text-text-muted/80 mb-3.5 tracking-wide">
                  {dateLabel}
                </h2>
                <div className="space-y-2">
                  {groupItems.map((f) => {
                    const isCanvas = f.rel.endsWith('.canvas');
                    const parent = parentLabel(f.rel);
                    return (
                      <button
                        key={f.rel}
                        onClick={() => openFile(f.rel)}
                        className="w-full text-left px-4 py-3 bg-bg-elevated hover:bg-bg-hover/80 border border-border/50 hover:border-border rounded-xl transition-all flex items-start gap-3 group"
                      >
                        <span className="text-text-subtle/70 group-hover:text-text-muted mt-[3px] shrink-0 transition-colors">
                          {isCanvas ? <LayoutGrid size={15} /> : <FileText size={15} />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-sans text-[14.5px] font-normal text-text truncate">
                              {f.title || f.name}
                            </span>
                            {pinned.has(f.rel) && (
                              <Pin size={10} className="text-accent fill-current shrink-0" />
                            )}
                          </div>
                          <div className="text-[12px] text-text-muted/70 flex items-center gap-1.5 flex-wrap">
                            {parent && (
                              <>
                                <span className="font-mono text-[11.5px]">{parent}</span>
                                <span className="text-text-subtle/50">·</span>
                              </>
                            )}
                            <span className="font-mono text-[11.5px]">{formatTimeOnly(f.mtime)}</span>
                            {f.tags.length > 0 && (
                              <>
                                <span className="text-text-subtle/50">·</span>
                                <span className="flex items-center gap-1 flex-wrap">
                                  {f.tags.slice(0, 3).map((t) => (
                                    <span
                                      key={t}
                                      className="font-mono text-[10px] px-1.5 py-[1px] rounded bg-tag-soft/50 text-tag/80"
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
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
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
        'flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium transition-all',
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

function getDateLabel(ms: number): string {
  const date = new Date(ms);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';

  const diff = today.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: today.getFullYear() !== date.getFullYear() ? 'numeric' : undefined });
}

function formatTimeOnly(ms?: number): string {
  if (!ms) return '';
  const date = new Date(ms);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}
