import { X, Plus, Wrench, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const CHANGELOG: {
  version: string;
  date: string;
  sections: { label: 'New' | 'Fixed' | 'Removed'; items: string[] }[];
}[] = [
  {
    version: '0.4.0',
    date: 'June 2026',
    sections: [
      {
        label: 'New',
        items: [
          'Voice dictation — hold a key and speak; your words are transcribed and dropped at the cursor. Choose a cloud model (OpenAI gpt-4o-transcribe, or Groq) for top accuracy, or run Whisper fully offline on your machine. Optional AI cleanup removes filler words and adds punctuation',
          'Excalidraw drawings — create freehand sketches and diagrams as .excalidraw files right in your vault (New Drawing in the + menu, command palette, or by right-clicking a folder). Fully offline, autosaves as you draw',
          'Source Control, rebuilt — the panel now updates live as you edit, surfaces the next action (a prominent "Push to GitHub" when you\'re ahead), shows an honest "Up to date" state, and Commit auto-stages your changes so you never have to think about staging',
          'Test connection — verify your AI provider or voice model works from Settings before relying on it',
          'Assistant panel now shows at a glance whether it\'s set up and which model is active, with a one-click "Set up AI" when it isn\'t',
          'Version number now sits next to the SideNotes logo',
        ],
      },
      {
        label: 'Fixed',
        items: [
          'Source Control no longer shows a stale ahead/behind count — push now reliably sets the upstream on first push, and git errors (auth, network, conflicts) are shown in plain English instead of raw stderr',
          'Create / OK buttons in dialogs are now readable on every theme (were light-on-light in dark themes)',
          'AI settings decluttered — API key and model come first, with the endpoint Base URL tucked under Advanced',
          'Top bar trimmed from nine icons to six; less-used actions moved into the ⋯ menu',
        ],
      },
    ],
  },
  {
    version: '0.3.0',
    date: 'May 2026',
    sections: [
      {
        label: 'New',
        items: [
          'Mermaid diagrams — flowcharts, sequence, gantt and more render live inside ```mermaid code blocks, themed to the active palette',
          'Image + PDF viewer — click any .png/.jpg/.gif/.webp/.svg/.bmp/.avif/.pdf in the file tree to open it in a tab (PDFs use Chromium\'s built-in viewer)',
          'Todo notes — files under any /todos/ folder (or named todos.md) get a dedicated header with live task counts, progress bar, and an Add task affordance',
          'Daily notes auto-group by Year / Month in the sidebar — purely visual, files stay flat on disk so iCloud, Dropbox, and git don\'t see a thing',
          'Markdown variants — .markdown, .mdx, .mdown, .mkd, .mkdn, .mdwn all index and open in the editor',
          'Carbon · dark is now the default theme on fresh installs',
        ],
      },
      {
        label: 'Fixed',
        items: [
          'Critical data-loss path: editing a file outside SideNotes (iCloud, Dropbox, git checkout, another editor) no longer gets silently clobbered by the open tab\'s stale buffer — the editor reloads on external change and preserves unsaved local edits on conflict',
          'Rename, new note, new folder, new canvas, and link dialogs no longer crash on Electron\'s disabled window.prompt — replaced with a themed in-app dialog',
          'Native confirm() and alert() replaced with a styled confirmation modal + non-blocking toast',
          'Right-click rename now preserves the original extension instead of forcing .md (canvas, mdx, markdown renames work correctly)',
          'Tab strip updates correctly after rename; stale tabs pointing at deleted files close themselves instead of looping read errors',
          'Task checkbox color follows the active theme accent (was a hardcoded blue)',
          'Daily-note + todo task counts no longer stuck at 0 on file load',
          'vault:// image resolver now finds attachments at common publish-site paths (blog/<slug>/foo.png resolves to blogs/images/<slug>/foo.png)',
          'Custom-styled checkboxes replace the heavy native OS chrome inside the task list',
        ],
      },
      {
        label: 'Removed',
        items: [
          'Placeholder "Add weather / Add meetings / Add reading" chips on daily notes — replaced with live Words / Tasks / Streak counters driven from the editor',
        ],
      },
    ],
  },
  {
    version: '0.2.0',
    date: 'May 2026',
    sections: [
      {
        label: 'New',
        items: [
          'Outline panel — live table of contents alongside every markdown note',
          'Folder changes made outside Side (addDir / unlinkDir) now sync to the sidebar instantly',
          'Deleting a file externally now closes its tab and focuses the next one',
        ],
      },
      {
        label: 'Fixed',
        items: [
          '⌘N, daily note, and "new from template" now open a tab immediately',
          'Canvas edge handles now render the correct colour (bg-link was being purged by Tailwind)',
          'Daily note header no longer double-reads energy mood from localStorage on mount',
        ],
      },
      {
        label: 'Removed',
        items: [
          'Redundant BacklinksPanel (superseded by Connections panel)',
          'Dead dirname / slugify utilities and unused fsWatch import',
          'Placeholder "Pinned" nav item with no action',
          'Unused exports: WikilinkCandidate, SlashCommand interface, dismissMention()',
        ],
      },
    ],
  },
  {
    version: '0.1.0',
    date: 'Apr 2026',
    sections: [
      {
        label: 'New',
        items: [
          'Vault-based markdown editor with TipTap + live markdown serialisation',
          'Wikilinks [[note]], #tags, daily notes with mood + streak tracking',
          'Graph view (Sigma.js + ForceAtlas2), Canvas view (React Flow)',
          'Connections panel — backlinks and outgoing links with inline excerpts',
          'Multi-theme picker: Paper, Ink, Forest, Dusk, Carbon, Rose',
          'Focus mode, command palette (⌘K), slash menu (/), keyboard shortcuts (⌘/)',
          'Export as PDF, HTML, Markdown',
          'Templates folder support',
          'Drag-and-drop file moves, inline image paste/drop, context menus',
        ],
      },
    ],
  },
];

const SECTION_META = {
  New: { icon: Plus, color: 'text-tag' },
  Fixed: { icon: Wrench, color: 'text-accent-ink' },
  Removed: { icon: Trash2, color: 'text-text-muted' },
} as const;

const KEY = 'side.whats-new.seen';

function markSeen() {
  try {
    localStorage.setItem(KEY, CHANGELOG[0].version);
  } catch {
    /* ignore */
  }
}

/** Mark the current changelog version as already seen without opening the modal.
 *  Used on first-run so the onboarding tour doesn't have to fight a stacked WhatsNew. */
export function markWhatsNewSeen() {
  markSeen();
}

export function shouldShowWhatsNew(): boolean {
  try {
    return localStorage.getItem(KEY) !== CHANGELOG[0].version;
  } catch {
    return false;
  }
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function WhatsNew({ open, onClose }: Props) {
  function close() {
    markSeen();
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center"
      onClick={close}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-[min(600px,94vw)] max-h-[80vh] flex flex-col rounded-xl border border-border bg-bg-elevated shadow-2xl animate-fade-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-accent-ink mb-1">
              Release notes
            </div>
            <h2 className="font-serif text-[26px] font-semibold tracking-tight text-text leading-tight">
              What's new in SideNotes
            </h2>
          </div>
          <button
            onClick={close}
            className="shrink-0 w-7 h-7 grid place-items-center rounded-md text-text-muted hover:text-text hover:bg-bg-hover transition-colors mt-0.5"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
          {CHANGELOG.map((release, ri) => (
            <div key={release.version}>
              <div className="flex items-baseline gap-2.5 mb-4">
                <span className="font-serif text-[18px] font-semibold text-text">
                  v{release.version}
                </span>
                <span className="font-mono text-[11px] text-text-subtle">{release.date}</span>
                {ri === 0 && (
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.1em] px-2 py-[2px] rounded-full bg-accent/15 text-accent-ink">
                    Latest
                  </span>
                )}
              </div>
              <div className="space-y-4">
                {release.sections.map((section) => {
                  const { icon: Icon, color } = SECTION_META[section.label];
                  return (
                    <div key={section.label}>
                      <div
                        className={cn(
                          'flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] mb-2',
                          color
                        )}
                      >
                        <Icon size={11} />
                        {section.label}
                      </div>
                      <ul className="space-y-1.5">
                        {section.items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 font-serif text-[13.5px] text-text-muted leading-snug">
                            <span className="mt-[5px] w-1 h-1 rounded-full bg-border shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
              {ri < CHANGELOG.length - 1 && (
                <div className="mt-6 border-t border-border-subtle" />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <span className="font-mono text-[11px] text-text-subtle">
            SideNotes v{CHANGELOG[0].version}
          </span>
          <button
            onClick={close}
            className="px-4 py-1.5 rounded-md bg-accent text-bg text-[13px] font-medium hover:bg-accent-hover transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
