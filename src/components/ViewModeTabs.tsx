import { PenSquare, Code2 } from 'lucide-react';
import { useUi } from '@/stores/ui';
import { cn } from '@/lib/utils';

export function ViewModeTabs() {
  const rawMode = useUi((s) => s.rawMode);
  const setRawMode = useUi((s) => s.setRawMode);

  return (
    <div className="inline-flex items-center rounded-md border border-border bg-bg-elevated p-0.5 text-[12px] gap-0.5">
      <Tab active={!rawMode} onClick={() => setRawMode(false)} title="Rendered preview of the note">
        <PenSquare size={12} />
        Preview
      </Tab>
      <Tab active={rawMode} onClick={() => setRawMode(true)} title="Edit raw markdown source">
        <Code2 size={12} />
        Markdown
      </Tab>
    </div>
  );
}

function Tab({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded transition-colors',
        active
          ? 'bg-bg text-text shadow-sm'
          : 'text-text-muted hover:text-text'
      )}
    >
      {children}
    </button>
  );
}
