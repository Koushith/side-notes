import { useEffect, useMemo, useState } from 'react';
import { FileText, Plus } from 'lucide-react';
import type { Editor as TiptapEditor } from '@tiptap/core';
import type { WikilinkSuggestState } from './extensions/WikilinkSuggest';
import { commitWikilink } from './extensions/WikilinkSuggest';
import type { VaultFile } from '@/types';
import { cn, MARKDOWN_EXT_RE, stripMarkdownExt } from '@/lib/utils';

interface Props {
  state: WikilinkSuggestState;
  editor: TiptapEditor | null;
  files: VaultFile[];
  onCreate: (target: string) => Promise<void>;
}

export function WikilinkAutocomplete({ state, editor, files, onCreate }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  const matches = useMemo(() => {
    const q = state.query.trim().toLowerCase();
    if (!q) {
      return files
        .slice()
        .sort((a, b) => b.mtime - a.mtime)
        .slice(0, 8);
    }
    const scored = files
      .map((f) => {
        const title = (f.title || f.name).toLowerCase();
        const rel = f.rel.toLowerCase();
        let score = 0;
        if (title === q || stripMarkdownExt(rel) === q) score = 100;
        else if (title.startsWith(q)) score = 80;
        else if (title.includes(q)) score = 60;
        else if (rel.includes(q)) score = 40;
        return { f, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    return scored.map((s) => s.f);
  }, [state.query, files]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [state.query]);

  useEffect(() => {
    if (!state.active || !editor) return;
    const onKey = (e: KeyboardEvent) => {
      if (!state.active) return;
      const total = matches.length + (state.query.trim() ? 1 : 0); // +1 for "create new"
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, total - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        commit(selectedIdx);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        // Just dismiss — let user keep typing
        editor.view.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.active, state.query, matches, selectedIdx, editor]);

  const commit = async (idx: number) => {
    if (!editor) return;
    if (idx < matches.length) {
      const target = matches[idx].title || matches[idx].name;
      commitWikilink(editor, target);
    } else if (state.query.trim()) {
      const target = state.query.trim();
      commitWikilink(editor, target);
      await onCreate(target);
    }
  };

  if (!state.active || !state.rect) return null;

  const showCreate = state.query.trim().length > 0;

  return (
    <div
      className="fixed z-50 w-72 max-h-80 overflow-y-auto rounded-lg border border-border bg-bg-elevated shadow-2xl animate-fade-in"
      style={{ left: state.rect.left, top: state.rect.top + 4 }}
    >
      <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-text-subtle">
        {state.query ? `Link to "${state.query}"` : 'Link to a note'}
      </div>
      {matches.map((f, i) => (
        <button
          key={f.rel}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
            i === selectedIdx ? 'bg-bg-hover' : 'hover:bg-bg-hover'
          )}
          onMouseEnter={() => setSelectedIdx(i)}
          onMouseDown={(e) => {
            e.preventDefault();
            commit(i);
          }}
        >
          <FileText size={13} className="text-text-subtle shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-text truncate">{f.title || f.name}</div>
            {(MARKDOWN_EXT_RE.test(f.rel) ? stripMarkdownExt(f.rel) !== f.name : f.rel !== `${f.name}.canvas`) && (
              <div className="text-[10px] text-text-subtle truncate">{f.rel}</div>
            )}
          </div>
        </button>
      ))}
      {matches.length === 0 && !showCreate && (
        <div className="px-3 py-3 text-xs text-text-subtle">Start typing a note name…</div>
      )}
      {showCreate && (
        <button
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-left text-sm border-t border-border transition-colors',
            selectedIdx === matches.length ? 'bg-accent/15' : 'hover:bg-bg-hover'
          )}
          onMouseEnter={() => setSelectedIdx(matches.length)}
          onMouseDown={(e) => {
            e.preventDefault();
            commit(matches.length);
          }}
        >
          <Plus size={13} className="text-accent shrink-0" />
          <div className="text-accent">
            Create note <span className="font-medium">"{state.query}"</span>
          </div>
        </button>
      )}
    </div>
  );
}
