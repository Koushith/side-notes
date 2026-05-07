import { useState } from 'react';
import { X, FileText } from 'lucide-react';
import { useVault } from '@/stores/vault';
import { cn, basenameNoExt } from '@/lib/utils';

export function TabBar() {
  const tabs = useVault((s) => s.tabs);
  const activeFile = useVault((s) => s.activeFile);
  const files = useVault((s) => s.files);
  const openFile = useVault((s) => s.openFile);
  const closeTab = useVault((s) => s.closeTab);
  const reorderTabs = useVault((s) => s.reorderTabs);
  const [dragRel, setDragRel] = useState<string | null>(null);

  if (tabs.length === 0) return null;

  return (
    <div className="flex items-end h-9 px-2 bg-bg-elevated border-b border-border overflow-x-auto select-none no-scrollbar">
      {tabs.map((rel) => {
        const f = files.get(rel);
        const name = f?.title || basenameNoExt(rel);
        const isActive = rel === activeFile;
        return (
          <div
            key={rel}
            draggable
            onDragStart={() => setDragRel(rel)}
            onDragOver={(e) => {
              e.preventDefault();
              if (!dragRel || dragRel === rel) return;
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (!dragRel || dragRel === rel) return;
              const next = tabs.filter((t) => t !== dragRel);
              const targetIdx = next.indexOf(rel);
              next.splice(targetIdx, 0, dragRel);
              reorderTabs(next);
              setDragRel(null);
            }}
            onDragEnd={() => setDragRel(null)}
            className={cn(
              'anim-fade-up group relative flex items-center gap-1.5 px-3 py-1.5 max-w-52 mx-0.5 rounded-t-md text-[12.5px] cursor-pointer',
              isActive
                ? 'bg-bg text-text border-t border-l border-r border-border -mb-px font-medium'
                : 'text-text-muted hover:bg-bg-hover hover:text-text'
            )}
            onMouseDown={(e) => {
              if (e.button === 1) {
                // middle click closes
                e.preventDefault();
                closeTab(rel);
              }
            }}
            onClick={() => openFile(rel)}
            title={rel}
          >
            <FileText size={12} className="shrink-0 opacity-70" />
            <span className="truncate">{name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(rel);
              }}
              className={cn(
                'shrink-0 p-0.5 rounded hover:bg-bg-active opacity-0 group-hover:opacity-100 transition-opacity',
                isActive && 'opacity-60'
              )}
              title="Close (⌘W)"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
