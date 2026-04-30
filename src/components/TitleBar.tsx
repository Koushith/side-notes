import { useState } from 'react';
import {
  Plus,
  Calendar,
  Sun,
  Moon,
  MoreHorizontal,
  Download,
  FileDown,
  FileType2,
  FileCode2,
  PenSquare,
  Focus,
  Keyboard,
} from 'lucide-react';
import { useVault } from '@/stores/vault';
import { useTheme } from '@/stores/theme';
import { useUi } from '@/stores/ui';
import { cn } from '@/lib/utils';
import { exportHtml, exportMarkdown, exportPdf } from '@/lib/export';

interface Props {
  onOpenPalette: () => void;
  onShowShortcuts?: () => void;
  onGetEditorHtml?: () => string | null;
}

export function TitleBar({ onOpenPalette, onShowShortcuts, onGetEditorHtml }: Props) {
  const view = useVault((s) => s.view);
  const setView = useVault((s) => s.setView);
  const vaultPath = useVault((s) => s.vaultPath);
  const createFile = useVault((s) => s.createFile);
  const openOrCreateDaily = useVault((s) => s.openOrCreateDaily);
  const activeFile = useVault((s) => s.activeFile);
  const files = useVault((s) => s.files);

  const theme = useTheme((s) => s.theme);
  const toggleTheme = useTheme((s) => s.toggle);
  const toggleFocus = useUi((s) => s.toggleFocus);

  const [moreOpen, setMoreOpen] = useState(false);

  // Build breadcrumbs from active file path (Side topbar shows folder / sub / note)
  const crumbs: string[] = (() => {
    if (view === 'graph') return ['Connections'];
    if (!activeFile) return ['All notes'];
    const parts = activeFile.replace(/\.(md|canvas)$/i, '').split('/');
    return parts;
  })();

  return (
    <div className="titlebar h-11 flex items-center px-4 border-b border-border bg-bg select-none gap-3">
      {/* macOS traffic lights spacer */}
      <div className="w-14" />

      {/* Breadcrumbs */}
      <div className="flex-1 flex items-center gap-1.5 text-[12px] text-text-muted min-w-0">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <span className="text-text-subtle shrink-0">/</span>}
            {i === crumbs.length - 1 ? (
              <strong className="text-text font-medium truncate">{c}</strong>
            ) : (
              <span className="truncate">{c}</span>
            )}
          </span>
        ))}
      </div>

      {/* Topbar actions — icon buttons only, like Side */}
      <div className="no-drag flex items-center gap-1">
        <IconBtn
          onClick={toggleFocus}
          disabled={!activeFile || activeFile.endsWith('.canvas')}
          title="Focus mode (⌘.)"
        >
          <Focus size={14} />
        </IconBtn>
        <IconBtn
          onClick={onShowShortcuts}
          title="Keyboard shortcuts (⌘/)"
        >
          <Keyboard size={14} />
        </IconBtn>
        <IconBtn
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </IconBtn>
        <IconBtn
          onClick={() => openOrCreateDaily()}
          disabled={!vaultPath}
          title="Today's daily note (⌘D)"
        >
          <Calendar size={14} />
        </IconBtn>
        <IconBtn
          onClick={() => createFile('Untitled')}
          disabled={!vaultPath}
          title="New note (⌘N)"
        >
          <Plus size={14} />
        </IconBtn>

        <div className="relative">
          <IconBtn
            disabled={!vaultPath}
            onClick={() => setMoreOpen((v) => !v)}
            title="More"
          >
            <MoreHorizontal size={14} />
          </IconBtn>
          {moreOpen && (
          <div
            className="absolute right-0 top-full mt-1 z-50 w-52 rounded-lg border border-border bg-bg-elevated shadow-2xl py-1"
            onMouseLeave={() => setMoreOpen(false)}
          >
            <Item
              icon={<PenSquare size={13} />}
              disabled={!activeFile}
              onClick={async () => {
                setMoreOpen(false);
                if (!activeFile || !vaultPath) return;
                const title = files.get(activeFile)?.title || activeFile;
                const html = onGetEditorHtml?.() ?? '';
                await exportPdf(activeFile, title, html).catch((err) => window.alert(err.message));
              }}
            >
              Export as PDF
            </Item>
            <Item
              icon={<FileType2 size={13} />}
              disabled={!activeFile}
              onClick={async () => {
                setMoreOpen(false);
                if (!activeFile) return;
                const title = files.get(activeFile)?.title || activeFile;
                const html = onGetEditorHtml?.() ?? '';
                await exportHtml(activeFile, title, html).catch((err) => window.alert(err.message));
              }}
            >
              Export as HTML
            </Item>
            <Item
              icon={<FileCode2 size={13} />}
              disabled={!activeFile}
              onClick={async () => {
                setMoreOpen(false);
                if (!activeFile || !vaultPath) return;
                await exportMarkdown(vaultPath, activeFile).catch((err) => window.alert(err.message));
              }}
            >
              Export as Markdown
            </Item>
            <div className="my-1 border-t border-border" />
            <Item
              icon={<Download size={13} />}
              onClick={() => {
                setMoreOpen(false);
                onOpenPalette();
              }}
            >
              Insert from template…
            </Item>
            <div className="my-1 border-t border-border" />
            <Item
              icon={<FileDown size={13} />}
              onClick={() => {
                setMoreOpen(false);
                useVault.getState().closeVault();
              }}
            >
              Close vault
            </Item>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-7 h-7 grid place-items-center rounded-md text-text-muted hover:text-text hover:bg-bg-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}

function Item({
  icon,
  children,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-bg-hover',
        disabled ? 'text-text-subtle cursor-not-allowed' : 'text-text'
      )}
    >
      <span className="text-text-subtle">{icon}</span>
      {children}
    </button>
  );
}
