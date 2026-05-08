import { useEffect, useState } from 'react';
import { useVault } from '@/stores/vault';
import { useEditorRef } from '@/stores/editorRef';
import { useUi } from '@/stores/ui';
import { useOnboarding } from '@/stores/onboarding';
import { Sidebar } from '@/components/Sidebar';
import { TitleBar } from '@/components/TitleBar';
import { TabBar } from '@/components/TabBar';
import { Editor } from '@/components/Editor';
import { CanvasView } from '@/components/CanvasView';
import { GraphView } from '@/components/GraphView';
import { AllNotesView } from '@/components/AllNotesView';
import { EmptyState } from '@/components/EmptyState';
import { WelcomeNote } from '@/components/WelcomeNote';
import { ConnectionsPanel } from '@/components/ConnectionsPanel';
import { CommandPalette } from '@/components/CommandPalette';
import { Onboarding } from '@/components/Onboarding';
import { ShortcutsHelp } from '@/components/ShortcutsHelp';
import { WhatsNew, shouldShowWhatsNew, markWhatsNewSeen } from '@/components/WhatsNew';
import { VaultSwitcher } from '@/components/VaultSwitcher';

export default function App() {
  const init = useVault((s) => s.init);
  const vaultPath = useVault((s) => s.vaultPath);
  const view = useVault((s) => s.view);
  const activeFile = useVault((s) => s.activeFile);
  const loading = useVault((s) => s.loading);
  const setView = useVault((s) => s.setView);
  const createFile = useVault((s) => s.createFile);
  const openOrCreateDaily = useVault((s) => s.openOrCreateDaily);
  const closeTab = useVault((s) => s.closeTab);
  const focusMode = useUi((s) => s.focusMode);
  const toggleFocus = useUi((s) => s.toggleFocus);
  const setFocusMode = useUi((s) => s.setFocusMode);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const onboardingCompleted = useOnboarding((s) => s.completed);
  const startOnboarding = useOnboarding((s) => s.start);
  // First-run users see the onboarding tour, not the changelog. Mark the current
  // changelog as "seen" so it stays quiet — they'll only see future updates.
  const [whatsNewOpen, setWhatsNewOpen] = useState(() => {
    if (!onboardingCompleted) {
      markWhatsNewSeen();
      return false;
    }
    return shouldShowWhatsNew();
  });
  const [vaultSwitcherOpen, setVaultSwitcherOpen] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  // First-run: surface the onboarding tour automatically.
  useEffect(() => {
    if (!onboardingCompleted) {
      const t = window.setTimeout(() => startOnboarding(), 250);
      return () => window.clearTimeout(t);
    }
  }, [onboardingCompleted, startOnboarding]);

  // Global shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === 'k') {
        e.preventDefault();
        if (vaultPath) setPaletteOpen((v) => !v);
      } else if (e.key === '1') {
        e.preventDefault();
        setView('editor');
      } else if (e.key === '2') {
        e.preventDefault();
        setView('graph');
      } else if (e.key === 'n') {
        e.preventDefault();
        if (vaultPath) createFile('Untitled');
      } else if (e.key === 'd') {
        e.preventDefault();
        if (vaultPath) openOrCreateDaily();
      } else if (e.key === 'w') {
        e.preventDefault();
        if (activeFile) closeTab(activeFile);
      } else if (e.key === '.') {
        e.preventDefault();
        toggleFocus();
      } else if (e.key === '/') {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      }
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useUi.getState().focusMode) {
        setFocusMode(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('keydown', onEscape);
    };
  }, [setView, createFile, openOrCreateDaily, vaultPath, activeFile, closeTab, toggleFocus, setFocusMode]);

  if (!vaultPath) {
    return (
      <>
        <EmptyState onOpenVaultSwitcher={() => setVaultSwitcherOpen(true)} />
        <Onboarding />
        <ShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
        <WhatsNew open={whatsNewOpen} onClose={() => setWhatsNewOpen(false)} />
        <VaultSwitcher open={vaultSwitcherOpen} onClose={() => setVaultSwitcherOpen(false)} />
      </>
    );
  }

  // Focus mode collapses chrome around an editor. Only applies when actually editing a note.
  const inFocus = focusMode && view === 'editor' && activeFile && !activeFile.endsWith('.canvas');

  return (
    <div className="h-screen w-screen flex flex-col bg-bg overflow-hidden">
      {!inFocus && (
        <TitleBar
          onOpenPalette={() => setPaletteOpen(true)}
          onShowShortcuts={() => setShortcutsOpen(true)}
          onShowWhatsNew={() => setWhatsNewOpen(true)}
          onGetEditorHtml={() => useEditorRef.getState().editor?.getHTML() ?? null}
        />
      )}
      <div className="flex flex-1 overflow-hidden">
        {!inFocus && <Sidebar onOpenPalette={() => setPaletteOpen(true)} onOpenVaultSwitcher={() => setVaultSwitcherOpen(true)} />}
        <main className="flex-1 overflow-hidden bg-bg flex">
          <div className="flex-1 overflow-hidden flex flex-col">
            {!inFocus && view === 'editor' && <TabBar />}
            <div className="flex-1 overflow-hidden relative">
              {loading ? (
                <div className="h-full flex items-center justify-center text-text-muted text-sm">
                  Indexing your vault…
                </div>
              ) : view === 'graph' ? (
                <GraphView />
              ) : view === 'all' ? (
                <AllNotesView />
              ) : activeFile ? (
                activeFile.endsWith('.canvas') ? (
                  <CanvasView key={activeFile} rel={activeFile} vaultPath={vaultPath} />
                ) : (
                  <Editor key={activeFile} rel={activeFile} vaultPath={vaultPath} />
                )
              ) : (
                <WelcomeNote />
              )}
              {inFocus && (
                <button
                  onClick={toggleFocus}
                  className="absolute top-4 right-4 px-2.5 py-1 text-[11px] rounded-md border border-border bg-bg-elevated/80 backdrop-blur text-text-subtle hover:text-text"
                  title="Exit focus mode (Esc / ⌘.)"
                >
                  Exit focus
                </button>
              )}
            </div>
          </div>
          {!inFocus && view === 'editor' && activeFile && !activeFile.endsWith('.canvas') && <ConnectionsPanel />}
        </main>
      </div>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onShowShortcuts={() => setShortcutsOpen(true)}
        onShowWhatsNew={() => setWhatsNewOpen(true)}
        onOpenVaultSwitcher={() => setVaultSwitcherOpen(true)}
      />
      <Onboarding />
      <ShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <WhatsNew open={whatsNewOpen} onClose={() => setWhatsNewOpen(false)} />
      <VaultSwitcher open={vaultSwitcherOpen} onClose={() => setVaultSwitcherOpen(false)} />
    </div>
  );
}
