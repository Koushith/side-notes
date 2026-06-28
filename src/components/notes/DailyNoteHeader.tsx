import { useEffect, useMemo, useState } from 'react';
import { CheckSquare, Clock, FileText, Flame } from 'lucide-react';
import type { Editor as TiptapEditor } from '@tiptap/core';
import { useVault } from '@/stores/vault';
import { api } from '@/lib/api';
import { joinPath } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Props {
  rel: string;
  title: string;
  onTitleChange: (next: string) => void;
  editor: TiptapEditor | null;
}

const ENERGY = ['drained', 'low', 'okay', 'good', 'wired'] as const;
type Energy = (typeof ENERGY)[number];

/** Parse `Daily Notes/YYYY-MM-DD.{md,mdx,markdown,…}` → Date, or null. */
export function parseDailyDate(rel: string): Date | null {
  const m = rel.match(/Daily Notes\/(\d{4})-(\d{2})-(\d{2})\.(?:md|markdown|mdx|mdown|mkd|mkdn|mdwn)$/i);
  if (!m) return null;
  return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
}

export function isDailyNote(rel: string): boolean {
  return parseDailyDate(rel) !== null;
}

export function DailyNoteHeader({ rel, title, onTitleChange, editor }: Props) {
  const date = useMemo(() => parseDailyDate(rel), [rel]);
  const files = useVault((s) => s.files);
  const vaultPath = useVault((s) => s.vaultPath);

  // Energy mood — stored per-day in localStorage so it survives reloads.
  const energyKey = `daily-energy:${rel}`;
  const [energy, setEnergyState] = useState<Energy | null>(() => {
    try {
      const v = localStorage.getItem(energyKey);
      return ENERGY.includes(v as Energy) ? (v as Energy) : null;
    } catch {
      return null;
    }
  });
  const setEnergy = (m: Energy) => {
    try {
      localStorage.setItem(energyKey, m);
    } catch {
      /* ignore */
    }
    setEnergyState(m);
  };

  // Live stats from the editor (words + task counts). Updates on every keystroke.
  const [stats, setStats] = useState<{ words: number; tasksOpen: number; tasksDone: number }>(
    { words: 0, tasksOpen: 0, tasksDone: 0 }
  );
  useEffect(() => {
    if (!editor) return;
    const compute = () => {
      const text = editor.getText({ blockSeparator: '\n' });
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      let tasksOpen = 0;
      let tasksDone = 0;
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'taskItem') {
          if (node.attrs.checked) tasksDone++;
          else tasksOpen++;
        }
      });
      setStats({ words, tasksOpen, tasksDone });
    };
    compute();
    // Listen to `transaction` so we also catch the initial setContent (emitUpdate=false).
    const onTx = ({ transaction }: { transaction: { docChanged: boolean } }) => {
      if (transaction.docChanged) compute();
    };
    editor.on('transaction', onTx);
    return () => {
      editor.off('transaction', onTx);
    };
  }, [editor]);

  // Compute writing streak: consecutive days ending today (or this note's date) that have a daily note.
  const streak = useMemo(() => {
    if (!date) return 0;
    const dailyDates = new Set<string>();
    for (const f of files.values()) {
      const d = parseDailyDate(f.rel);
      if (!d) continue;
      dailyDates.add(toYmd(d));
    }
    let count = 0;
    const cursor = new Date(date);
    while (dailyDates.has(toYmd(cursor))) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [files, date]);

  // Find the most recent prior daily note and pull its unchecked `- [ ] …` items.
  const [looseEnds, setLooseEnds] = useState<{ text: string; done: boolean }[]>([]);
  const prevRel = useMemo(() => {
    if (!date) return null;
    const dailyByYmd = new Map<string, string>();
    for (const f of files.values()) {
      const d = parseDailyDate(f.rel);
      if (d) dailyByYmd.set(toYmd(d), f.rel);
    }
    // Look back up to 7 days
    const cursor = new Date(date);
    for (let i = 0; i < 7; i++) {
      cursor.setDate(cursor.getDate() - 1);
      const candidate = dailyByYmd.get(toYmd(cursor));
      if (candidate) return candidate;
    }
    return null;
  }, [files, date]);

  useEffect(() => {
    if (!prevRel || !vaultPath) {
      setLooseEnds([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const raw = await api.files.read(joinPath(vaultPath, prevRel));
        if (cancelled) return;
        const tasks = parseTasks(raw).slice(0, 5); // cap
        // Apply local "done" overrides — clicking ticks pull through localStorage.
        const overrides = readOverrides(rel);
        setLooseEnds(
          tasks.map((t) => ({
            text: t.text,
            done: t.done || overrides.has(t.text),
          }))
        );
      } catch {
        setLooseEnds([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [prevRel, vaultPath, rel]);

  const toggleLooseEnd = (text: string) => {
    const set = readOverrides(rel);
    if (set.has(text)) set.delete(text);
    else set.add(text);
    writeOverrides(rel, set);
    setLooseEnds((cur) =>
      cur.map((t) => (t.text === text ? { ...t, done: !t.done } : t))
    );
  };

  if (!date) return null;

  return (
    <div className="pt-10 pb-1 w-full">
      {/* Date masthead */}
      <div className="flex items-start gap-6 pb-6 mb-7 border-b border-border">
        <div className="w-[76px] shrink-0 text-center font-serif">
          <div className="text-[11px] font-mono uppercase tracking-[0.1em] text-text-muted">
            {date.toLocaleDateString(undefined, { weekday: 'short' })}
          </div>
          <div className="text-[56px] font-semibold leading-none tracking-[-0.03em] my-0.5 text-text">
            {String(date.getDate()).padStart(2, '0')}
          </div>
          <div className="text-[11px] font-mono uppercase tracking-[0.1em] text-text-muted">
            {date.toLocaleDateString(undefined, { month: 'short' })}{' '}
            {String(date.getFullYear()).slice(-2)}
          </div>
        </div>
        <div className="flex-1 pt-1.5 min-w-0">
          <EditableTitle value={title} onChange={onTitleChange} />
          <div className="flex flex-wrap gap-2 mt-3.5">
            <Chip
              icon={<FileText size={11} />}
              label={stats.words === 1 ? '1 word' : `${stats.words.toLocaleString()} words`}
            />
            {(stats.tasksOpen > 0 || stats.tasksDone > 0) && (
              <Chip
                icon={<CheckSquare size={11} />}
                label={
                  stats.tasksOpen === 0
                    ? `All ${stats.tasksDone} done`
                    : `${stats.tasksOpen} open · ${stats.tasksDone} done`
                }
                accent={stats.tasksOpen === 0 && stats.tasksDone > 0}
              />
            )}
            {streak > 1 && (
              <Chip
                icon={<Flame size={11} />}
                label={`${streak}-day streak`}
                accent
              />
            )}
          </div>
        </div>
      </div>

      {/* Mood */}
      <div className="mb-6">
        <div className="text-[10.5px] font-mono uppercase tracking-[0.1em] text-text-muted mb-2.5">
          How am I, today?
        </div>
        <div className="flex gap-1.5">
          {ENERGY.map((m) => {
            const selected = energy === m;
            return (
              <button
                key={m}
                onClick={() => setEnergy(m)}
                className={cn(
                  'flex-1 py-2.5 px-3 rounded-lg border text-[13.5px] lowercase font-serif transition-colors',
                  selected
                    ? 'bg-accent-subtle border-accent text-accent-ink font-semibold'
                    : 'bg-bg-elevated border-border text-text-muted hover:bg-bg-hover hover:text-text'
                )}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      {/* Yesterday's loose ends */}
      {looseEnds.length > 0 && (
        <div className="mb-6 px-4 pt-3.5 pb-3 bg-bg-elevated border border-border rounded-[10px]">
          <div className="flex items-center gap-2 text-[10.5px] font-mono uppercase tracking-[0.1em] text-text-muted mb-2.5">
            <Clock size={11} />
            <span>Yesterday's loose ends</span>
            <span className="ml-auto text-[10px] text-text-subtle">auto-pulled</span>
          </div>
          <div className="flex flex-col gap-1.5 font-serif text-[14.5px]">
            {looseEnds.map((t, i) => (
              <button
                key={i}
                onClick={() => toggleLooseEnd(t.text)}
                className="flex items-start gap-2.5 text-left group"
              >
                <span
                  className={cn(
                    'w-4 h-4 mt-1 rounded border-[1.4px] grid place-items-center shrink-0 transition-colors',
                    t.done
                      ? 'bg-text-muted border-text-muted'
                      : 'border-text-muted group-hover:border-text'
                  )}
                >
                  {t.done && (
                    <svg
                      width={10}
                      height={10}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="rgb(var(--c-bg))"
                      strokeWidth={3}
                    >
                      <path d="m5 12 5 5 9-12" />
                    </svg>
                  )}
                </span>
                <span
                  className={cn(
                    t.done ? 'text-text-muted line-through' : 'text-text'
                  )}
                >
                  {t.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EditableTitle({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Title for today…"
      className="w-full bg-transparent outline-none font-serif text-[32px] font-semibold tracking-[-0.02em] leading-[1.15] text-text placeholder:text-text-subtle"
    />
  );
}

function Chip({
  icon,
  label,
  accent,
  muted,
}: {
  icon: React.ReactNode;
  label: string;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-full text-[11.5px] font-medium border',
        accent && 'bg-accent-subtle border-accent text-accent-ink',
        !accent &&
          (muted
            ? 'bg-transparent border-dashed border-border text-text-subtle'
            : 'bg-bg-elevated border-border text-text-muted')
      )}
    >
      {icon}
      {label}
    </span>
  );
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseTasks(md: string): { text: string; done: boolean }[] {
  const out: { text: string; done: boolean }[] = [];
  const noFm = md.replace(/^---\n[\s\S]*?\n---\n?/, '');
  let inFence = false;
  for (const line of noFm.split('\n')) {
    if (/^```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = line.match(/^\s*[-*]\s+\[( |x|X)\]\s+(.+)$/);
    if (m) {
      out.push({ done: m[1].toLowerCase() === 'x', text: m[2].trim() });
    }
  }
  // We only "loose end" the unchecked ones (or recently checked, if you want — keep just unchecked).
  return out.filter((t) => !t.done);
}

function readOverrides(rel: string): Set<string> {
  try {
    const raw = localStorage.getItem(`loose-ends:${rel}`);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeOverrides(rel: string, set: Set<string>) {
  try {
    localStorage.setItem(`loose-ends:${rel}`, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}
