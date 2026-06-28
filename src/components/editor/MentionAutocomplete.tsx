import { useEffect, useMemo, useState } from 'react';
import { FileText, Hash, Calendar } from 'lucide-react';
import type { Editor as TiptapEditor } from '@tiptap/core';
import type { MentionSuggestState, MentionKind } from '../extensions/MentionSuggest';
import { commitMention } from '../extensions/MentionSuggest';
import type { VaultFile } from '@/types';
import { cn } from '@/lib/utils';

interface Hit {
  kind: MentionKind;
  value: string;
  label: string;
  hint?: string;
}

interface Props {
  state: MentionSuggestState;
  editor: TiptapEditor | null;
  files: VaultFile[];
  onCreate: (target: string) => Promise<void>;
}

export function MentionAutocomplete({ state, editor, files, onCreate }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  const hits = useMemo<Hit[]>(() => {
    const q = state.query.trim().toLowerCase();
    const out: Hit[] = [];

    // ---- Dates ----
    const dateHits: Hit[] = [];
    const todayLabel = 'today';
    const yesterdayLabel = 'yesterday';
    const tomorrowLabel = 'tomorrow';
    const matchesDate = (label: string) => !q || label.startsWith(q);
    if (matchesDate(todayLabel))
      dateHits.push({ kind: 'date', value: ymdOf(new Date()), label: todayLabel, hint: ymdOf(new Date()) });
    if (matchesDate(yesterdayLabel)) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      dateHits.push({ kind: 'date', value: ymdOf(d), label: yesterdayLabel, hint: ymdOf(d) });
    }
    if (matchesDate(tomorrowLabel)) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      dateHits.push({ kind: 'date', value: ymdOf(d), label: tomorrowLabel, hint: ymdOf(d) });
    }
    // Weekdays
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const w of weekdays) {
      if (q && w.startsWith(q)) {
        const d = nextDateForWeekday(w);
        dateHits.push({ kind: 'date', value: ymdOf(d), label: w, hint: ymdOf(d) });
      }
    }

    // ---- Notes ----
    const noteHits: Hit[] = [];
    const scored = files
      .filter((f) => !f.rel.endsWith('.canvas'))
      .map((f) => {
        const title = (f.title || f.name).toLowerCase();
        let score = 0;
        if (!q) score = 1;
        else if (title === q) score = 100;
        else if (title.startsWith(q)) score = 80;
        else if (title.includes(q)) score = 60;
        else if (f.rel.toLowerCase().includes(q)) score = 30;
        return { f, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
    for (const s of scored) {
      noteHits.push({
        kind: 'note',
        value: s.f.title || s.f.name,
        label: s.f.title || s.f.name,
        hint: s.f.rel,
      });
    }

    // ---- Tags ----
    const tagSet = new Map<string, number>();
    for (const f of files) for (const t of f.tags) tagSet.set(t, (tagSet.get(t) ?? 0) + 1);
    const tagHits: Hit[] = [...tagSet.entries()]
      .filter(([t]) => !q || t.toLowerCase().includes(q))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t, c]) => ({ kind: 'tag', value: t, label: t, hint: `${c} use${c === 1 ? '' : 's'}` }));

    // Order: notes → tags → dates
    out.push(...noteHits, ...tagHits, ...dateHits);
    return out;
  }, [files, state.query]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [state.query]);

  useEffect(() => {
    if (!state.active || !editor) return;
    const onKey = (e: KeyboardEvent) => {
      if (!state.active) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, hits.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        commit(selectedIdx);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        editor.view.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.active, hits, selectedIdx, editor]);

  const commit = async (idx: number) => {
    if (!editor) return;
    const hit = hits[idx];
    if (hit) {
      commitMention(editor, hit.kind, hit.value);
      // Auto-create note for date / new-note hits if it doesn't exist
      if (hit.kind === 'date' || hit.kind === 'note') {
        const exists = files.some(
          (f) => (f.title || f.name).toLowerCase() === hit.value.toLowerCase()
        );
        if (!exists) {
          await onCreate(hit.value).catch(() => {});
        }
      }
    } else if (state.query.trim()) {
      // No matches — create a new note from the query
      const target = state.query.trim();
      commitMention(editor, 'note', target);
      await onCreate(target).catch(() => {});
    }
  };

  if (!state.active || !state.rect) return null;

  // Group for display while keeping a single flat selectable index
  const grouped: { kind: MentionKind; label: string; items: Hit[] }[] = [];
  const groupOf = (k: MentionKind) =>
    k === 'note' ? 'Notes' : k === 'tag' ? 'Tags' : 'Dates';
  let cur: { kind: MentionKind; label: string; items: Hit[] } | null = null;
  for (const h of hits) {
    if (!cur || cur.kind !== h.kind) {
      cur = { kind: h.kind, label: groupOf(h.kind), items: [] };
      grouped.push(cur);
    }
    cur.items.push(h);
  }

  let runningIdx = 0;
  const showCreate = state.query.trim().length > 0 && hits.length === 0;

  return (
    <div
      className="fixed z-50 w-80 max-h-96 overflow-y-auto rounded-lg border border-border bg-bg-elevated shadow-2xl animate-fade-in"
      style={{ left: state.rect.left, top: state.rect.top + 4 }}
    >
      {grouped.map((group) => (
        <div key={group.kind}>
          <div className="px-3 pt-2 pb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-text-subtle">
            {group.label}
          </div>
          {group.items.map((hit) => {
            const idx = runningIdx++;
            const active = idx === selectedIdx;
            return (
              <button
                key={`${hit.kind}:${hit.value}`}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors',
                  active ? 'bg-bg-hover' : 'hover:bg-bg-hover'
                )}
                onMouseEnter={() => setSelectedIdx(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(idx);
                }}
              >
                <span
                  className={cn(
                    'shrink-0',
                    hit.kind === 'note' && 'text-text-muted',
                    hit.kind === 'tag' && 'text-tag',
                    hit.kind === 'date' && 'text-accent'
                  )}
                >
                  {hit.kind === 'note' ? (
                    <FileText size={13} />
                  ) : hit.kind === 'tag' ? (
                    <Hash size={13} />
                  ) : (
                    <Calendar size={13} />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-[13.5px] text-text truncate">
                    {hit.kind === 'tag' ? `#${hit.label}` : hit.label}
                  </div>
                  {hit.hint && (
                    <div className="font-mono text-[10.5px] text-text-subtle truncate">
                      {hit.hint}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ))}
      {showCreate && (
        <div>
          <div className="px-3 pt-2 pb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-text-subtle">
            Create
          </div>
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-bg-hover"
            onMouseDown={(e) => {
              e.preventDefault();
              commit(0);
            }}
          >
            <FileText size={13} className="text-accent" />
            <div className="flex-1 min-w-0">
              <div className="font-serif text-[13.5px] text-accent-ink">
                New note &mdash; "{state.query}"
              </div>
              <div className="font-mono text-[10.5px] text-text-subtle">
                will be linked here
              </div>
            </div>
          </button>
        </div>
      )}
      {hits.length === 0 && !showCreate && (
        <div className="px-3 py-3 text-[12px] text-text-subtle">
          Start typing — notes, #tags, or dates.
        </div>
      )}
    </div>
  );
}

function ymdOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function nextDateForWeekday(name: string): Date {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const target = days.indexOf(name.toLowerCase());
  const today = new Date();
  const diff = (target - today.getDay() + 7) % 7 || 7;
  const d = new Date(today);
  d.setDate(d.getDate() + diff);
  return d;
}
