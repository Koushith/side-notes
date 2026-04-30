import { useState } from 'react';
import {
  Sun,
  Book,
  Star,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useVault } from '@/stores/vault';
import { FileTree } from './FileTree';
import { TagPanel } from './TagPanel';
import { BacklinksPanel } from './BacklinksPanel';
import { cn } from '@/lib/utils';

interface Props {
  onOpenPalette: () => void;
}

export function Sidebar({ onOpenPalette }: Props) {
  const vaultPath = useVault((s) => s.vaultPath);
  const closeVault = useVault((s) => s.closeVault);
  const fileCount = useVault((s) => s.files.size);
  const view = useVault((s) => s.view);
  const setView = useVault((s) => s.setView);
  const activeFile = useVault((s) => s.activeFile);
  const openOrCreateDaily = useVault((s) => s.openOrCreateDaily);
  const createFile = useVault((s) => s.createFile);

  const [tagsOpen, setTagsOpen] = useState(true);

  const vaultName = vaultPath?.split(/[\\/]/).pop() ?? 'Side';

  // Determine which nav item is active based on the current view + active file
  const isToday = (() => {
    if (!activeFile) return false;
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return activeFile === `Daily Notes/${y}-${m}-${d}.md`;
  })();
  const isCanvas = activeFile?.endsWith('.canvas') ?? false;
  const isGraph = view === 'graph';
  const activeNav = isGraph
    ? 'graph'
    : isCanvas
    ? 'canvas'
    : isToday
    ? 'today'
    : 'all';

  return (
    <aside className="sidebar w-60 shrink-0 flex flex-col border-r border-border bg-bg-elevated overflow-hidden">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 pt-[18px] pb-3.5 border-b border-border-subtle">
        <button
          onClick={() => {
            if (window.confirm('Close vault and pick another?')) closeVault();
          }}
          title={vaultPath ?? ''}
          className="w-[22px] h-[22px] rounded-md bg-text text-bg grid place-items-center font-serif font-semibold italic text-[13px] shrink-0"
        >
          S
        </button>
        <div className="font-serif text-[16px] font-semibold tracking-tight text-text truncate flex-1 text-left">
          {vaultName}
        </div>
        <span className="font-mono text-[10.5px] text-text-muted uppercase tracking-[0.08em] shrink-0">
          v0.1
        </span>
      </div>

      {/* Search */}
      <button
        onClick={onOpenPalette}
        className="mx-3 mt-3 mb-1 px-2.5 py-[7px] bg-bg border border-border rounded-md flex items-center gap-2 text-text-muted text-[12px] hover:border-accent/40 transition-colors"
      >
        <Search size={13} />
        <span className="flex-1 text-left">Search or jump to…</span>
        <kbd className="ml-auto font-mono text-[10px] px-[5px] py-[1px] rounded bg-bg-hover border border-border text-text-muted">
          ⌘K
        </kbd>
      </button>

      {/* Main nav */}
      <nav className="px-2 pt-1 pb-1">
        <NavItem
          icon={<Sun size={14} />}
          label="Today"
          active={activeNav === 'today'}
          onClick={() => openOrCreateDaily()}
        />
        <NavItem
          icon={<Book size={14} />}
          label="All notes"
          active={activeNav === 'all'}
          onClick={() => {
            // Just makes sure we're in editor view; the tree below shows all
            setView('editor');
          }}
          count={fileCount}
        />
        <NavItem
          icon={<GraphIcon />}
          label="Connections"
          active={activeNav === 'graph'}
          onClick={() => setView('graph')}
        />
        <NavItem
          icon={<CanvasIcon />}
          label="Canvas"
          active={activeNav === 'canvas'}
          onClick={() => {
            // Open the first .canvas file we have, or create one
            const first = [...useVault.getState().files.values()].find((f) =>
              f.rel.endsWith('.canvas')
            );
            if (first) {
              useVault.getState().openFile(first.rel);
            } else {
              const name = window.prompt('Canvas name:', 'Untitled canvas');
              if (name?.trim()) useVault.getState().createCanvas(name.trim());
            }
          }}
        />
        <NavItem icon={<Star size={14} />} label="Pinned" count={0} />
      </nav>

      {/* My vault section header */}
      <SectionLabel
        label="My vault"
        action={
          <button
            onClick={() => createFile('Untitled')}
            className="hover:text-text transition-colors"
            title="New note"
          >
            <Plus size={11} />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <FileTree />

        {/* Tags subsection */}
        <div className="mt-1">
          <button
            onClick={() => setTagsOpen(!tagsOpen)}
            className={cn(
              'w-full flex items-center gap-1 px-3.5 pt-3 pb-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-text-subtle hover:text-text-muted transition-colors'
            )}
          >
            {tagsOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            <span>Tags</span>
          </button>
          {tagsOpen && <TagPanel />}
        </div>
      </div>

      <BacklinksPanel />

      {/* Footer */}
      <div className="border-t border-border-subtle px-3 py-2.5 flex items-center gap-2 text-[11px] text-text-muted">
        <span className="inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full bg-tag-soft text-tag text-[10.5px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-tag" />
          Saved on your Mac
        </span>
      </div>
    </aside>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-2.5 py-[6px] rounded-md text-[12.5px] transition-colors',
        active
          ? 'bg-bg-hover text-text font-medium'
          : 'text-text-muted hover:bg-bg-hover hover:text-text'
      )}
    >
      <span className="text-text-muted">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {typeof count === 'number' && count > 0 && (
        <span className="font-mono text-[10.5px] text-text-subtle">{count}</span>
      )}
    </button>
  );
}

function SectionLabel({
  label,
  action,
}: {
  label: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-3.5 pt-[14px] pb-[6px] font-mono text-[10px] uppercase tracking-[0.1em] text-text-subtle">
      <span>{label}</span>
      {action && <span className="text-text-subtle">{action}</span>}
    </div>
  );
}

/** Small custom graph icon matching Side's aesthetic */
function GraphIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <circle cx="12" cy="6" r="2.5" />
      <path d="m11 8-4 8M13 8l4 8M8 18h8" />
    </svg>
  );
}

function CanvasIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <rect x="6" y="6" width="5" height="5" rx="0.5" />
      <rect x="13" y="13" width="5" height="5" rx="0.5" />
      <path d="m11 8 2 5" />
    </svg>
  );
}
