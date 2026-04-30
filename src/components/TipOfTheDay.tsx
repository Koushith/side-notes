import { ArrowRight, Lightbulb } from 'lucide-react';
import { useTips, RawTip } from '@/stores/tips';
import { cn } from '@/lib/utils';

interface Props {
  /** Compact variant for tight spots (welcome pane). */
  compact?: boolean;
  className?: string;
}

export function TipOfTheDay({ compact, className }: Props) {
  const tip = useTips((s) => s.current());
  const next = useTips((s) => s.next);

  return (
    <div
      className={cn(
        'rounded-[10px] border border-border bg-bg-elevated',
        compact ? 'p-3.5' : 'p-5',
        className
      )}
    >
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-accent-ink mb-2">
        <Lightbulb size={11} />
        <span>Tip · today</span>
      </div>
      <div
        className={cn(
          'font-serif text-text leading-relaxed',
          compact ? 'text-[13.5px]' : 'text-[15px]'
        )}
      >
        {renderTip(tip)}
      </div>
      <button
        onClick={next}
        className="mt-3 inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-text-muted hover:text-text transition-colors"
      >
        Next tip
        <ArrowRight size={11} />
      </button>
    </div>
  );
}

/** Render a tip's text, wrapping any emphasized substrings in styled spans. */
function renderTip(tip: RawTip): React.ReactNode {
  if (!tip.emphasize || tip.emphasize.length === 0) return tip.text;
  // Split on the longest matches first, but keep simple — find each match in order, replace once.
  const segments: { text: string; kind?: 'kbd' | 'code' | 'accent' }[] = [{ text: tip.text }];
  // Sort emphases by length desc to avoid partial collisions.
  const sorted = [...tip.emphasize].sort((a, b) => b.match.length - a.match.length);
  for (const e of sorted) {
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.kind) continue;
      const idx = seg.text.indexOf(e.match);
      if (idx === -1) continue;
      const before = seg.text.slice(0, idx);
      const after = seg.text.slice(idx + e.match.length);
      const replacement: typeof segments = [];
      if (before) replacement.push({ text: before });
      replacement.push({ text: e.match, kind: e.kind });
      if (after) replacement.push({ text: after });
      segments.splice(i, 1, ...replacement);
      i += replacement.length - 1;
    }
  }
  return segments.map((seg, i) => {
    if (!seg.kind) return <span key={i}>{seg.text}</span>;
    if (seg.kind === 'kbd') {
      return (
        <kbd
          key={i}
          className="inline-flex items-center px-1.5 py-[1px] rounded border border-border bg-bg font-mono text-[11px] text-text mx-[1px]"
        >
          {seg.text}
        </kbd>
      );
    }
    if (seg.kind === 'code') {
      return (
        <code
          key={i}
          className="font-mono text-[12.5px] text-text bg-bg px-1 py-[1px] rounded border border-border-subtle mx-[1px]"
        >
          {seg.text}
        </code>
      );
    }
    return (
      <span
        key={i}
        className="text-accent-ink bg-accent-subtle px-1 rounded border-b border-accent"
      >
        {seg.text}
      </span>
    );
  });
}
