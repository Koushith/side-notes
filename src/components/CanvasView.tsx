import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type NodeProps,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
  ConnectionLineType,
  NodeResizer,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from '@/lib/api';
import { joinPath, cn } from '@/lib/utils';
import {
  StickyNote, Trash2, Globe, X, Plus, Search, Pause, Minus,
  ZoomIn, ChevronRight, ChevronDown, Layers, ExternalLink,
} from 'lucide-react';

// ─── Canvas file format ──────────────────────────────────────────────────────

interface CanvasFile {
  version: 1;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

type StickyColor = 'yellow' | 'pink' | 'blue';
type WebColor = 'none' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';

type CanvasNode =
  | { id: string; type: 'sticky'; x: number; y: number; width: number; height: number; text: string; color: StickyColor }
  | { id: string; type: 'web'; x: number; y: number; width: number; height: number; url: string; color?: WebColor };

interface CanvasEdge {
  id: string;
  fromNode: string;
  toNode: string;
  fromSide?: string;
  toSide?: string;
  label?: string;
}

const EMPTY: CanvasFile = { version: 1, nodes: [], edges: [] };

// ─── Handlers context ────────────────────────────────────────────────────────

interface CanvasHandlers {
  updateNodeData: (id: string, patch: Record<string, unknown>) => void;
  removeNode: (id: string) => void;
  spawnChildWeb: (parentId: string, url: string) => void;
  focusNode: (id: string) => void;
}

const HandlersCtx = createContext<{ ref: { current: CanvasHandlers } } | null>(null);

function useHandlers(): CanvasHandlers {
  const ctx = useContext(HandlersCtx);
  if (!ctx) throw new Error('HandlersCtx missing');
  return ctx.ref.current;
}

// ─── Node type wrappers ──────────────────────────────────────────────────────

function StickyCardNode(p: NodeProps) {
  const { updateNodeData, removeNode } = useHandlers();
  return <StickyCard {...p} onChange={(t) => updateNodeData(p.id, { text: t })} onColor={(c) => updateNodeData(p.id, { color: c })} onRemove={() => removeNode(p.id)} />;
}

function WebCardNode(p: NodeProps) {
  const { updateNodeData, removeNode, spawnChildWeb } = useHandlers();
  return (
    <WebPageCard
      {...p}
      onNavigate={(u) => updateNodeData(p.id, { url: u })}
      onRemove={() => removeNode(p.id)}
      onLinkClick={(url) => spawnChildWeb(p.id, url)}
      onColorChange={(c) => updateNodeData(p.id, { color: c })}
    />
  );
}

const NODE_TYPES = { stickyCard: StickyCardNode, webCard: WebCardNode } as const;

const EDGE_STYLE = { stroke: 'rgb(var(--c-accent))', strokeWidth: 1.5 };

// ─── Color constants ─────────────────────────────────────────────────────────

const WEB_COLORS: { value: WebColor; label: string; cls: string }[] = [
  { value: 'none', label: 'None', cls: 'bg-transparent border-border' },
  { value: 'red', label: 'Red', cls: 'bg-red-500' },
  { value: 'orange', label: 'Orange', cls: 'bg-orange-500' },
  { value: 'yellow', label: 'Yellow', cls: 'bg-yellow-500' },
  { value: 'green', label: 'Green', cls: 'bg-green-500' },
  { value: 'blue', label: 'Blue', cls: 'bg-blue-500' },
  { value: 'purple', label: 'Purple', cls: 'bg-purple-500' },
];

const WEB_BORDER_COLORS: Record<WebColor, string> = {
  none: 'border-border',
  red: 'border-red-500',
  orange: 'border-orange-500',
  yellow: 'border-yellow-500',
  green: 'border-green-500',
  blue: 'border-blue-500',
  purple: 'border-purple-500',
};

// ─── Public component ────────────────────────────────────────────────────────

interface Props { rel: string; vaultPath: string }

export function CanvasView(props: Props) {
  return <ReactFlowProvider><CanvasInner {...props} /></ReactFlowProvider>;
}

// ─── Canvas inner ────────────────────────────────────────────────────────────

function CanvasInner({ rel, vaultPath }: Props) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [layersPanelOpen, setLayersPanelOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [urlInputOpen, setUrlInputOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const flow = useReactFlow();
  const nodesRef = useRef<Node[]>(nodes);
  const edgesRef = useRef<Edge[]>(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  // Load canvas file
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await api.files.read(joinPath(vaultPath, rel));
        const data: CanvasFile = raw.trim() ? JSON.parse(raw) : EMPTY;
        if (cancelled) return;
        setNodes(canvasNodesToFlow(data.nodes));
        setEdges(canvasEdgesToFlow(data.edges));
        setLoaded(true);
        setTimeout(() => flow.fitView({ padding: 0.3, duration: 300 }), 50);
      } catch (err) {
        console.error('Failed to load canvas', err);
        setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [rel, vaultPath, flow]);

  const queueSave = useCallback((n: Node[], e: Edge[]) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const data: CanvasFile = { version: 1, nodes: flowNodesToCanvas(n), edges: flowEdgesToCanvas(e) };
      try { await api.files.write(joinPath(vaultPath, rel), JSON.stringify(data, null, 2)); }
      catch (err) { console.error('Failed to save canvas', err); }
    }, 350);
  }, [vaultPath, rel]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((cur) => { const next = applyNodeChanges(changes, cur); if (loaded) queueSave(next, edgesRef.current); return next; });
  }, [loaded, queueSave]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((cur) => { const next = applyEdgeChanges(changes, cur); if (loaded) queueSave(nodesRef.current, next); return next; });
  }, [loaded, queueSave]);

  const onConnect = useCallback((conn: Connection) => {
    setEdges((cur) => {
      const next = addEdge({ ...conn, type: 'smoothstep', animated: false, style: EDGE_STYLE }, cur);
      if (loaded) queueSave(nodesRef.current, next);
      return next;
    });
  }, [loaded, queueSave]);

  const updateNodeData = useCallback((id: string, patch: Record<string, unknown>) => {
    setNodes((cur) => {
      const next = cur.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
      queueSave(next, edgesRef.current);
      return next;
    });
  }, [queueSave]);

  const removeNode = useCallback((id: string) => {
    setNodes((cur) => {
      const next = cur.filter((n) => n.id !== id);
      setEdges((ce) => { const ne = ce.filter((e) => e.source !== id && e.target !== id); queueSave(next, ne); return ne; });
      return next;
    });
  }, [queueSave]);

  const focusNode = useCallback((id: string) => {
    const node = nodesRef.current.find((n) => n.id === id);
    if (!node) return;
    const w = (node.style?.width as number) ?? 560;
    const h = (node.style?.height as number) ?? 400;
    flow.setCenter(node.position.x + w / 2, node.position.y + h / 2, { zoom: 0.8, duration: 400 });
  }, [flow]);

  const spawnChildWeb = useCallback((parentId: string, url: string) => {
    const parent = nodesRef.current.find((n) => n.id === parentId);
    if (!parent) return;
    const pw = (parent.style?.width as number) ?? 560;
    const id = `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newX = parent.position.x + pw + 80;
    const newY = parent.position.y + 40;
    const node: Node = {
      id, type: 'webCard',
      position: { x: newX, y: newY },
      data: { url: normalizeUrl(url), color: 'none', paused },
      style: { width: 560, height: 400 },
    };
    const edge: Edge = {
      id: `e_${parentId}_${id}`,
      source: parentId, target: id,
      sourceHandle: 'right', targetHandle: 'left',
      type: 'smoothstep', style: EDGE_STYLE,
    };
    setNodes((cur) => { const next = [...cur, node]; setEdges((ce) => { const ne = [...ce, edge]; queueSave(next, ne); return ne; }); return next; });
  }, [queueSave, paused]);

  const addWebNode = useCallback((url?: string) => {
    const { x, y, zoom } = flow.getViewport();
    const px = (window.innerWidth / 2 - x) / zoom;
    const py = (window.innerHeight / 2 - y) / zoom;
    const id = `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const node: Node = {
      id, type: 'webCard',
      position: { x: px - 280, y: py - 200 },
      data: { url: normalizeUrl(url || ''), color: 'none', paused },
      style: { width: 560, height: 400 },
    };
    setNodes((cur) => { const next = [...cur, node]; queueSave(next, edgesRef.current); return next; });
  }, [flow, queueSave, paused]);

  const stickyCycleRef = useRef(0);
  const addSticky = useCallback(() => {
    const { x, y, zoom } = flow.getViewport();
    const px = (window.innerWidth / 2 - x) / zoom;
    const py = (window.innerHeight / 2 - y) / zoom;
    const id = `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const colors: StickyColor[] = ['yellow', 'pink', 'blue'];
    const color = colors[stickyCycleRef.current++ % 3];
    const node: Node = {
      id, type: 'stickyCard',
      position: { x: px - 110, y: py - 75 },
      data: { text: '', color },
      style: { width: 220, height: 150 },
    };
    setNodes((cur) => { const next = [...cur, node]; queueSave(next, edgesRef.current); return next; });
  }, [flow, queueSave]);

  const clearAll = useCallback(() => {
    if (!window.confirm('Remove all nodes and edges from this canvas?')) return;
    setNodes([]);
    setEdges([]);
    queueSave([], []);
  }, [queueSave]);

  const duplicateSelected = useCallback(() => {
    const selected = nodesRef.current.filter((n) => n.selected);
    if (selected.length === 0) return;
    const newNodes: Node[] = selected.map((n) => ({
      ...n,
      id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      position: { x: n.position.x + 40, y: n.position.y + 40 },
      selected: false,
    }));
    setNodes((cur) => { const next = [...cur, ...newNodes]; queueSave(next, edgesRef.current); return next; });
  }, [queueSave]);

  const deleteSelected = useCallback(() => {
    const selectedIds = new Set(nodesRef.current.filter((n) => n.selected).map((n) => n.id));
    if (selectedIds.size === 0) return;
    setNodes((cur) => {
      const next = cur.filter((n) => !selectedIds.has(n.id));
      setEdges((ce) => { const ne = ce.filter((e) => !selectedIds.has(e.source) && !selectedIds.has(e.target)); queueSave(next, ne); return ne; });
      return next;
    });
  }, [queueSave]);

  const togglePause = useCallback(() => {
    setPaused((p) => {
      const next = !p;
      setNodes((cur) => cur.map((n) => n.type === 'webCard' ? { ...n, data: { ...n.data, paused: next } } : n));
      return next;
    });
  }, []);

  const zoomIn = useCallback(() => flow.zoomIn({ duration: 200 }), [flow]);
  const zoomOut = useCallback(() => flow.zoomOut({ duration: 200 }), [flow]);
  const [zoomLevel, setZoomLevel] = useState(100);

  useEffect(() => {
    const onMove = () => { setZoomLevel(Math.round(flow.getZoom() * 100)); };
    // Subscribe to viewport changes via the flow instance
    const interval = setInterval(onMove, 500);
    return () => clearInterval(interval);
  }, [flow]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === 'k') { e.preventDefault(); setUrlInputOpen(true); }
      if (meta && e.key === 'f') { e.preventDefault(); setSearchOpen((v) => !v); }
      if (meta && e.key === 'd') { e.preventDefault(); duplicateSelected(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !meta && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        deleteSelected();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [duplicateSelected, deleteSelected]);

  const handlersRef = useRef<CanvasHandlers>({ updateNodeData, removeNode, spawnChildWeb, focusNode });
  handlersRef.current = { updateNodeData, removeNode, spawnChildWeb, focusNode };
  const handlersCtx = useMemo(() => ({ ref: handlersRef }), []);

  // Build tree data for layers panel
  const layersTree = useMemo(() => {
    const webNodes = nodes.filter((n) => n.type === 'webCard');
    const childIds = new Set(edges.filter((e) => webNodes.some((n) => n.id === e.target)).map((e) => e.target));
    const roots = webNodes.filter((n) => !childIds.has(n.id));
    const childrenOf = (parentId: string): Node[] => {
      const childEdges = edges.filter((e) => e.source === parentId);
      return childEdges.map((e) => webNodes.find((n) => n.id === e.target)).filter(Boolean) as Node[];
    };
    return { roots, childrenOf };
  }, [nodes, edges]);

  // Search filter
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return nodes.filter((n) => {
      if (n.type === 'webCard') {
        const url = (n.data.url as string) || '';
        const title = (n.data.title as string) || '';
        return url.toLowerCase().includes(q) || title.toLowerCase().includes(q);
      }
      if (n.type === 'stickyCard') {
        return ((n.data.text as string) || '').toLowerCase().includes(q);
      }
      return false;
    });
  }, [nodes, searchQuery]);

  return (
    <HandlersCtx.Provider value={handlersCtx}>
      <div className="relative w-full h-full flex">
        {/* Layers panel */}
        {layersPanelOpen && (
          <div className="w-56 shrink-0 border-r border-border bg-bg-elevated/95 backdrop-blur flex flex-col z-20 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
              <div className="flex items-center gap-1.5 text-xs font-medium text-text">
                <Layers size={12} />
                <span>Pages</span>
              </div>
              <button onClick={() => setLayersPanelOpen(false)} className="p-0.5 rounded text-text-muted hover:text-text hover:bg-bg-hover">
                <X size={12} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {layersTree.roots.length === 0 && (
                <div className="px-3 py-4 text-xs text-text-subtle text-center">No pages yet</div>
              )}
              {layersTree.roots.map((node) => (
                <LayerTreeItem key={node.id} node={node} childrenOf={layersTree.childrenOf} onFocus={focusNode} depth={0} />
              ))}
            </div>
          </div>
        )}

        {/* Main canvas area */}
        <div className="relative flex-1 h-full">
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
            nodeTypes={NODE_TYPES} proOptions={{ hideAttribution: true }}
            fitView minZoom={0.1} maxZoom={2}
            defaultEdgeOptions={{ type: 'smoothstep', style: EDGE_STYLE, animated: false }}
            connectionLineType={ConnectionLineType.SmoothStep}
            deleteKeyCode={null}
          >
            <Background gap={22} size={1.4} color="rgb(var(--c-border))" />
          </ReactFlow>

          {/* Layers toggle when closed */}
          {!layersPanelOpen && (
            <button onClick={() => setLayersPanelOpen(true)} className="absolute top-3 left-3 z-10 p-2 rounded-lg bg-bg-elevated/95 backdrop-blur border border-border shadow-sm text-text-muted hover:text-text hover:bg-bg-hover" title="Show layers">
              <Layers size={14} />
            </button>
          )}

          {/* Search bar */}
          {searchOpen && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 w-80">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-bg-elevated/95 backdrop-blur shadow-lg">
                <Search size={13} className="text-text-subtle shrink-0" />
                <input
                  autoFocus
                  placeholder="Search pages and notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); } }}
                  className="flex-1 bg-transparent outline-none text-sm text-text placeholder:text-text-subtle"
                />
                <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="p-0.5 rounded text-text-muted hover:text-text">
                  <X size={12} />
                </button>
              </div>
              {filteredNodes && filteredNodes.length > 0 && (
                <div className="mt-1 rounded-lg border border-border bg-bg-elevated/95 backdrop-blur shadow-lg max-h-60 overflow-y-auto">
                  {filteredNodes.map((n) => (
                    <button key={n.id} onClick={() => { focusNode(n.id); setSearchOpen(false); setSearchQuery(''); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-bg-hover border-b border-border-subtle last:border-0">
                      {n.type === 'webCard' ? <Globe size={12} className="text-text-subtle shrink-0" /> : <StickyNote size={12} className="text-text-subtle shrink-0" />}
                      <span className="text-text truncate">
                        {n.type === 'webCard' ? getDomain(n.data.url as string) : ((n.data.text as string) || 'Empty note').slice(0, 40)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* URL input popup */}
          {urlInputOpen && (
            <UrlInputPopup
              onSubmit={(url) => { addWebNode(url); setUrlInputOpen(false); }}
              onClose={() => setUrlInputOpen(false)}
            />
          )}

          {/* Bottom toolbar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-bg-elevated/95 backdrop-blur border border-border shadow-lg">
              <ToolbarButton icon={<Plus size={13} />} label="Page" onClick={() => setUrlInputOpen(true)} title="Add page (Cmd+K)" />
              <ToolbarButton icon={<StickyNote size={13} />} label="Note" onClick={addSticky} title="Add sticky note" />
              <div className="w-px h-5 bg-border mx-1" />
              <ToolbarButton icon={<Search size={13} />} label="Search" onClick={() => setSearchOpen((v) => !v)} title="Search (Cmd+F)" />
              <ToolbarButton icon={<Pause size={13} />} label={paused ? 'Resume' : 'Pause'} onClick={togglePause} active={paused} title="Pause/resume all webviews" />
              <ToolbarButton icon={<Trash2 size={13} />} label="Clear" onClick={clearAll} title="Clear all nodes" />
              <div className="w-px h-5 bg-border mx-1" />
              <button onClick={zoomOut} className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-bg-hover" title="Zoom out"><Minus size={13} /></button>
              <span className="text-[11px] text-text-muted font-mono w-10 text-center">{zoomLevel}%</span>
              <button onClick={zoomIn} className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-bg-hover" title="Zoom in"><ZoomIn size={13} /></button>
            </div>
          </div>

          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center bg-bg-elevated/70 backdrop-blur border border-border rounded-xl px-6 py-4">
                <div className="text-text mb-1 font-medium">Spatial Research Browser</div>
                <div className="text-xs text-text-muted">Press Cmd+K or click "+ Page" to add your first web page.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </HandlersCtx.Provider>
  );
}

// ─── Toolbar button ─────────────────────────────────────────────────────────

function ToolbarButton({ icon, label, onClick, title, active }: {
  icon: React.ReactNode; label: string; onClick: () => void; title?: string; active?: boolean;
}) {
  return (
    <button onClick={onClick} title={title}
      className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors',
        active ? 'bg-accent text-white' : 'text-text-muted hover:bg-bg-hover hover:text-text'
      )}
    >
      {icon}<span>{label}</span>
    </button>
  );
}

// ─── URL input popup ────────────────────────────────────────────────────────

function UrlInputPopup({ onSubmit, onClose }: { onSubmit: (url: string) => void; onClose: () => void }) {
  const [url, setUrl] = useState('');
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-[420px]">
      <div className="rounded-xl border border-border bg-bg-elevated shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-medium text-text">Open URL</span>
          <button onClick={onClose} className="p-1 rounded text-text-muted hover:text-text"><X size={14} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(url.trim() || 'https://google.com'); }} className="p-4">
          <div className="flex items-center gap-2 bg-bg rounded-lg border border-border px-3 py-2">
            <Globe size={14} className="text-text-subtle shrink-0" />
            <input
              autoFocus
              placeholder="Enter URL or search term..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
              className="flex-1 bg-transparent outline-none text-sm text-text placeholder:text-text-subtle"
            />
          </div>
          <div className="flex justify-end mt-3 gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs rounded-lg text-text-muted hover:bg-bg-hover">Cancel</button>
            <button type="submit" className="px-3 py-1.5 text-xs rounded-lg bg-accent text-white hover:bg-accent-hover font-medium">Open</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Layer tree item ────────────────────────────────────────────────────────

function LayerTreeItem({ node, childrenOf, onFocus, depth }: {
  node: Node; childrenOf: (id: string) => Node[]; onFocus: (id: string) => void; depth: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const children = childrenOf(node.id);
  const url = (node.data.url as string) || '';
  const domain = getDomain(url);

  return (
    <div>
      <button
        onClick={() => onFocus(node.id)}
        className={cn('w-full flex items-center gap-1.5 px-2 py-1.5 text-left text-xs hover:bg-bg-hover group')}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {children.length > 0 ? (
          <button onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }} className="p-0.5 text-text-subtle hover:text-text shrink-0">
            {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <Globe size={11} className="text-text-subtle shrink-0" />
        <span className="text-text truncate flex-1">{domain}</span>
      </button>
      {expanded && children.map((child) => (
        <LayerTreeItem key={child.id} node={child} childrenOf={childrenOf} onFocus={onFocus} depth={depth + 1} />
      ))}
    </div>
  );
}

// ─── Shared card primitives ──────────────────────────────────────────────────

function CardResizer({ minWidth, minHeight, selected }: { minWidth: number; minHeight: number; selected?: boolean }) {
  return <NodeResizer isVisible={!!selected} minWidth={minWidth} minHeight={minHeight} lineClassName="canvas-resize-line" handleClassName="canvas-resize-handle" />;
}

function CardHandles() {
  const cls = '!w-2 !h-2 !border-0 !bg-accent';
  return (
    <>
      <Handle id="top" type="target" position={Position.Top} className={cls} />
      <Handle id="top" type="source" position={Position.Top} className={cls} style={{ opacity: 0 }} />
      <Handle id="right" type="source" position={Position.Right} className={cls} />
      <Handle id="right" type="target" position={Position.Right} className={cls} style={{ opacity: 0 }} />
      <Handle id="bottom" type="source" position={Position.Bottom} className={cls} />
      <Handle id="bottom" type="target" position={Position.Bottom} className={cls} style={{ opacity: 0 }} />
      <Handle id="left" type="target" position={Position.Left} className={cls} />
      <Handle id="left" type="source" position={Position.Left} className={cls} style={{ opacity: 0 }} />
    </>
  );
}

// ─── Sticky card ────────────────────────────────────────────────────────────

const STICKY_STYLES: Record<StickyColor, { bg: string; border: string; ink: string; tab: string }> = {
  yellow: { bg: 'bg-[#f5e7a8]', border: 'border-[#d4ba5a]', ink: 'text-[#3a2f12]', tab: 'text-[#7a6520]' },
  pink: { bg: 'bg-[#f0c8c0]', border: 'border-[#c9968b]', ink: 'text-[#3a1f1a]', tab: 'text-[#824840]' },
  blue: { bg: 'bg-[#cfdcef]', border: 'border-[#9bb1cd]', ink: 'text-[#16223a]', tab: 'text-[#3e5374]' },
};

function StickyCard({ data, selected, onChange, onColor, onRemove }: NodeProps & { onChange: (s: string) => void; onColor: (c: StickyColor) => void; onRemove: () => void }) {
  const color = ((data.color as StickyColor) ?? 'yellow') as StickyColor;
  const [text, setText] = useState((data.text as string) ?? '');
  useEffect(() => setText((data.text as string) ?? ''), [data.text]);
  const s = STICKY_STYLES[color] ?? STICKY_STYLES.yellow;
  return (
    <div className={cn('group w-full h-full flex flex-col rounded-lg shadow-md border overflow-hidden', s.bg, s.border)}>
      <CardResizer minWidth={160} minHeight={100} selected={selected} />
      <CardHandles />
      <div className={cn('flex items-center justify-between px-2.5 py-1 cursor-grab active:cursor-grabbing', s.tab)}>
        <span className="text-[9.5px] uppercase tracking-[0.12em] font-medium">Sticky</span>
        <div className="flex items-center gap-1">
          {(['yellow', 'pink', 'blue'] as StickyColor[]).map((c) => (
            <button key={c} onClick={() => onColor(c)} title={c} className={cn('w-2.5 h-2.5 rounded-full border opacity-0 group-hover:opacity-100 transition-opacity', c === color ? 'ring-1 ring-current' : 'border-current/30', c === 'yellow' && 'bg-[#e8c95c]', c === 'pink' && 'bg-[#d39084]', c === 'blue' && 'bg-[#7f9cc6]')} />
          ))}
          <button className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={onRemove} title="Delete"><Trash2 size={11} /></button>
        </div>
      </div>
      <textarea value={text} onChange={(e) => { setText(e.target.value); onChange(e.target.value); }} placeholder="Jot a thought..." className={cn('flex-1 bg-transparent outline-none px-3 pb-3 pt-1 text-[13px] font-medium leading-snug resize-none nodrag placeholder:opacity-50', s.ink)} />
    </div>
  );
}

// ─── Web page card (spatial browser node) ────────────────────────────────────

type WebviewEl = HTMLElement & {
  loadURL: (u: string) => void;
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  stop: () => void;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  setZoomFactor: (f: number) => void;
  getURL: () => string;
};

function WebPageCard({ data, selected, onNavigate, onRemove, onLinkClick, onColorChange }: NodeProps & {
  onNavigate: (url: string) => void;
  onRemove: () => void;
  onLinkClick: (url: string) => void;
  onColorChange: (c: WebColor) => void;
}) {
  const initialUrl = (data.url as string) || 'https://google.com';
  const nodeColor = (data.color as WebColor) || 'none';
  const isPaused = data.paused as boolean;
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(true);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const wvRef = useRef<WebviewEl | null>(null);
  const isBarNavRef = useRef(false);

  useEffect(() => {
    if (isPaused && wvRef.current) {
      try { wvRef.current.stop(); } catch {}
    }
  }, [isPaused]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || isPaused) return;

    const wv = document.createElement('webview') as unknown as WebviewEl;
    wv.setAttribute('src', initialUrl);
    wv.setAttribute('partition', 'persist:browse');
    wv.setAttribute('allowpopups', '');
    (wv as unknown as HTMLElement).style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:none;border-radius:0 0 8px 8px;';
    container.appendChild(wv as unknown as HTMLElement);
    wvRef.current = wv;

    const el = wv as unknown as HTMLElement;
    const onStart = () => setLoading(true);
    const onStop = () => setLoading(false);
    const onNav = (e: unknown) => {
      const u = (e as { url: string }).url;
      if (u) { setInputUrl(u); onNavigate(u); }
    };

    // new-window (target=_blank links) spawn children
    const onNewWindow = (e: unknown) => {
      const u = (e as { url: string }).url;
      if (u) onLinkClick(u);
    };

    el.addEventListener('did-start-loading', onStart);
    el.addEventListener('did-stop-loading', onStop);
    el.addEventListener('did-navigate', onNav as EventListener);
    el.addEventListener('did-navigate-in-page', onNav as EventListener);
    el.addEventListener('new-window', onNewWindow as EventListener);
    el.addEventListener('dom-ready', () => { wv.setZoomFactor(0.75); }, { once: true });

    // will-navigate fires BEFORE the webview navigates. We stop it and spawn a child.
    const onWillNavigate = (e: unknown) => {
      const u = (e as { url: string }).url;
      if (!u) return;
      if (isBarNavRef.current) {
        isBarNavRef.current = false;
        return;
      }
      // Stop the navigation in this webview and spawn a child instead
      setTimeout(() => { try { wv.stop(); } catch {} }, 0);
      onLinkClick(u);
    };
    el.addEventListener('will-navigate', onWillNavigate as EventListener);

    return () => {
      el.removeEventListener('did-start-loading', onStart);
      el.removeEventListener('did-stop-loading', onStop);
      el.removeEventListener('did-navigate', onNav as EventListener);
      el.removeEventListener('did-navigate-in-page', onNav as EventListener);
      el.removeEventListener('will-navigate', onWillNavigate as EventListener);
      el.removeEventListener('new-window', onNewWindow as EventListener);
      container.removeChild(el);
      wvRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused]);

  const navigate = (raw: string) => {
    let url = raw.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      url = url.includes('.') && !url.includes(' ') ? `https://${url}` : `https://www.google.com/search?q=${encodeURIComponent(url)}`;
    }
    setInputUrl(url);
    isBarNavRef.current = true;
    wvRef.current?.loadURL(url);
  };

  const borderCls = WEB_BORDER_COLORS[nodeColor] || 'border-border';

  return (
    <div className={cn('group w-full h-full flex flex-col rounded-xl bg-bg-elevated border-2 shadow-lg overflow-hidden', borderCls)}>
      <CardResizer minWidth={400} minHeight={300} selected={selected} />
      <CardHandles />

      {/* Chrome bar */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border bg-bg cursor-grab active:cursor-grabbing">
        <div className="w-3 h-3 rounded-full bg-text-subtle/20 shrink-0" title="Favicon" />
        <form onSubmit={(e) => { e.preventDefault(); navigate(inputUrl); }} className="flex-1 flex items-center bg-bg-hover rounded-md px-2 py-1 min-w-0 nodrag">
          <input value={inputUrl} onChange={(e) => setInputUrl(e.target.value)} onFocus={(e) => e.target.select()} className="flex-1 bg-transparent outline-none text-[11px] text-text font-mono truncate" />
        </form>
        <div className="flex items-center gap-0.5 shrink-0 nodrag">
          <button onClick={() => setShowColorPicker((v) => !v)} className="p-1 rounded text-text-muted hover:text-text hover:bg-bg-hover relative" title="Color">
            <div className={cn('w-3 h-3 rounded-full border', nodeColor === 'none' ? 'border-text-subtle/40 bg-transparent' : WEB_COLORS.find((c) => c.value === nodeColor)?.cls)} />
          </button>
          <button onClick={() => { if (inputUrl) window.open(inputUrl, '_blank'); }} className="p-1 rounded text-text-muted hover:text-text hover:bg-bg-hover" title="Open in system browser"><ExternalLink size={11} /></button>
          <button onClick={onRemove} className="p-1 rounded text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100" title="Close"><X size={11} /></button>
        </div>
      </div>

      {/* Color picker dropdown */}
      {showColorPicker && (
        <div className="absolute top-10 right-2 z-50 p-2 rounded-lg border border-border bg-bg-elevated shadow-xl flex items-center gap-1.5 nodrag">
          {WEB_COLORS.map((c) => (
            <button key={c.value} onClick={() => { onColorChange(c.value); setShowColorPicker(false); }} title={c.label}
              className={cn('w-5 h-5 rounded-full border-2 transition-transform hover:scale-110',
                c.value === 'none' ? 'border-text-subtle/40 bg-transparent' : cn(c.cls, 'border-transparent'),
                c.value === nodeColor && 'ring-2 ring-accent ring-offset-1'
              )}
            />
          ))}
        </div>
      )}

      {/* Webview container */}
      <div ref={containerRef} className="flex-1 relative nodrag" style={{ minHeight: 200 }}>
        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg/80 z-10">
            <div className="text-xs text-text-muted">Paused</div>
          </div>
        )}
        {loading && !isPaused && <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent/30 overflow-hidden z-10"><div className="h-full w-1/3 bg-accent animate-pulse" /></div>}
      </div>
    </div>
  );
}

