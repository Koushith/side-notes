import { CornerDownRight, FileText } from 'lucide-react';
import { useVault } from '@/stores/vault';

export function BacklinksPanel() {
  const activeFile = useVault((s) => s.activeFile);
  const getBacklinks = useVault((s) => s.getBacklinks);
  const openFile = useVault((s) => s.openFile);

  if (!activeFile) return null;
  const links = getBacklinks(activeFile);

  return (
    <div className="border-t border-border-subtle">
      <div className="px-3.5 pt-3 pb-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-text-subtle flex items-center gap-1.5">
        <CornerDownRight size={10} />
        Linked from {links.length > 0 && <span>· {links.length}</span>}
      </div>
      <div className="px-2 pb-2.5">
        {links.length === 0 ? (
          <div className="px-3 py-1.5 text-[11.5px] text-text-subtle italic">No backlinks yet.</div>
        ) : (
          links.map((f) => (
            <button
              key={f.rel}
              onClick={() => openFile(f.rel)}
              className="w-full flex items-center gap-2 px-2 py-[5px] rounded text-[12.5px] text-text-muted hover:bg-bg-hover hover:text-text transition-colors"
            >
              <FileText size={12} className="shrink-0 opacity-70" />
              <span className="truncate">{f.title || f.name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
