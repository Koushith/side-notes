import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useVault } from '@/stores/vault';
import { useGit } from '@/stores/git';
import { useEditorRef } from '@/stores/editorRef';
import { useUi } from '@/stores/ui';
import { useOnboarding } from '@/stores/onboarding';
import { Sidebar } from '@/components/navigation/Sidebar';
import { TitleBar } from '@/components/navigation/TitleBar';
import { TabBar } from '@/components/navigation/TabBar';
import { Editor } from '@/components/editor/Editor';
import { RawEditor } from '@/components/editor/RawEditor';
import { CanvasView } from '@/components/views/CanvasView';
import { ExcalidrawView } from '@/components/views/ExcalidrawView';
import { AttachmentViewer } from '@/components/views/AttachmentViewer';
import { isViewablePath as isViewable, isCodePath, isMarkdownPath } from '@/lib/utils';
import { GraphView } from '@/components/views/GraphView';
import { AllNotesView } from '@/components/views/AllNotesView';
import { EmptyState } from '@/components/shared/EmptyState';
import { WelcomeNote } from '@/components/shared/WelcomeNote';
import { RightPanel } from '@/components/panels/RightPanel';
import { SourceControlPanel } from '@/components/panels/SourceControlPanel';
import { CommandPalette } from '@/components/navigation/CommandPalette';
import { Onboarding } from '@/components/modals/Onboarding';
import { ShortcutsHelp } from '@/components/modals/ShortcutsHelp';
import { WhatsNew, shouldShowWhatsNew, markWhatsNewSeen } from '@/components/modals/WhatsNew';
import { About } from '@/components/modals/About';
import { VaultSwitcher } from '@/components/modals/VaultSwitcher';
import { AISettings } from '@/components/ai/AISettings';
import { VoiceDictation } from '@/components/shared/VoiceDictation';
import { Lightbox } from '@/components/modals/Lightbox';
import { PromptHost } from '@/components/modals/PromptDialog';
import { ConfirmHost } from '@/components/modals/ConfirmDialog';
import { ToastHost } from '@/components/shared/Toast';

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
  const rawMode = useUi((s) => s.rawMode);
  const aiSettingsOpen = useUi((s) => s.aiSettingsOpen);
  const setAiSettingsOpen = useUi((s) => s.setAiSettingsOpen);

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
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  // Refresh git status whenever the vault changes so the sidebar badge is right
  // before the user opens the panel.
  useEffect(() => {
    if (vaultPath) useGit.getState().refresh();
  }, [vaultPath]);

  // Keep git status live: debounce-refresh whenever files change on disk (edits,
  // creates, deletes, pulls). Without this the Source Control panel + sidebar
  // change badge go stale until you manually refresh or reopen the panel.
  useEffect(() => {
    if (!vaultPath) return;
    let timer: number | null = null;
    const unsubscribe = api.watch.onEvent(() => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        // Don't fight an in-flight git action — it refreshes itself when done.
        if (!useGit.getState().busy) useGit.getState().refresh();
      }, 400);
    });
    return () => {
      if (timer) window.clearTimeout(timer);
      unsubscribe();
    };
  }, [vaultPath]);

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
      } else if (e.key === ',') {
        // macOS convention for "preferences" — opens the AI/global settings modal.
        e.preventDefault();
        setAiSettingsOpen(!useUi.getState().aiSettingsOpen);
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
  }, [setView, createFile, openOrCreateDaily, vaultPath, activeFile, closeTab, toggleFocus, setFocusMode, setAiSettingsOpen]);

  if (!vaultPath) {
    return (
      <>
        <EmptyState onOpenVaultSwitcher={() => setVaultSwitcherOpen(true)} />
        <Onboarding />
        <ShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
        <WhatsNew open={whatsNewOpen} onClose={() => setWhatsNewOpen(false)} />
        <About open={aboutOpen} onClose={() => setAboutOpen(false)} />
        <VaultSwitcher open={vaultSwitcherOpen} onClose={() => setVaultSwitcherOpen(false)} />
        <AISettings open={aiSettingsOpen} onClose={() => setAiSettingsOpen(false)} />
        <PromptHost />
        <ConfirmHost />
        <ToastHost />
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
          onShowAbout={() => setAboutOpen(true)}
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
              ) : view === 'git' ? (
                <SourceControlPanel />
              ) : activeFile ? (
                activeFile.endsWith('.canvas') ? (
                  <CanvasView key={activeFile} rel={activeFile} vaultPath={vaultPath} />
                ) : activeFile.endsWith('.excalidraw') ? (
                  <ExcalidrawView key={activeFile} rel={activeFile} vaultPath={vaultPath} />
                ) : isViewable(activeFile) ? (
                  <AttachmentViewer key={activeFile} rel={activeFile} vaultPath={vaultPath} />
                ) : isCodePath(activeFile) ? (
                  <RawEditor key={activeFile} rel={activeFile} vaultPath={vaultPath} />
                ) : rawMode ? (
                  <RawEditor key={activeFile} rel={activeFile} vaultPath={vaultPath} />
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
          {!inFocus && view === 'editor' && activeFile && !activeFile.endsWith('.canvas') && <RightPanel />}
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
      <About open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <VaultSwitcher open={vaultSwitcherOpen} onClose={() => setVaultSwitcherOpen(false)} />
      <AISettings open={aiSettingsOpen} onClose={() => setAiSettingsOpen(false)} />
      <VoiceDictation />
      <Lightbox />
      <PromptHost />
      <ConfirmHost />
      <ToastHost />
    </div>
  );
}
