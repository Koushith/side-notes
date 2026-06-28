import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useTheme, THEMES, ThemeKey, Mode } from '@/stores/theme';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Anchor element rect — picker positions to the bottom-right of this. */
  anchor?: { right: number; bottom: number; top: number; left: number } | null;
}

export function ThemePicker({ open, onClose, anchor }: Props) {
  const theme = useTheme((s) => s.theme);
  const mode = useTheme((s) => s.mode);
  const setTheme = useTheme((s) => s.setTheme);
  const setMode = useTheme((s) => s.setMode);

  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Position: under the anchor element, right-aligned.
  const width = 360;
  const margin = 8;
  let left = window.innerWidth - width - margin;
  let top = 56;
  if (anchor) {
    top = Math.min(anchor.bottom + 6, window.innerHeight - 460);
    left = Math.min(Math.max(anchor.right - width, margin), window.innerWidth - width - margin);
  }

  return (
    <div
      ref={ref}
      className="fixed z-[120] rounded-[12px] border border-border bg-bg-elevated shadow-2xl animate-fade-in"
      style={{ left, top, width }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <div className="font-serif text-[15px] font-semibold text-text">Tweaks</div>
        <button
          onClick={onClose}
          className="text-text-subtle hover:text-text"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>

      <div className="px-4 pb-4">
        {/* Mode */}
        <div className="font-serif text-[13px] text-text-muted mb-2">Mode</div>
        <div className="relative bg-bg p-1 rounded-[10px] flex mb-5">
          <ModeBtn label="Light" active={mode === 'light'} onClick={() => setMode('light')} />
          <ModeBtn label="Dark" active={mode === 'dark'} onClick={() => setMode('dark')} />
        </div>

        {/* Theme grid */}
        <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-text-muted mb-2.5">
          Theme
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(THEMES) as ThemeKey[]).map((key) => (
            <ThemeCard
              key={key}
              themeKey={key}
              active={theme === key}
              onClick={() => setTheme(key)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ModeBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 h-8 rounded-md font-serif text-[13px] transition-colors',
        active
          ? 'bg-bg-elevated text-text shadow-sm'
          : 'text-text-muted hover:text-text'
      )}
    >
      {label}
    </button>
  );
}

function ThemeCard({
  themeKey,
  active,
  onClick,
}: {
  themeKey: ThemeKey;
  active: boolean;
  onClick: () => void;
}) {
  const def = THEMES[themeKey];
  const mode = useTheme((s) => s.mode);
  // For carbon's "light" we still want the dark swatch to read; use the swatch from the def.
  const [bg, ink, accent] = def.swatch;
  const palette = def[mode];

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col gap-3 p-3 rounded-[10px] border transition-colors text-left',
        active
          ? 'bg-text border-text'
          : 'bg-bg border-border hover:border-text-muted'
      )}
    >
      <div className="flex gap-1.5">
        <Swatch color={palette.paper || bg} />
        <Swatch color={palette.ink || ink} />
        <Swatch color={palette.accent || accent} />
      </div>
      <div
        className={cn(
          'font-serif text-[14px] font-semibold',
          active ? 'text-bg' : 'text-text'
        )}
      >
        {def.name}
      </div>
    </button>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      className="w-5 h-5 rounded-[4px] border border-black/10"
      style={{ background: color }}
    />
  );
}
