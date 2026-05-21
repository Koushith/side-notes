import { useEffect, useRef, useState } from 'react';
import {
  Sun,
  Book,
  Star,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  FilePlus,
  FolderPlus,
  LayoutGrid,
} from 'lucide-react';
import { useVault } from '@/stores/vault';
import { FileTree } from './FileTree';
import { TagPanel } from './TagPanel';
import { cn } from '@/lib/utils';
import { promptUser } from './PromptDialog';
import { toast } from './Toast';

interface Props {
  onOpenPalette: () => void;
  onOpenVaultSwitcher: () => void;
}

export function Sidebar({ onOpenPalette, onOpenVaultSwitcher }: Props) {
  const vaultPath = useVault((s) => s.vaultPath);
  const fileCount = useVault((s) => s.files.size);
  const view = useVault((s) => s.view);
  const setView = useVault((s) => s.setView);
  const activeFile = useVault((s) => s.activeFile);
  const openOrCreateDaily = useVault((s) => s.openOrCreateDaily);
  const pinnedCount = useVault((s) => s.pinned.size);
  const pinnedOnly = useVault((s) => s.pinnedOnly);
  const setPinnedOnly = useVault((s) => s.setPinnedOnly);
  const setSearch = useVault((s) => s.setSearch);
  const setSelectedTag = useVault((s) => s.setSelectedTag);

  const [tagsOpen, setTagsOpen] = useState(true);

  const rawVaultName = vaultPath?.split(/[\\/]/).pop() ?? 'SideNotes';
  // Brand display: "sidenotes" folder always shows as "SideNotes" (brand title case).
  const vaultName = rawVaultName.toLowerCase() === 'sidenotes' ? 'SideNotes' : rawVaultName;

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
  const isAll = view === 'all';
  const activeNav = isGraph
    ? 'graph'
    : isAll
    ? 'all'
    : pinnedOnly
    ? 'pinned'
    : isCanvas
    ? 'canvas'
    : isToday
    ? 'today'
    : null;

  return (
    <aside className="sidebar w-60 shrink-0 flex flex-col border-r border-border bg-bg-elevated overflow-hidden">
      {/* Vault header — click to switch vault */}
      <button
        onClick={onOpenVaultSwitcher}
        title="Switch vault"
        className="flex items-center gap-2.5 px-4 pt-[18px] pb-3.5 border-b border-border-subtle w-full hover:bg-bg-hover transition-colors group"
      >
        <span className="w-[22px] h-[22px] rounded-md bg-text text-bg grid place-items-center font-serif font-semibold italic text-[13px] shrink-0">
          S
        </span>
        <span className="font-serif text-[16px] font-semibold tracking-tight text-text truncate flex-1 text-left">
          {vaultName}
        </span>
        <ChevronsUpDown size={13} className="text-text-subtle shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

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
          onClick={() => {
            setPinnedOnly(false);
            openOrCreateDaily();
          }}
        />
        <NavItem
          icon={<Book size={14} />}
          label="All notes"
          active={activeNav === 'all'}
          onClick={() => {
            setPinnedOnly(false);
            setSearch('');
            setSelectedTag(null);
            setView('all');
          }}
          count={fileCount}
        />
        <NavItem
          icon={<GraphIcon />}
          label="Connections"
          active={activeNav === 'graph'}
          onClick={() => {
            setPinnedOnly(false);
            setView('graph');
          }}
        />
        <NavItem
          icon={<CanvasIcon />}
          label="Canvas"
          active={activeNav === 'canvas'}
          onClick={() => {
            setPinnedOnly(false);
            // Open the first .canvas file we have, or create one
            const first = [...useVault.getState().files.values()].find((f) =>
              f.rel.endsWith('.canvas')
            );
            if (first) {
              useVault.getState().openFile(first.rel);
            } else {
              promptUser({
                title: 'New Canvas',
                defaultValue: 'Untitled canvas',
                okLabel: 'Create',
              }).then((name) => {
                if (name?.trim()) useVault.getState().createCanvas(name.trim());
              });
            }
          }}
        />
        <NavItem
          icon={<Star size={14} />}
          label="Pinned"
          active={activeNav === 'pinned'}
          count={pinnedCount}
          onClick={() => {
            setSearch('');
            setSelectedTag(null);
            setView('editor');
            setPinnedOnly(!pinnedOnly);
          }}
        />
      </nav>

      {/* My vault section header */}
      <SectionLabel label="My vault" action={<NewItemMenu />} />

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
        'press nav-indicator w-full flex items-center gap-2.5 px-2.5 py-[6px] rounded-md text-[12.5px]',
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

function NewItemMenu() {
  const createFile = useVault((s) => s.createFile);
  const createCanvas = useVault((s) => s.createCanvas);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="hover:text-text transition-colors p-0.5"
        title="New…"
      >
        <Plus size={11} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 rounded-md border border-border bg-bg-elevated shadow-lg py-1 z-30">
          <NewItemMenuRow
            icon={<FilePlus size={13} />}
            label="New Note"
            onClick={async () => {
              setOpen(false);
              const name = await promptUser({
                title: 'New Note',
                defaultValue: 'Untitled',
                okLabel: 'Create',
              });
              if (name?.trim()) createFile(name.trim()).catch((err) => toast.error((err as Error).message));
            }}
          />
          <NewItemMenuRow
            icon={<FolderPlus size={13} />}
            label="New Folder"
            onClick={async () => {
              setOpen(false);
              const name = await promptUser({
                title: 'New Folder',
                defaultValue: 'New folder',
                okLabel: 'Create',
              });
              if (name?.trim()) {
                useVault.getState().createFolder(name.trim()).catch((err) => toast.error((err as Error).message));
              }
            }}
          />
          <NewItemMenuRow
            icon={<LayoutGrid size={13} />}
            label="New Canvas"
            onClick={async () => {
              setOpen(false);
              const name = await promptUser({
                title: 'New Canvas',
                defaultValue: 'Untitled canvas',
                okLabel: 'Create',
              });
              if (name?.trim()) createCanvas(name.trim()).catch((err) => toast.error((err as Error).message));
            }}
          />
        </div>
      )}
    </div>
  );
}

function NewItemMenuRow({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[12.5px] text-text-muted hover:bg-bg-hover hover:text-text transition-colors normal-case tracking-normal"
    >
      <span className="text-text-subtle">{icon}</span>
      <span>{label}</span>
    </button>
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
