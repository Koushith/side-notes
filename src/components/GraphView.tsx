import { useEffect, useMemo, useRef, useState } from 'react';
import Sigma from 'sigma';
import { NodeCircleProgram } from 'sigma/rendering';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { useVault } from '@/stores/vault';
import { useTheme } from '@/stores/theme';
import { resolveWikilink } from '@/lib/markdown';
import { Maximize2, Compass, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Read a `--c-*` CSS variable (stored as "R G B" triples) and return an `rgb(...)` color
 *  Sigma can ingest. We re-read these on every render that depends on the theme so
 *  switching theme/mode repaints the graph correctly. */
function readVar(name: string, fallback = '0 0 0'): string {
  const triple = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  return `rgb(${triple})`;
}

// Categorical palette for folders — soft pastels that read well on dark bg.
const PALETTE = [
  '#7c8cff', // accent
  '#7cd4ff', // link
  '#f0a868', // tag
  '#9ee493',
  '#ff9ec5',
  '#c8a8ff',
  '#ffd166',
  '#7ee0c4',
  '#ff8a7a',
  '#a8b3d1',
];

function colorForFolder(folderKey: string): string {
  let h = 0;
  for (let i = 0; i < folderKey.length; i++) h = (h * 31 + folderKey.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function GraphView() {
  const files = useVault((s) => s.files);
  const openFile = useVault((s) => s.openFile);
  const setView = useVault((s) => s.setView);
  const activeFile = useVault((s) => s.activeFile);
  const themeKey = useTheme((s) => s.theme);
  const themeMode = useTheme((s) => s.mode);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [localMode, setLocalMode] = useState(false);

  const { nodeCount, edgeCount } = useMemo(() => {
    let edges = 0;
    const filesArr = [...files.values()];
    for (const f of filesArr) {
      for (const link of f.links) {
        const r = resolveWikilink(link, filesArr);
        if (r) edges++;
      }
    }
    return { nodeCount: filesArr.length, edgeCount: edges };
  }, [files]);

  // Folder legend (top folders only)
  const folderLegend = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of files.values()) {
      const top = f.rel.split('/')[0];
      const key = f.rel.includes('/') ? top : '/';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([key, count]) => ({ key, label: key === '/' ? 'root' : key, count, color: colorForFolder(key) }));
  }, [files]);

  useEffect(() => {
    if (!containerRef.current) return;
    const filesArr = [...files.values()];
    if (filesArr.length === 0) return;

    // Build the full graph
    const graph = new Graph({ multi: false, type: 'undirected' });

    const degree = new Map<string, number>();
    const edges: [string, string][] = [];
    for (const f of filesArr) {
      degree.set(f.rel, degree.get(f.rel) ?? 0);
      for (const link of f.links) {
        const r = resolveWikilink(link, filesArr);
        if (r && r !== f.rel) {
          const a = f.rel < r ? f.rel : r;
          const b = f.rel < r ? r : f.rel;
          edges.push([a, b]);
          degree.set(a, (degree.get(a) ?? 0) + 1);
          degree.set(b, (degree.get(b) ?? 0) + 1);
        }
      }
    }

    for (const f of filesArr) {
      const d = degree.get(f.rel) ?? 0;
      const top = f.rel.split('/')[0];
      const folderKey = f.rel.includes('/') ? top : '/';
      graph.addNode(f.rel, {
        label: f.title || f.name,
        x: Math.random(),
        y: Math.random(),
        size: 4 + Math.min(d, 12) * 0.9,
        color: colorForFolder(folderKey),
        folderKey,
      });
    }
    const seen = new Set<string>();
    for (const [a, b] of edges) {
      const k = `${a}::${b}`;
      if (seen.has(k)) continue;
      seen.add(k);
      try {
        graph.addEdge(a, b, { color: '#252a36', size: 0.8 });
      } catch {
        /* dup edge, ignore */
      }
    }

    // Local mode: drop everything outside neighborhood of activeFile
    if (localMode && activeFile && graph.hasNode(activeFile)) {
      const keep = new Set<string>([activeFile, ...graph.neighbors(activeFile)]);
      // include 2nd-degree?
      for (const n of graph.neighbors(activeFile)) {
        for (const m of graph.neighbors(n)) keep.add(m);
      }
      for (const n of graph.nodes()) {
        if (!keep.has(n)) graph.dropNode(n);
      }
    }

    if (graph.order === 0) return;

    const settings = forceAtlas2.inferSettings(graph);
    forceAtlas2.assign(graph, { iterations: 200, settings });

    // Read theme colors so labels/edges/fades stay legible on every palette + mode.
    const inkColor = readVar('--c-text');
    const ruleColor = readVar('--c-border');
    const fadeColor = readVar('--c-bg-hover');
    const accentColor = readVar('--c-accent');
    const nodeFadeColor = readVar('--c-bg-hover');

    const renderer = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      defaultNodeType: 'circle',
      nodeProgramClasses: { circle: NodeCircleProgram },
      labelColor: { color: inkColor },
      labelSize: 12,
      labelWeight: '500',
      labelDensity: 0.7,
      labelGridCellSize: 80,
      defaultEdgeColor: ruleColor,
      minCameraRatio: 0.1,
      maxCameraRatio: 10,
    });

    sigmaRef.current = renderer;

    let hovered: string | null = null;

    const computeHighlightSet = (n: string): Set<string> => {
      const set = new Set<string>([n]);
      for (const nb of graph.neighbors(n)) set.add(nb);
      return set;
    };

    renderer.setSetting('nodeReducer', (node, data) => {
      if (!hovered) {
        return data;
      }
      const highlight = computeHighlightSet(hovered);
      if (highlight.has(node)) return { ...data, zIndex: 1 };
      return { ...data, color: nodeFadeColor, label: '', zIndex: 0 };
    });
    renderer.setSetting('edgeReducer', (edge, data) => {
      if (!hovered) return data;
      const [s, t] = graph.extremities(edge);
      if (s === hovered || t === hovered) return { ...data, color: accentColor, size: 1.3 };
      return { ...data, color: fadeColor };
    });

    renderer.on('clickNode', ({ node }) => {
      openFile(node);
      setView('editor');
    });
    renderer.on('enterNode', ({ node }) => {
      hovered = node;
      setHover(node);
      containerRef.current!.style.cursor = 'pointer';
      renderer.refresh({ skipIndexation: true });
    });
    renderer.on('leaveNode', () => {
      hovered = null;
      setHover(null);
      containerRef.current!.style.cursor = 'default';
      renderer.refresh({ skipIndexation: true });
    });

    // ---- Manual node drag ----
    let dragNode: string | null = null;
    let isDragging = false;
    renderer.on('downNode', (e) => {
      isDragging = true;
      dragNode = e.node;
      graph.setNodeAttribute(dragNode, 'highlighted', true);
    });
    renderer.getMouseCaptor().on('mousemovebody', (e) => {
      if (!isDragging || !dragNode) return;
      const pos = renderer.viewportToGraph(e);
      graph.setNodeAttribute(dragNode, 'x', pos.x);
      graph.setNodeAttribute(dragNode, 'y', pos.y);
      e.preventSigmaDefault();
      e.original.preventDefault();
      e.original.stopPropagation();
    });
    const stopDrag = () => {
      if (dragNode) graph.removeNodeAttribute(dragNode, 'highlighted');
      isDragging = false;
      dragNode = null;
    };
    renderer.getMouseCaptor().on('mouseup', stopDrag);
    renderer.getMouseCaptor().on('mouseleave', stopDrag);

    // Settle FA2 a few extra frames for smoothness
    let frame = 0;
    const tick = () => {
      if (!isDragging) {
        forceAtlas2.assign(graph, { iterations: 1, settings });
      }
      renderer.refresh({ skipIndexation: false });
      frame++;
      if (frame < 80) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    return () => {
      renderer.kill();
      sigmaRef.current = null;
    };
  }, [files, activeFile, localMode, openFile, setView, themeKey, themeMode]);

  return (
    <div className="relative w-full h-full bg-bg">
      <div ref={containerRef} className="absolute inset-0" />

      <div className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-none">
        <div className="px-3 py-2 rounded-lg bg-bg-elevated/80 backdrop-blur border border-border font-mono text-[10.5px] uppercase tracking-[0.08em] flex items-center gap-2">
          <span className="text-text-muted">{nodeCount} notes · {edgeCount} links</span>
        </div>
        {folderLegend.length > 1 && (
          <div className="px-3 py-2 rounded-lg bg-bg-elevated/80 backdrop-blur border border-border text-xs">
            <div className="text-[10px] uppercase tracking-wider text-text-subtle mb-1">Folders</div>
            <div className="flex flex-col gap-1">
              {folderLegend.map(({ key, label, count, color }) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-text-muted truncate max-w-[140px]">{label}</span>
                  <span className="text-text-subtle">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {hover && (
        <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-md bg-bg-elevated border border-border text-xs text-text pointer-events-none">
          {files.get(hover)?.title || hover}
        </div>
      )}

      <div className="absolute top-3 right-3 flex gap-2">
        <button
          disabled={!activeFile}
          onClick={() => setLocalMode((v) => !v)}
          className={cn(
            'p-2 rounded-md backdrop-blur border transition-colors',
            localMode
              ? 'bg-accent/20 border-accent/50 text-accent'
              : 'bg-bg-elevated/80 border-border text-text-muted hover:text-text hover:bg-bg-hover',
            !activeFile && 'opacity-40 cursor-not-allowed'
          )}
          title={localMode ? 'Show full graph' : 'Show local graph (active note neighborhood)'}
        >
          {localMode ? <Compass size={14} /> : <Globe size={14} />}
        </button>
        <button
          onClick={() => sigmaRef.current?.getCamera().animatedReset()}
          className="p-2 rounded-md bg-bg-elevated/80 backdrop-blur border border-border text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
          title="Reset view"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {nodeCount === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="font-serif text-[18px] font-semibold text-text mb-1">No connections yet.</div>
            <div className="font-serif text-[13px] text-text-muted">
              Link notes with <span className="font-mono text-text">[[brackets]]</span> to see them appear here.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