// ─── Utility ────────────────────────────────────────────────────────────────

function normalizeUrl(raw: string): string {
  const url = raw.trim();
  if (!url) return 'https://google.com';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.includes('.') && !url.includes(' ')) return `https://${url}`;
  return `https://www.google.com/search?q=${encodeURIComponent(url)}`;
}

function getDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url.slice(0, 30);
  }
}

// ─── Format conversion ───────────────────────────────────────────────────────

function canvasNodesToFlow(nodes: CanvasNode[]): Node[] {
  return nodes.map((n) => {
    const base = { id: n.id, position: { x: n.x, y: n.y }, style: { width: n.width, height: n.height }, data: {} as Record<string, unknown> };
    switch (n.type) {
      case 'sticky': return { ...base, type: 'stickyCard', data: { text: n.text, color: n.color } };
      case 'web': return { ...base, type: 'webCard', data: { url: n.url, color: n.color || 'none', paused: false } };
    }
  });
}

function canvasEdgesToFlow(edges: CanvasEdge[]): Edge[] {
  return edges.map((e) => ({ id: e.id, source: e.fromNode, target: e.toNode, sourceHandle: e.fromSide, targetHandle: e.toSide, label: e.label, type: 'smoothstep', style: EDGE_STYLE }));
}

function flowNodesToCanvas(nodes: Node[]): CanvasNode[] {
  return nodes.map((n) => {
    const w = (n.style?.width as number) ?? 240;
    const h = (n.style?.height as number) ?? 120;
    const pos = { id: n.id, x: n.position.x, y: n.position.y, width: w, height: h };
    switch (n.type) {
      case 'stickyCard': return { ...pos, type: 'sticky' as const, text: (n.data.text as string) ?? '', color: ((n.data.color as StickyColor) ?? 'yellow') };
      case 'webCard': return { ...pos, type: 'web' as const, url: (n.data.url as string) ?? 'https://google.com', color: (n.data.color as WebColor) || undefined };
      default: return { ...pos, type: 'sticky' as const, text: '', color: 'yellow' as const };
    }
  });
}

function flowEdgesToCanvas(edges: Edge[]): CanvasEdge[] {
  return edges.map((e) => ({ id: e.id, fromNode: e.source, toNode: e.target, fromSide: e.sourceHandle ?? undefined, toSide: e.targetHandle ?? undefined, label: typeof e.label === 'string' ? e.label : undefined }));
}
