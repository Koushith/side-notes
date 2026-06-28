import { PenSquare, Code2 } from 'lucide-react';
import { useUi } from '@/stores/ui';

export function ViewModeTabs() {
  const rawMode = useUi((s) => s.rawMode);
  const setRawMode = useUi((s) => s.setRawMode);

  return (
    <button
      onClick={() => setRawMode(!rawMode)}
      title={
        rawMode
          ? 'Switch back to the formatted preview'
          : 'Edit the raw markdown source of this note'
      }
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-2.5 py-1 text-[12px] text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
    >
      {rawMode ? <PenSquare size={12} /> : <Code2 size={12} />}
      {rawMode ? 'Switch to Preview' : 'Switch to Markdown'}
    </button>
  );
}
