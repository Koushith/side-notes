import '@excalidraw/excalidraw/index.css';
import { Excalidraw, serializeAsJSON } from '@excalidraw/excalidraw';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { joinPath } from '@/lib/utils';
import { useTheme } from '@/stores/theme';
import { toast } from '../shared/Toast';

// Minimal shape of the imperative API we use — avoids depending on Excalidraw's
// type-export path (which has moved between versions).
interface ExcalidrawAPI {
  updateScene: (scene: { elements?: unknown[]; appState?: Record<string, unknown> }) => void;
  addFiles: (files: unknown[]) => void;
  getSceneElements: () => readonly unknown[];
  getAppState: () => Record<string, unknown>;
  getFiles: () => Record<string, unknown>;
}

interface Props {
  rel: string;
  vaultPath: string;
}

export function ExcalidrawCanvas({ rel, vaultPath }: Props) {
  // undefined = still loading, null = failed, object = loaded scene
  const [initialData, setInitialData] = useState<Record<string, unknown> | null | undefined>(undefined);
  const mode = useTheme((s) => s.mode);

  const apiRef = useRef<ExcalidrawAPI | null>(null);
  const lastSaved = useRef<string>(''); // serializeAsJSON form last written/loaded
  const ready = useRef(false); // becomes true after the first onChange seeds lastSaved
  const saveTimer = useRef<number | null>(null);
  const relRef = useRef(rel);
  relRef.current = rel;

  // Load the file once per rel.
  useEffect(() => {
    let cancelled = false;
    ready.current = false;
    (async () => {
      try {
        const raw = await api.files.read(joinPath(vaultPath, rel));
        if (cancelled) return;
        const parsed = raw.trim() ? JSON.parse(raw) : {};
        setInitialData({
          elements: parsed.elements ?? [],
          appState: { ...(parsed.appState ?? {}), collaborators: undefined },
          files: parsed.files ?? {},
          scrollToContent: true,
        });
      } catch (err) {
        console.error('Failed to load drawing', err);
        setInitialData(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rel, vaultPath]);

  // Flush a pending save when switching files / unmounting.
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
    };
  }, [rel]);

  const onChange = (
    elements: readonly unknown[],
    appState: Record<string, unknown>,
    files: Record<string, unknown>
  ) => {
    // 'local' strips volatile/view state (zoom, scroll, collaborators), so panning
    // or zooming doesn't register as an edit.
    const json = serializeAsJSON(elements as never, appState as never, files as never, 'local');
    // First onChange after load just seeds the baseline — don't write the file.
    if (!ready.current) {
      ready.current = true;
      lastSaved.current = json;
      return;
    }
    if (json === lastSaved.current) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    const targetRel = relRef.current;
    saveTimer.current = window.setTimeout(async () => {
      try {
        await api.files.write(joinPath(vaultPath, targetRel), json);
        lastSaved.current = json;
      } catch (err) {
        console.error('Failed to save drawing', err);
      }
    }, 500);
  };

  // External-change watcher — mirrors the markdown editor's file-safety rule:
  // never silently overwrite an external write; reload only when there are no
  // unsaved local edits.
  useEffect(() => {
    const unsubscribe = api.watch.onEvent(async (e: { type: string; path: string }) => {
      if (e.type !== 'change' && e.type !== 'add') return;
      const changedRel = e.path.replace(vaultPath, '').replace(/^[\\/]+/, '');
      if (changedRel !== relRef.current) return;
      const ex = apiRef.current;
      if (!ex) return;
      try {
        const fresh = await api.files.read(e.path);
        if (fresh === lastSaved.current) return; // echo of our own write
        // Do we have unsaved local edits right now?
        const live = serializeAsJSON(
          ex.getSceneElements() as never,
          ex.getAppState() as never,
          ex.getFiles() as never,
          'local'
        );
        if (live !== lastSaved.current) {
          toast.error(
            `"${changedRel}" changed on disk while you had unsaved edits — your local drawing is kept. Re-open the tab to load the disk version.`
          );
          return;
        }
        // Safe to reload.
        const parsed = JSON.parse(fresh);
        ex.addFiles(Object.values(parsed.files ?? {}));
        ex.updateScene({ elements: parsed.elements ?? [], appState: parsed.appState ?? {} });
        lastSaved.current = fresh;
      } catch (err) {
        console.warn('Drawing external-change reload failed', err);
      }
    });
    return unsubscribe;
  }, [vaultPath]);

  if (initialData === undefined) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted text-sm">
        Loading drawing…
      </div>
    );
  }
  if (initialData === null) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted text-sm">
        Couldn't open this drawing.
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <Excalidraw
        initialData={initialData as never}
        excalidrawAPI={(a: unknown) => {
          apiRef.current = a as ExcalidrawAPI;
        }}
        onChange={onChange as never}
        theme={mode === 'dark' ? 'dark' : 'light'}
      />
    </div>
  );
}
