import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import type { Editor as TiptapEditor } from '@tiptap/core';
import { cn, basenameNoExt } from '@/lib/utils';

interface Props {
  rel: string;
  editor: TiptapEditor | null;
}

/** Treat a file as a todo note when its folder or basename is "todos"/"todo".
 *  Examples that match: `work/todos.md`, `sideprojects/todos/2026-05-15.md`. */
export function isTodoNote(rel: string): boolean {
  const lower = rel.toLowerCase();
  if (/(^|\/)todos?\//i.test(lower)) return true;
  const base = lower.split('/').pop() ?? lower;
  if (/^todos?\.(md|markdown|mdx|mdown|mkd|mkdn|mdwn)$/.test(base)) return true;
  return false;
}

interface TaskCounts {
  open: number;
  done: number;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function TodoNoteHeader({ rel, editor }: Props) {
  const [counts, setCounts] = useState<TaskCounts>({ open: 0, done: 0 });

  useEffect(() => {
    if (!editor) return;
    const compute = () => {
      let open = 0;
      let done = 0;
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'taskItem') {
          if (node.attrs.checked) done++;
          else open++;
        }
      });
      setCounts({ open, done });
    };
    compute();
    // Listen to `transaction` (not `update`) so we also catch the initial setContent
    // which is dispatched with emitUpdate=false during file load.
    const onTx = ({ transaction }: { transaction: { docChanged: boolean } }) => {
      if (transaction.docChanged) compute();
    };
    editor.on('transaction', onTx);
    return () => {
      editor.off('transaction', onTx);
    };
  }, [editor]);

  const total = counts.open + counts.done;
  const pct = total === 0 ? 0 : Math.round((counts.done / total) * 100);
  const base = basenameNoExt(rel);
  const dateMatch = base.match(DATE_RE);
  const dateObj = dateMatch
    ? new Date(parseInt(dateMatch[1], 10), parseInt(dateMatch[2], 10) - 1, parseInt(dateMatch[3], 10))
    : null;

  const folderPath = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : null;
  const headerTitle = dateObj ? null : prettifyTitle(rel, base);

  const focusEditor = () => {
    if (!editor) return;
    editor.chain().focus('end').run();
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'taskList',
        content: [
          {
            type: 'taskItem',
            attrs: { checked: false },
            content: [{ type: 'paragraph' }],
          },
        ],
      })
      .run();
  };

  // Compact stat line: "0 open · 5 done · 100%" — one segmented row instead of separate pills.
  return (
    <div className="pt-10 pb-4 w-full border-b border-border-subtle mb-4">
      <div className="flex items-start gap-6">
        {dateObj ? (
          // Dated todos: same masthead treatment as daily notes — feels familiar.
          <div className="w-[76px] shrink-0 text-center font-serif">
            <div className="text-[11px] font-mono uppercase tracking-[0.1em] text-text-muted">
              {dateObj.toLocaleDateString(undefined, { weekday: 'short' })}
            </div>
            <div className="text-[56px] font-semibold leading-none tracking-[-0.03em] my-0.5 text-text">
              {String(dateObj.getDate()).padStart(2, '0')}
            </div>
            <div className="text-[11px] font-mono uppercase tracking-[0.1em] text-text-muted">
              {dateObj.toLocaleDateString(undefined, { month: 'short' })}{' '}
              {String(dateObj.getFullYear()).slice(-2)}
            </div>
          </div>
        ) : null}

        <div className="flex-1 min-w-0 pt-1">
          <div className="text-[11px] font-mono uppercase tracking-[0.1em] text-text-muted">
            {folderPath ?? 'Todos'}
          </div>
          {/* Dated todos: masthead numerals already say the date, so skip the long form
              and let the tasks be the hero. Project todos still get a readable title. */}
          {!dateObj && headerTitle && (
            <h1 className="font-serif text-[24px] font-semibold tracking-[-0.02em] leading-[1.2] text-text truncate mt-0.5">
              {headerTitle}
            </h1>
          )}

          {/* Compact stat line + add-task affordance */}
          <div className="flex items-center gap-3 mt-2.5 text-[12px] text-text-muted">
            <span className={cn('tabular-nums', counts.open > 0 && 'text-text font-medium')}>
              {counts.open} open
            </span>
            <span className="text-text-subtle">·</span>
            <span className="tabular-nums">{counts.done} done</span>
            {total > 0 && (
              <>
                <span className="text-text-subtle">·</span>
                <span className={cn('tabular-nums', pct === 100 && 'text-accent-ink')}>{pct}%</span>
              </>
            )}
            <button
              onClick={focusEditor}
              className="ml-auto inline-flex items-center gap-1 text-text-subtle hover:text-text transition-colors"
            >
              <Plus size={12} />
              Add task
            </button>
          </div>

          {/* Hairline progress indicator — recedes when partial, lights up at 100%. */}
          {total > 0 && (
            <div className="mt-2 h-[2px] w-full rounded-full bg-border-subtle overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  pct === 100 ? 'bg-accent' : 'bg-accent/40'
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function prettifyTitle(rel: string, base: string): string {
  if (base.toLowerCase() === 'todos' || base.toLowerCase() === 'todo') {
    const parent = rel.includes('/') ? rel.split('/').slice(-2, -1)[0] : '';
    if (parent) return capitalize(parent) + ' todos';
    return 'Todos';
  }
  return base;
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

