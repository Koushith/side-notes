import { useRef, useState } from 'react';
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
  Pin,
  Megaphone,
} from 'lucide-react';
import { useVault } from '@/stores/vault';
import { useTheme } from '@/stores/theme';
import { useUi } from '@/stores/ui';
import { ThemePicker } from './ThemePicker';
import { cn } from '@/lib/utils';
import { exportHtml, exportMarkdown, exportPdf } from '@/lib/export';

interface Props {
  onOpenPalette: () => void;
  onShowShortcuts?: () => void;
  onShowWhatsNew?: () => void;
  onGetEditorHtml?: () => string | null;
}

export function TitleBar({ onOpenPalette, onShowShortcuts, onShowWhatsNew, onGetEditorHtml }: Props) {
  const view = useVault((s) => s.view);
  const setView = useVault((s) => s.setView);
  const vaultPath = useVault((s) => s.vaultPath);
  const createFile = useVault((s) => s.createFile);
  const openOrCreateDaily = useVault((s) => s.openOrCreateDaily);
  const activeFile = useVault((s) => s.activeFile);
  const files = useVault((s) => s.files);
  const isPinned = useVault((s) => activeFile ? s.pinned.has(activeFile) : false);
  const togglePin = useVault((s) => s.togglePin);

  const mode = useTheme((s) => s.mode);
  const toggleFocus = useUi((s) => s.toggleFocus);

  const [moreOpen, setMoreOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [themeAnchor, setThemeAnchor] = useState<{ right: number; bottom: number; top: number; left: number } | null>(null);
  const themeBtnRef = useRef<HTMLButtonElement | null>(null);

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
        <button
          onClick={() => activeFile && togglePin(activeFile)}
          disabled={!activeFile || activeFile.endsWith('.canvas')}
          title={isPinned ? 'Unpin Note' : 'Pin Note'}
          className={cn(
            'press w-7 h-7 grid place-items-center rounded-md disabled:opacity-40 disabled:cursor-not-allowed',
            isPinned
              ? 'text-accent hover:bg-bg-elevated'
              : 'text-text-muted hover:text-text hover:bg-bg-elevated'
          )}
        >
          <Pin
            key={isPinned ? 'on' : 'off'}
            size={14}
            className={cn(isPinned && 'fill-current anim-pop')}
          />
        </button>
        <IconBtn
          onClick={toggleFocus}
          disabled={!activeFile || activeFile.endsWith('.canvas')}
          title="Focus Mode (⌘.)"
        >
          <Focus size={14} />
        </IconBtn>
        <IconBtn
          onClick={onShowWhatsNew}
          title="What's New"
        >
          <Megaphone size={14} />
        </IconBtn>
        <IconBtn
          onClick={onShowShortcuts}
          title="Keyboard Shortcuts (⌘/)"
        >
          <Keyboard size={14} />
        </IconBtn>
        <button
          ref={themeBtnRef}
          onClick={() => {
            const rect = themeBtnRef.current?.getBoundingClientRect();
            if (rect) {
              setThemeAnchor({
                right: rect.right,
                bottom: rect.bottom,
                top: rect.top,
                left: rect.left,
              });
            }
            setThemeOpen((v) => !v);
          }}
          className="w-7 h-7 grid place-items-center rounded-md text-text-muted hover:text-text hover:bg-bg-elevated transition-colors"
          title="Theme & Mode"
        >
          {mode === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <IconBtn
          onClick={() => openOrCreateDaily()}
          disabled={!vaultPath}
          title="Today's Daily Note (⌘D)"
        >
          <Calendar size={14} />
        </IconBtn>
        <IconBtn
          onClick={() => createFile('Untitled')}
          disabled={!vaultPath}
          title="New Note (⌘N)"
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
              Insert from Template…
            </Item>
            <div className="my-1 border-t border-border" />
            <Item
              icon={<FileDown size={13} />}
              onClick={() => {
                setMoreOpen(false);
                useVault.getState().closeVault();
              }}
            >
              Close Vault
            </Item>
          </div>
        )}
        </div>
      </div>
      <ThemePicker
        open={themeOpen}
        onClose={() => setThemeOpen(false)}
        anchor={themeAnchor}
      />
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
      className="press w-7 h-7 grid place-items-center rounded-md text-text-muted hover:text-text hover:bg-bg-elevated disabled:opacity-40 disabled:cursor-not-allowed"
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
