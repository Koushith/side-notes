import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface MenuAction {
  label: string;
  icon?: React.ReactNode;
  hint?: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface MenuSection {
  label?: string;
  items: MenuAction[];
}

interface Props {
  x: number;
  y: number;
  sections: MenuSection[];
  onClose: () => void;
  width?: number;
}

export function ContextMenu({ x, y, sections, onClose, width = 220 }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Clamp to viewport so menu doesn't render off-screen
  const left = Math.min(x, window.innerWidth - width - 8);
  const top = Math.min(y, window.innerHeight - 320);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Use mousedown so the menu closes before the next click registers somewhere else
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const flat: MenuAction[] = sections.flatMap((s) => s.items);

  return (
    <div
      ref={ref}
      className="fixed z-[100] rounded-lg border border-border bg-bg-elevated shadow-2xl py-1 animate-fade-in"
      style={{ left, top, width }}
    >
      {sections.map((section, si) => (
        <div key={si}>
          {section.label && (
            <div className="px-3 pt-2 pb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-text-subtle">
              {section.label}
            </div>
          )}
          {section.items.map((item, ii) => (
            <button
              key={ii}
              disabled={item.disabled}
              onClick={() => {
                onClose();
                item.onClick();
              }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-[6px] text-left text-[12.5px] transition-colors',
                item.disabled && 'opacity-40 cursor-not-allowed',
                !item.disabled && 'hover:bg-bg-hover',
                item.danger ? 'text-red-500' : 'text-text'
              )}
            >
              <span className={cn('shrink-0', item.danger ? 'text-red-500' : 'text-text-muted')}>
                {item.icon}
              </span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.hint && (
                <span className="font-mono text-[10px] text-text-subtle shrink-0">
                  {item.hint}
                </span>
              )}
            </button>
          ))}
          {si < sections.length - 1 && flat.length > 1 && (
            <div className="my-1 mx-2 border-t border-border-subtle" />
          )}
        </div>
      ))}
    </div>
  );
}
