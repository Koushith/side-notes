import { useMemo } from 'react';
import { Hash, X } from 'lucide-react';
import { useVault } from '@/stores/vault';
import { cn } from '@/lib/utils';

export function TagPanel() {
  const files = useVault((s) => s.files);
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of files.values()) {
      for (const t of f.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [files]);
  const selected = useVault((s) => s.selectedTag);
  const setSelectedTag = useVault((s) => s.setSelectedTag);

  if (tags.length === 0) {
    return (
      <div className="px-3.5 py-2 text-[11.5px] text-text-subtle italic">
        Add #tags in your notes — they'll show up here.
      </div>
    );
  }

  return (
    <div className="px-3 py-1 flex flex-wrap gap-1.5">
      {selected && (
        <button
          onClick={() => setSelectedTag(null)}
          className="flex items-center gap-1 px-2 py-[2px] rounded text-[11px] bg-accent text-bg hover:bg-accent-hover font-mono"
        >
          Clear
          <X size={10} />
        </button>
      )}
      {tags.map(({ tag, count }) => (
        <button
          key={tag}
          onClick={() => setSelectedTag(selected === tag ? null : tag)}
          className={cn(
            'flex items-center gap-1 px-2 py-[2px] rounded text-[11.5px] transition-colors font-mono',
            selected === tag
              ? 'bg-tag text-bg'
              : 'bg-tag-soft text-tag hover:brightness-95'
          )}
        >
          <Hash size={9} />
          {tag}
          <span className={cn('text-[10px]', selected === tag ? 'text-bg/70' : 'text-tag/70')}>{count}</span>
        </button>
      ))}
    </div>
  );
}
