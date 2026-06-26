import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Sigma from 'sigma';
import { NodeCircleProgram } from 'sigma/rendering';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import louvain from 'graphology-communities-louvain';
import { bidirectional } from 'graphology-shortest-path/unweighted';
import { useVault } from '@/stores/vault';
import { useTheme } from '@/stores/theme';
import { resolveWikilink } from '@/lib/markdown';
import { Maximize2, Focus, Network, Route, Clock, Zap, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Theme helpers ───────────────────────────────────────────────────────────

function readVar(name: string, fallback = '0 0 0'): string {
  const triple = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  return `rgb(${triple})`;
}

function readVarRgba(name: string, alpha: number, fallback = '0 0 0'): string {
  const triple = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  const [r, g, b] = triple.split(/\s+/);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isBgDark(): boolean {
  const triple = getComputedStyle(document.documentElement).getPropertyValue('--c-bg').trim();
  if (!triple) return false;
  const [r, g, b] = triple.split(/\s+/).map(Number);
  return (r * 0.299 + g * 0.587 + b * 0.114) < 128;
}

// ─── Palettes ────────────────────────────────────────────────────────────────

const PALETTE_LIGHT = [
  '#4f6cc9', '#0e8aa8', '#c25d2a', '#3a8c4a', '#b53a72',
  '#6845b3', '#a87211', '#1a8c79', '#b73838', '#52607a',
];
const PALETTE_DARK = [
  '#7c8cff', '#7cd4ff', '#f0a868', '#9ee493', '#ff9ec5',
  '#c8a8ff', '#ffd166', '#7ee0c4', '#ff8a7a', '#a8b3d1',
];

const GHOST_EXT_RE = /\.(canvas|base|pen|png|jpe?g|gif|webp|svg|pdf|mp3|mp4|webm|csv|json)$/i;

function buildCommunityColors(communityIds: number[], dark: boolean): Map<number, string> {
  const palette = dark ? PALETTE_DARK : PALETTE_LIGHT;
  const out = new Map<number, string>();
  const unique = [...new Set(communityIds)].sort((a, b) => a - b);
  unique.forEach((id, i) => out.set(id, palette[i % palette.length]));
  return out;
}

function buildFolderColors(folderKeys: string[], dark: boolean): Map<string, string> {
  const palette = dark ? PALETTE_DARK : PALETTE_LIGHT;
  const sorted = [...new Set(folderKeys)].sort((a, b) => {
    if (a === '/') return -1;
    if (b === '/') return 1;
    return a.localeCompare(b);
  });
  const out = new Map<string, string>();
  sorted.forEach((key, i) => out.set(key, palette[i % palette.length]));
  return out;
}

function hexToRgba(hex: string, alpha: number): string {
  if (hex.startsWith('rgba') || hex.startsWith('rgb') || hex.startsWith('hsl')) return hex;
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ─── Particle system ─────────────────────────────────────────────────────────

interface Particle {
  progress: number;
  speed: number;
  source: string;
  target: string;
}

function createParticles(graph: Graph, count: number): Particle[] {
  const edges = graph.edges();
  if (edges.length === 0) return [];
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const edge = edges[Math.floor(Math.random() * edges.length)];
    const [source, target] = graph.extremities(edge);
    particles.push({
      progress: Math.random(),
      speed: 0.002 + Math.random() * 0.004,
      source,
      target,
    });
  }
  return particles;
}

type ColorMode = 'folder' | 'cluster' | 'age';

// ─── Component ───────────────────────────────────────────────────────────────

export function GraphView() {
  const files = useVault((s) => s.files);
  const openFile = useVault((s) => s.openFile);
  const setView = useVault((s) => s.setView);
  const activeFile = useVault((s) => s.activeFile);
  const themeKey = useTheme((s) => s.theme);
  const themeMode = useTheme((s) => s.mode);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Rendering-only state kept in refs so changes don't rebuild the graph
  const pathNodesRef = useRef<Set<string>>(new Set());
  const showAgeRef = useRef(false);
  const showParticlesRef = useRef(true);
  const pathModeRef = useRef(false);

  const [hover, setHover] = useState<string | null>(null);
  const [localMode, setLocalMode] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>('cluster');
  const [showParticles, setShowParticles] = useState(true);
  const [showAge, setShowAge] = useState(false);
  const [pathMode, setPathMode] = useState(false);
  const [pathStart, setPathStart] = useState<string | null>(null);
  const [pathEnd, setPathEnd] = useState<string | null>(null);
  const [pathNodes, setPathNodes] = useState<Set<string>>(new Set());
  const [depthFilter, setDepthFilter] = useState(2);
  const [filterFolders, setFilterFolders] = useState<Set<string>>(new Set());
  const [showControls, setShowControls] = useState(false);

  // Sync rendering refs
  useEffect(() => { pathNodesRef.current = pathNodes; }, [pathNodes]);
  useEffect(() => { showAgeRef.current = showAge; }, [showAge]);
  useEffect(() => { showParticlesRef.current = showParticles; }, [showParticles]);
  useEffect(() => { pathModeRef.current = pathMode; }, [pathMode]);

  // Trigger Sigma refresh when rendering-only state changes (no graph rebuild)
  useEffect(() => {
    sigmaRef.current?.refresh({ skipIndexation: true });
  }, [pathNodes, showAge]);

  // Compute shortest path
  useEffect(() => {
    if (!pathStart || !pathEnd || !graphRef.current) {
      setPathNodes(new Set());
      return;
    }
    const graph = graphRef.current;
    if (!graph.hasNode(pathStart) || !graph.hasNode(pathEnd)) {
      setPathNodes(new Set());
      return;
    }
    const path = bidirectional(graph, pathStart, pathEnd);
    setPathNodes(path ? new Set(path) : new Set());
  }, [pathStart, pathEnd]);

  const { nodeCount, edgeCount } = useMemo(() => {
    let edges = 0;
    const filesArr = [...files.values()];
    const ghosts = new Set<string>();
    for (const f of filesArr) {
      for (const link of f.links) {
        const r = resolveWikilink(link, filesArr);
        if (r) edges++;
        else if (GHOST_EXT_RE.test(link)) { edges++; ghosts.add(link); }
      }
    }
    return { nodeCount: filesArr.length + ghosts.size, edgeCount: edges };
  }, [files]);

  const folderColors = useMemo(() => {
    const keys: string[] = [];
    for (const f of files.values()) {
      const top = f.rel.split('/')[0];
      keys.push(f.rel.includes('/') ? top : '/');
    }
    return buildFolderColors(keys, isBgDark());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, themeMode, themeKey]);

  const folderLegend = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of files.values()) {
      const top = f.rel.split('/')[0];
      const key = f.rel.includes('/') ? top : '/';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => ({
        key,
        label: key === '/' ? 'root' : key,
        count,
        color: folderColors.get(key) ?? PALETTE_LIGHT[0],
      }));
  }, [files, folderColors]);

  const resetPath = useCallback(() => {
    setPathMode(false);
    setPathStart(null);
    setPathEnd(null);
    setPathNodes(new Set());
  }, []);

  // ─── Main graph effect ─────────────────────────────────────────────────────
  // Only rebuilds when structure/color changes. Rendering-only state uses refs.

  useEffect(() => {
    if (!containerRef.current) return;
    const filesArr = [...files.values()];
    if (filesArr.length === 0) return;

    const graph = new Graph({ multi: false, type: 'undirected' });
    const degree = new Map<string, number>();
    const edgeList: [string, string][] = [];
    const ghosts = new Map<string, string>();

    for (const f of filesArr) {
      degree.set(f.rel, 0);
      for (const link of f.links) {
        const r = resolveWikilink(link, filesArr);
        if (r && r !== f.rel) {
          const a = f.rel < r ? f.rel : r;
          const b = f.rel < r ? r : f.rel;
          edgeList.push([a, b]);
          degree.set(a, (degree.get(a) ?? 0) + 1);
          degree.set(b, (degree.get(b) ?? 0) + 1);
        } else if (!r && GHOST_EXT_RE.test(link)) {
          const ghostId = `ghost::${link}`;
          if (!ghosts.has(ghostId)) ghosts.set(ghostId, link.split('/').pop() || link);
          edgeList.push([f.rel, ghostId]);
          degree.set(f.rel, (degree.get(f.rel) ?? 0) + 1);
          degree.set(ghostId, (degree.get(ghostId) ?? 0) + 1);
        }
      }
    }

    // Age normalization
    let minMtime = Infinity, maxMtime = -Infinity;
    for (const f of filesArr) {
      if (f.mtime < minMtime) minMtime = f.mtime;
      if (f.mtime > maxMtime) maxMtime = f.mtime;
    }
    const mtimeRange = maxMtime - minMtime || 1;
    const bgDark = isBgDark();

    for (const f of filesArr) {
      const d = degree.get(f.rel) ?? 0;
      const top = f.rel.split('/')[0];
      const folderKey = f.rel.includes('/') ? top : '/';
      graph.addNode(f.rel, {
        label: f.name,
        x: Math.random(),
        y: Math.random(),
        size: 3 + Math.min(d, 14) * 0.7,
        color: folderColors.get(folderKey) ?? PALETTE_LIGHT[0],
        folderKey,
        age: (f.mtime - minMtime) / mtimeRange,
      });
    }

    const ghostColor = bgDark ? 'rgba(180, 175, 165, 0.55)' : 'rgba(120, 114, 100, 0.55)';
    for (const [ghostId, label] of ghosts) {
      const d = degree.get(ghostId) ?? 0;
      graph.addNode(ghostId, {
        label,
        x: Math.random(),
        y: Math.random(),
        size: 2 + Math.min(d, 8) * 0.5,
        color: ghostColor,
        folderKey: '__ghost__',
        age: 0,
      });
    }

    const seen = new Set<string>();
    for (const [a, b] of edgeList) {
      const k = `${a}::${b}`;
      if (seen.has(k)) continue;
      seen.add(k);
      try { graph.addEdge(a, b, { size: 1.4 }); } catch { /* dup */ }
    }

    // Local mode: BFS to depthFilter hops
    if (localMode && activeFile && graph.hasNode(activeFile)) {
      const keep = new Set<string>([activeFile]);
      let frontier = new Set<string>([activeFile]);
      for (let d = 0; d < depthFilter; d++) {
        const next = new Set<string>();
        for (const n of frontier) {
          for (const nb of graph.neighbors(n)) {
            if (!keep.has(nb)) { keep.add(nb); next.add(nb); }
          }
        }
        frontier = next;
      }
      for (const n of graph.nodes()) {
        if (!keep.has(n)) graph.dropNode(n);
      }
    }

    // Folder visibility filter
    if (filterFolders.size > 0) {
      for (const n of graph.nodes()) {
        const fk = graph.getNodeAttribute(n, 'folderKey');
        if (fk !== '__ghost__' && filterFolders.has(fk)) graph.dropNode(n);
      }
    }

    if (graph.order === 0) return;

    // Community detection
    let communities: Record<string, number> = {};
    try { communities = louvain(graph); } catch { /* too small */ }
    const communityColors = buildCommunityColors(Object.values(communities), bgDark);

    // Apply node colors based on mode
    graph.forEachNode((node) => {
      const fk = graph.getNodeAttribute(node, 'folderKey');
      if (fk === '__ghost__') return;
      const comm = communities[node] ?? 0;
      graph.setNodeAttribute(node, 'community', comm);

      if (colorMode === 'cluster') {
        graph.setNodeAttribute(node, 'color', communityColors.get(comm) ?? PALETTE_DARK[0]);
      } else if (colorMode === 'age') {
        const age = graph.getNodeAttribute(node, 'age') as number;
        const hue = age * 120;
        const sat = bgDark ? '70%' : '60%';
        const lit = bgDark ? '65%' : '45%';
        graph.setNodeAttribute(node, 'color', `hsl(${hue}, ${sat}, ${lit})`);
      }
    });

    // Layout
    const settings = { ...forceAtlas2.inferSettings(graph), slowDown: 10 };
    forceAtlas2.assign(graph, { iterations: 100, settings: { ...settings, slowDown: 1 } });
    graphRef.current = graph;

    // ─── Sigma renderer ──────────────────────────────────────────────────────

    const accentColor = readVar('--c-accent');
    const edgeColor = bgDark ? readVarRgba('--c-text', 0.5) : readVarRgba('--c-text-muted', 0.5);
    const edgeFadeColor = bgDark ? readVarRgba('--c-text', 0.12) : readVarRgba('--c-text-subtle', 0.2);
    const nodeFadeColor = bgDark ? readVarRgba('--c-text', 0.25) : readVar('--c-text-subtle');
    const labelInkColor = bgDark ? readVarRgba('--c-text', 0.78) : readVarRgba('--c-text-muted', 0.95);
    const labelBgColor = bgDark ? readVar('--c-text') : readVar('--c-bg-elevated');
    const labelTextColor = bgDark ? readVar('--c-bg') : readVar('--c-text');
    const labelBorderColor = readVar('--c-border');
    const particleColor = bgDark ? 'rgba(124, 140, 255, 0.7)' : 'rgba(79, 108, 201, 0.6)';

    const drawPillLabel = (
      ctx: CanvasRenderingContext2D,
      label: string,
      nodeX: number, nodeY: number, nodeSize: number,
      fontSize: number, fontFamily: string, fontWeight: string | number,
    ) => {
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      const w = ctx.measureText(label).width;
      const padX = 6, padY = 3;
      const x = nodeX + nodeSize + 4;
      const y = nodeY - fontSize / 2 - padY;
      const h = fontSize + padY * 2;
      const r = h / 2;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w + padX * 2 - r, y);
      ctx.quadraticCurveTo(x + w + padX * 2, y, x + w + padX * 2, y + r);
      ctx.lineTo(x + w + padX * 2, y + h - r);
      ctx.quadraticCurveTo(x + w + padX * 2, y + h, x + w + padX * 2 - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fillStyle = labelBgColor;
      ctx.fill();
      ctx.strokeStyle = labelBorderColor;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = labelTextColor;
      ctx.fillText(label, x + padX, y + fontSize + padY - 3);
    };

    const renderer = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      defaultNodeType: 'circle',
      nodeProgramClasses: { circle: NodeCircleProgram },
      labelColor: { color: labelInkColor },
      labelSize: 12,
      labelWeight: '500',
      labelDensity: 1,
      labelGridCellSize: 100,
      labelRenderedSizeThreshold: 3,
      defaultEdgeColor: edgeColor,
      minCameraRatio: 0.1,
      maxCameraRatio: 10,
      defaultDrawNodeLabel: (ctx, data, s) => {
        if (!data.label || typeof data.label !== 'string') return;
        ctx.font = `${s.labelWeight} ${s.labelSize}px ${s.labelFont}`;
        ctx.fillStyle = labelInkColor;
        ctx.fillText(data.label, data.x + data.size + 4, data.y + s.labelSize / 3);
      },
      defaultDrawNodeHover: (ctx, data, s) => {
        if (!data.label || typeof data.label !== 'string') return;
        drawPillLabel(ctx, data.label, data.x, data.y, data.size, s.labelSize, s.labelFont, s.labelWeight);
      },
    });

    sigmaRef.current = renderer;

    // ─── Reducers (read from refs for rendering-only state) ──────────────────

    let hovered: string | null = null;

    renderer.setSetting('nodeReducer', (node, data) => {
      const pn = pathNodesRef.current;
      if (pn.size > 0) {
        if (pn.has(node)) return { ...data, size: data.size * 1.6, color: accentColor, zIndex: 2 };
        return { ...data, color: nodeFadeColor, label: '', zIndex: 0 };
      }
      if (showAgeRef.current) {
        const age = graph.getNodeAttribute(node, 'age') as number;
        const sizeBoost = 1 + age * 0.4;
        const sized = { ...data, size: data.size * sizeBoost };
        if (data.color?.startsWith('hsl')) return sized;
        return { ...sized, color: hexToRgba(data.color || '#888', 0.3 + age * 0.7) };
      }
      if (!hovered) return data;
      const isNeighbor = node === hovered || graph.hasEdge(node, hovered) || graph.hasEdge(hovered, node);
      if (isNeighbor) return { ...data, zIndex: 1 };
      return { ...data, color: nodeFadeColor, label: '', zIndex: 0 };
    });

    renderer.setSetting('edgeReducer', (edge, data) => {
      const pn = pathNodesRef.current;
      if (pn.size > 0) {
        const [s, t] = graph.extremities(edge);
        if (pn.has(s) && pn.has(t)) return { ...data, color: accentColor, size: 3 };
        return { ...data, color: edgeFadeColor, size: 0.5 };
      }
      if (!hovered) return data;
      const [s, t] = graph.extremities(edge);
      if (s === hovered || t === hovered) return { ...data, color: accentColor, size: 1.6 };
      return { ...data, color: edgeFadeColor };
    });

    // ─── Interactions ────────────────────────────────────────────────────────

    renderer.on('clickNode', ({ node }) => {
      if (pathModeRef.current) {
        setPathStart((prev) => {
          if (!prev) return node;
          if (prev !== node) { setPathEnd(node); return prev; }
          setPathEnd(null);
          return node;
        });
        return;
      }
      if (node.startsWith('ghost::')) return;
      openFile(node);
      setView('editor');
    });

    renderer.on('enterNode', ({ node }) => {
      hovered = node;
      setHover(node);
      containerRef.current!.style.cursor = pathModeRef.current ? 'crosshair' : 'pointer';
      renderer.refresh({ skipIndexation: true });
    });

    renderer.on('leaveNode', () => {
      hovered = null;
      setHover(null);
      containerRef.current!.style.cursor = pathModeRef.current ? 'crosshair' : 'default';
      renderer.refresh({ skipIndexation: true });
    });

    // Drag
    let dragNode: string | null = null;
    let isDragging = false;
    renderer.on('downNode', (e) => {
      if (pathModeRef.current) return;
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

    // ─── Physics + particles ─────────────────────────────────────────────────

    let particles = createParticles(graph, Math.min(graph.size * 2, 200));
    const cachedEdges = graph.edges();
    let cancelled = false;
    let rafId: number | null = null;
    let frame = 0;
    let convergedCount = 0;
    let converged = false;

    // Pre-allocate position arrays for convergence check (avoids Map per frame)
    const nodeArr = graph.nodes();
    const prevX = new Float64Array(nodeArr.length);
    const prevY = new Float64Array(nodeArr.length);

    const tick = () => {
      if (cancelled) return;

      // Physics (every other frame, stops once converged)
      if (!isDragging && !converged && frame % 2 === 0) {
        for (let i = 0; i < nodeArr.length; i++) {
          prevX[i] = graph.getNodeAttribute(nodeArr[i], 'x');
          prevY[i] = graph.getNodeAttribute(nodeArr[i], 'y');
        }
        forceAtlas2.assign(graph, { iterations: 1, settings });
        let disp = 0;
        for (let i = 0; i < nodeArr.length; i++) {
          const dx = graph.getNodeAttribute(nodeArr[i], 'x') - prevX[i];
          const dy = graph.getNodeAttribute(nodeArr[i], 'y') - prevY[i];
          disp += dx * dx + dy * dy;
        }
        if (disp < 0.0025 * nodeArr.length) {
          if (++convergedCount > 30) converged = true;
        } else {
          convergedCount = 0;
        }
      }

      frame++;
      renderer.refresh({ skipIndexation: false });

      // Particles
      if (showParticlesRef.current && particleCanvasRef.current && particles.length > 0) {
        const canvas = particleCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const { width, height } = canvas.getBoundingClientRect();
          const dpr = 2;
          const cw = width * dpr, ch = height * dpr;
          if (canvas.width !== cw || canvas.height !== ch) {
            canvas.width = cw;
            canvas.height = ch;
            ctx.scale(dpr, dpr);
          }
          ctx.clearRect(0, 0, width, height);
          ctx.fillStyle = particleColor;

          for (const p of particles) {
            if (!graph.hasNode(p.source) || !graph.hasNode(p.target)) continue;
            const sx = graph.getNodeAttribute(p.source, 'x');
            const sy = graph.getNodeAttribute(p.source, 'y');
            const tx = graph.getNodeAttribute(p.target, 'x');
            const ty = graph.getNodeAttribute(p.target, 'y');
            const vp = renderer.graphToViewport({
              x: sx + (tx - sx) * p.progress,
              y: sy + (ty - sy) * p.progress,
            });
            ctx.beginPath();
            ctx.arc(vp.x, vp.y, 1.5, 0, Math.PI * 2);
            ctx.fill();

            p.progress += p.speed;
            if (p.progress >= 1) {
              p.progress = 0;
              const edge = cachedEdges[Math.floor(Math.random() * cachedEdges.length)];
              const [s, t] = graph.extremities(edge);
              p.source = s;
              p.target = t;
              p.speed = 0.002 + Math.random() * 0.004;
            }
          }
        }
      } else if (particleCanvasRef.current) {
        const ctx = particleCanvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, particleCanvasRef.current.width, particleCanvasRef.current.height);
      }

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      renderer.kill();
      sigmaRef.current = null;
      graphRef.current = null;
    };
    // Note: pathNodes/showAge/showParticles/pathMode intentionally excluded (use refs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, folderColors, activeFile, localMode, depthFilter, colorMode, filterFolders, openFile, setView, themeKey, themeMode]);

  // ─── Hover info ────────────────────────────────────────────────────────────

  const hoverFile = hover ? files.get(hover) : null;
  const hoverInfo = useMemo(() => {
    if (!hoverFile) return null;
    const days = Math.floor((Date.now() - hoverFile.mtime) / 86_400_000);
    const links = hoverFile.links.length;
    let timeStr: string;
    if (days === 0) timeStr = 'today';
    else if (days === 1) timeStr = 'yesterday';
    else if (days < 30) timeStr = `${days}d ago`;
    else if (days < 365) timeStr = `${Math.floor(days / 30)}mo ago`;
    else timeStr = `${Math.floor(days / 365)}y ago`;
    return { title: hoverFile.title || hoverFile.name, timeStr, links, tags: hoverFile.tags.slice(0, 3) };
  }, [hoverFile]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-full bg-bg overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      <canvas
        ref={particleCanvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Stats + legend */}
      <div className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-none z-10">
        <div className="px-3 py-2 rounded-lg bg-bg-elevated/80 backdrop-blur border border-border font-mono text-[10.5px] uppercase tracking-[0.08em] flex items-center gap-2">
          <span className="text-text-muted">{nodeCount} notes</span>
          <span className="text-text-subtle">·</span>
          <span className="text-text-muted">{edgeCount} links</span>
          {pathNodes.size > 0 && (
            <>
              <span className="text-text-subtle">·</span>
              <span className="text-accent">{pathNodes.size} in path</span>
            </>
          )}
        </div>
        {folderLegend.length > 1 && colorMode === 'folder' && (
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
        {colorMode === 'age' && (
          <div className="px-3 py-2 rounded-lg bg-bg-elevated/80 backdrop-blur border border-border text-xs">
            <div className="text-[10px] uppercase tracking-wider text-text-subtle mb-1">Recency</div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 rounded-full" style={{ background: 'linear-gradient(to right, hsl(0, 60%, 50%), hsl(60, 60%, 50%), hsl(120, 60%, 50%))' }} />
              <span className="text-text-subtle text-[10px]">old → new</span>
            </div>
          </div>
        )}
      </div>

      {/* Hover card */}
      {hoverInfo && (
        <div className="absolute bottom-3 left-3 px-3 py-2 rounded-lg bg-bg-elevated/90 backdrop-blur border border-border text-xs pointer-events-none z-10">
          <div className="font-medium text-text mb-0.5">{hoverInfo.title}</div>
          <div className="flex items-center gap-2 text-text-muted">
            <span>{hoverInfo.timeStr}</span>
            <span className="text-text-subtle">·</span>
            <span>{hoverInfo.links} links</span>
            {hoverInfo.tags.length > 0 && (
              <>
                <span className="text-text-subtle">·</span>
                <span className="text-text-subtle">{hoverInfo.tags.map((t) => `#${t}`).join(' ')}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Path finder banner */}
      {pathMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-accent/10 backdrop-blur border border-accent/30 text-xs text-accent flex items-center gap-3 z-10">
          <Route size={14} />
          <span>
            {!pathStart
              ? 'Click a starting note'
              : !pathEnd
                ? 'Click an ending note'
                : pathNodes.size > 0
                  ? `Path: ${pathNodes.size} notes`
                  : 'No path found'}
          </span>
          <button onClick={resetPath} className="p-0.5 rounded hover:bg-accent/20">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
        <div className="flex gap-2">
          <button
            disabled={!activeFile}
            onClick={() => setLocalMode((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md backdrop-blur border px-2.5 py-1.5 text-[12px] transition-colors',
              localMode
                ? 'bg-accent/15 border-accent/50 text-accent hover:bg-accent/20'
                : 'bg-bg-elevated/80 border-border text-text-muted hover:text-text hover:bg-bg-hover',
              !activeFile && 'opacity-40 cursor-not-allowed'
            )}
            title={localMode ? 'Show full graph' : 'Focus on this note'}
          >
            {localMode ? <Network size={13} /> : <Focus size={13} />}
            {localMode ? 'All' : 'Focus'}
          </button>

          <button
            onClick={() => setPathMode((v) => { if (v) resetPath(); return !v; })}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md backdrop-blur border px-2.5 py-1.5 text-[12px] transition-colors',
              pathMode
                ? 'bg-accent/15 border-accent/50 text-accent hover:bg-accent/20'
                : 'bg-bg-elevated/80 border-border text-text-muted hover:text-text hover:bg-bg-hover',
            )}
            title="Find shortest path between two notes"
          >
            <Route size={13} />
            Path
          </button>

          <button
            onClick={() => sigmaRef.current?.getCamera().animatedReset()}
            className="p-2 rounded-md bg-bg-elevated/80 backdrop-blur border border-border text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
            title="Reset view"
          >
            <Maximize2 size={14} />
          </button>

          <button
            onClick={() => setShowControls((v) => !v)}
            className={cn(
              'p-2 rounded-md backdrop-blur border transition-colors',
              showControls
                ? 'bg-accent/15 border-accent/50 text-accent'
                : 'bg-bg-elevated/80 border-border text-text-muted hover:text-text hover:bg-bg-hover'
            )}
            title="Graph settings"
          >
            <Filter size={14} />
          </button>
        </div>

        {showControls && (
          <div className="px-3 py-3 rounded-lg bg-bg-elevated/90 backdrop-blur border border-border text-xs space-y-3 min-w-[180px]">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-subtle mb-1.5">Color by</div>
              <div className="flex gap-1">
                {(['cluster', 'folder', 'age'] as ColorMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setColorMode(m)}
                    className={cn(
                      'px-2 py-1 rounded text-[11px] capitalize transition-colors',
                      colorMode === m
                        ? 'bg-accent/15 text-accent border border-accent/40'
                        : 'bg-bg-hover text-text-muted hover:text-text border border-transparent'
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showParticles}
                  onChange={(e) => setShowParticles(e.target.checked)}
                  className="rounded border-border accent-accent"
                />
                <Zap size={11} className="text-text-muted" />
                <span className="text-text-muted">Particles</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAge}
                  onChange={(e) => setShowAge(e.target.checked)}
                  className="rounded border-border accent-accent"
                />
                <Clock size={11} className="text-text-muted" />
                <span className="text-text-muted">Fade old notes</span>
              </label>
            </div>

            {localMode && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-subtle mb-1">Depth: {depthFilter}</div>
                <input
                  type="range"
                  min={1}
                  max={4}
                  value={depthFilter}
                  onChange={(e) => setDepthFilter(Number(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>
            )}

            {folderLegend.length > 1 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-subtle mb-1.5">Hide folders</div>
                <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto">
                  {folderLegend.map(({ key, label, color }) => (
                    <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterFolders.has(key)}
                        onChange={(e) => {
                          setFilterFolders((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(key);
                            else next.delete(key);
                            return next;
                          });
                        }}
                        className="rounded border-border accent-accent"
                      />
                      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span className="text-text-muted truncate">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
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
