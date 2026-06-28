import { useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Row {
  keys: string[];
  desc: string;
}

interface Group {
  title: string;
  rows: Row[];
}

const GROUPS: Group[] = [
  {
    title: 'Navigation',
    rows: [
      { keys: ['⌘', 'K'], desc: 'Search notes & run commands' },
      { keys: ['⌘', '1'], desc: 'Open the editor' },
      { keys: ['⌘', '2'], desc: 'Open the connections graph' },
      { keys: ['⌘', '.'], desc: 'Toggle focus mode' },
      { keys: ['Esc'], desc: 'Close menus or exit focus' },
    ],
  },
  {
    title: 'Files',
    rows: [
      { keys: ['⌘', 'N'], desc: 'New note' },
      { keys: ['⌘', 'D'], desc: 'Today’s daily note' },
      { keys: ['⌘', 'W'], desc: 'Close current tab' },
      { keys: ['↵'], desc: 'Open the focused row' },
    ],
  },
  {
    title: 'In the editor',
    rows: [
      { keys: ['/'], desc: 'Slash menu — insert blocks' },
      { keys: ['[', '['], desc: 'Link to a note (autocomplete)' },
      { keys: ['@'], desc: 'Mention a note, tag, or date' },
      { keys: ['#'], desc: 'Add a tag (autocompletes after letters)' },
      { keys: ['⌘', 'B'], desc: 'Bold' },
      { keys: ['⌘', 'I'], desc: 'Italic' },
      { keys: ['⌘', 'E'], desc: 'Inline code' },
      { keys: ['⌘', 'Z'], desc: 'Undo' },
      { keys: ['⌘', '⇧', 'Z'], desc: 'Redo' },
    ],
  },
  {
    title: 'Markdown shortcuts (just type)',
    rows: [
      { keys: ['#', '␣'], desc: 'Heading 1 (## for H2, ### for H3)' },
      { keys: ['-', '␣'], desc: 'Bullet list' },
      { keys: ['1', '.', '␣'], desc: 'Numbered list' },
      { keys: ['>', '␣'], desc: 'Quote' },
      { keys: ['`', '`', '`'], desc: 'Code block' },
      { keys: ['-', '-', '-'], desc: 'Divider' },
    ],
  },
  {
    title: 'Help',
    rows: [
      { keys: ['⌘', '/'], desc: 'Show this list' },
    ],
  },
];

export function ShortcutsHelp({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-text/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl max-h-[82vh] rounded-[14px] border border-border bg-bg shadow-2xl flex flex-col overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 pt-7 pb-5 border-b border-border-subtle flex items-end justify-between">
          <div>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-accent-ink mb-2">
              Keyboard
            </div>
            <h2 className="font-serif text-[28px] font-semibold tracking-tight text-text leading-none">
              Shortcuts.
            </h2>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-text-subtle hover:text-text"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-8 py-6">
          <div className="grid grid-cols-2 gap-x-10 gap-y-7">
            {GROUPS.map((g) => (
              <div key={g.title}>
                <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-text-muted mb-3">
                  {g.title}
                </div>
                <div className="flex flex-col gap-2">
                  {g.rows.map((r, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="font-serif text-[13.5px] text-text flex-1 leading-snug">
                        {r.desc}
                      </span>
                      <span className="flex items-center gap-[3px] shrink-0">
                        {r.keys.map((k, ki) => (
                          <kbd
                            key={ki}
                            className="inline-flex items-center justify-center min-w-[20px] h-[22px] px-1.5 rounded border border-border bg-bg-elevated font-mono text-[11px] text-text"
                          >
                            {k}
                          </kbd>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-8 py-4 border-t border-border-subtle font-mono text-[10.5px] uppercase tracking-[0.1em] text-text-subtle flex items-center gap-3">
          <span>Tip</span>
          <span className="text-text-muted normal-case font-serif tracking-normal text-[12.5px]">
            On Windows / Linux, <kbd className="font-mono text-[10.5px]">⌘</kbd> means{' '}
            <kbd className="font-mono text-[10.5px]">Ctrl</kbd>.
          </span>
        </div>
      </div>
    </div>
  );
}
