import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useVault } from '@/stores/vault';
import { api } from '@/lib/api';
import { joinPath, basenameNoExt } from '@/lib/utils';
import {
  FileText,
  StickyNote,
  Type,
  Trash2,
  MousePointer2,
  ArrowRight,
  PencilLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CanvasFile {
  version: 1;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}
type StickyColor = 'yellow' | 'pink' | 'blue';
type CanvasNode =
  | {
      id: string;
      type: 'text';
      x: number;
      y: number;
      width: number;
      height: number;
      text: string;
    }
  | {
      id: string;
      type: 'sticky';
      x: number;
      y: number;
      width: number;
      height: number;
      text: string;
      color: StickyColor;
    }
  | {
      id: string;
      type: 'file';
      x: number;
      y: number;
      width: number;
      height: number;
      file: string; // rel
    };
interface CanvasEdge {
  id: string;
  fromNode: string;
  toNode: string;
  fromSide?: string;
  toSide?: string;
  label?: string;
}

const EMPTY: CanvasFile = { version: 1, nodes: [], edges: [] };

interface CanvasHandlers {
  updateNodeData: (id: string, patch: Record<string, unknown>) => void;
  removeNode: (id: string) => void;
}

/** A stable container; we mutate `.current` as needed so node renderers keep a constant
 *  reference and we never trigger React Flow's "new nodeTypes object" warning. */
const CanvasHandlersContext = createContext<{ ref: { current: CanvasHandlers } } | null>(null);

function useCanvasHandlers(): CanvasHandlers {
  const ctx = useContext(CanvasHandlersContext);
  if (!ctx) throw new Error('CanvasHandlersContext missing');
  return ctx.ref.current;
}

function TextCardNode(p: NodeProps) {
  const { updateNodeData, removeNode } = useCanvasHandlers();
  return (
    <TextCard
      {...p}
      onChange={(text) => updateNodeData(p.id, { text })}
      onRemove={() => removeNode(p.id)}
    />
  );
}

function StickyCardNode(p: NodeProps) {
  const { updateNodeData, removeNode } = useCanvasHandlers();
  return (
    <StickyCard
      {...p}
      onChange={(text) => updateNodeData(p.id, { text })}
      onColor={(color) => updateNodeData(p.id, { color })}
      onRemove={() => removeNode(p.id)}
    />
  );
}

function FileCardNode(p: NodeProps) {
  const { removeNode } = useCanvasHandlers();
  return <FileCard {...p} onRemove={() => removeNode(p.id)} />;
}

const CANVAS_NODE_TYPES = {
  textCard: TextCardNode,
  stickyCard: StickyCardNode,
  fileCard: FileCardNode,
} as const;

interface Props {
  rel: string;
  vaultPath: string;
}

export function CanvasView(props: Props) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function CanvasInner({ rel, vaultPath }: Props) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const flow = useReactFlow();

  // Load canvas file
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const full = joinPath(vaultPath, rel);
        const raw = await api.files.read(full);
        const data: CanvasFile = raw.trim() ? JSON.parse(raw) : EMPTY;
        if (cancelled) return;
        setNodes(canvasNodesToFlow(data.nodes));
        setEdges(canvasEdgesToFlow(data.edges));
        setLoaded(true);
        // Center the view after load
        setTimeout(() => flow.fitView({ padding: 0.3, duration: 300 }), 50);
      } catch (err) {
        console.error('Failed to load canvas', err);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rel, vaultPath, flow]);

  // Debounced save
  const queueSave = useCallback(
    (n: Node[], e: Edge[]) => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(async () => {
        const data: CanvasFile = {
          version: 1,
          nodes: flowNodesToCanvas(n),
          edges: flowEdgesToCanvas(e),
        };
        try {
          await api.files.write(joinPath(vaultPath, rel), JSON.stringify(data, null, 2));
        } catch (err) {
          console.error('Failed to save canvas', err);
        }
      }, 350);
    },
    [vaultPath, rel]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((cur) => {
        const next = applyNodeChanges(changes, cur);
        if (loaded) queueSave(next, edges);
        return next;
      });
    },
    [edges, loaded, queueSave]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((cur) => {
        const next = applyEdgeChanges(changes, cur);
        if (loaded) queueSave(nodes, next);
        return next;
      });
    },
    [nodes, loaded, queueSave]
  );

  const onConnect = useCallback(
    (conn: Connection) => {
      setEdges((cur) => {
        const next = addEdge(
          {
            ...conn,
            type: 'smoothstep',
            animated: false,
            style: { stroke: 'rgb(var(--c-accent))', strokeWidth: 1.5 },
          },
          cur
        );
        if (loaded) queueSave(nodes, next);
        return next;
      });
    },
    [nodes, loaded, queueSave]
  );

  const updateNodeData = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      setNodes((cur) => {
        const next = cur.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
        queueSave(next, edges);
        return next;
      });
    },
    [edges, queueSave]
  );

  const removeNode = useCallback(
    (id: string) => {
      setNodes((cur) => {
        const next = cur.filter((n) => n.id !== id);
        setEdges((curEdges) => {
          const newEdges = curEdges.filter((e) => e.source !== id && e.target !== id);
          queueSave(next, newEdges);
          return newEdges;
        });
        return next;
      });
    },
    [queueSave]
  );

  const stickyCycleRef = useRef(0);

  const addCard = useCallback(
    (kind: 'text' | 'file' | 'sticky', file?: string) => {
      // Place near the center of the current viewport
      const { x, y, zoom } = flow.getViewport();
      const w = window.innerWidth / 2;
      const h = window.innerHeight / 2;
      const px = (w - x) / zoom;
      const py = (h - y) / zoom;
      const id = `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      let node: Node;
      if (kind === 'text') {
        node = {
          id,
          type: 'textCard',
          position: { x: px - 120, y: py - 60 },
          data: { text: '' },
          style: { width: 240, height: 120 },
        };
      } else if (kind === 'sticky') {
        const colors: StickyColor[] = ['yellow', 'pink', 'blue'];
        const color = colors[stickyCycleRef.current % colors.length];
        stickyCycleRef.current += 1;
        node = {
          id,
          type: 'stickyCard',
          position: { x: px - 110, y: py - 75 },
          data: { text: '', color },
          style: { width: 220, height: 150 },
        };
      } else {
        node = {
          id,
          type: 'fileCard',
          position: { x: px - 140, y: py - 70 },
          data: { file },
          style: { width: 280, height: 140 },
        };
      }
      setNodes((cur) => {
        const next = [...cur, node];
        queueSave(next, edges);
        return next;
      });
    },
    [flow, edges, queueSave]
  );

  const handlersRef = useRef<CanvasHandlers>({ updateNodeData, removeNode });
  handlersRef.current = { updateNodeData, removeNode };
  const handlersCtx = useMemo(() => ({ ref: handlersRef }), []);

  // Drag-drop a note from the file tree
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      const fileRel = e.dataTransfer.getData('text/x-rel');
      if (!fileRel) return;
      e.preventDefault();
      const bounds = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const point = flow.screenToFlowPosition({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      });
      const id = `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const node: Node = {
        id,
        type: 'fileCard',
        position: { x: point.x - 140, y: point.y - 70 },
        data: { file: fileRel },
        style: { width: 280, height: 140 },
      };
      setNodes((cur) => {
        const next = [...cur, node];
        queueSave(next, edges);
        return next;
      });
    },
    [flow, edges, queueSave]
  );

  return (
    <CanvasHandlersContext.Provider value={handlersCtx}>
    <div
      className="relative w-full h-full"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('text/x-rel')) e.preventDefault();
      }}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={CANVAS_NODE_TYPES}
        proOptions={{ hideAttribution: true }}
        fitView
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: 'rgb(var(--c-accent))', strokeWidth: 1.5 },
          animated: false,
        }}
        connectionLineType={ConnectionLineType.SmoothStep}
      >
        <Background gap={22} size={1.4} color="rgb(var(--c-border))" />
        <Controls
          position="bottom-left"
          showInteractive={false}
          className="!bg-bg-elevated/90 !border !border-border !rounded-md !shadow-sm"
        />
      </ReactFlow>

      {/* Centered floating toolbar pill */}
      <CanvasToolbar
        onAddSticky={() => addCard('sticky')}
        onAddText={() => addCard('text')}
        onAddNote={(rel) => addCard('file', rel)}
      />

      {/* Labelled overview / minimap */}
      <div className="absolute bottom-3 right-3 z-10 anim-fade-up">
        <div className="rounded-md border border-border bg-bg-elevated/95 backdrop-blur shadow-sm overflow-hidden">
          <div className="px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-text-subtle border-b border-border-subtle">
            Overview
          </div>
          <MiniMap
            pannable
            zoomable
            nodeColor={(n) => {
              if (n.type === 'fileCard') return 'rgb(var(--c-link))';
              if (n.type === 'stickyCard') {
                const c = (n.data?.color as StickyColor) ?? 'yellow';
                return c === 'yellow'
                  ? 'rgb(220 188 80)'
                  : c === 'pink'
                  ? 'rgb(216 144 132)'
                  : 'rgb(140 168 210)';
              }
              return 'rgb(var(--c-accent))';
            }}
            maskColor="rgb(var(--c-bg) / 0.7)"
            style={{ background: 'transparent', width: 168, height: 110, margin: 0 }}
            className="!relative !top-0 !left-0 !right-0 !bottom-0"
          />
        </div>
      </div>

      {/* Hint */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center bg-bg-elevated/70 backdrop-blur border border-border rounded-xl px-6 py-4">
            <div className="text-text mb-1 font-medium">Empty canvas</div>
            <div className="text-xs text-text-muted">
              Drop a note from the sidebar, or use the toolbar to add a card.
            </div>
          </div>
        </div>
      )}
    </div>
    </CanvasHandlersContext.Provider>
  );
}

function CanvasToolbar({
  onAddSticky,
  onAddText,
  onAddNote,
}: {
  onAddSticky: () => void;
  onAddText: () => void;
  onAddNote: (rel: string) => void;
}) {
  return (
    <div className="anim-fade-up absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-1.5 py-1 rounded-full bg-bg-elevated/95 backdrop-blur border border-border shadow-sm">
      <ToolPill icon={<MousePointer2 size={13} />} label="Select" active />
      <ToolPill icon={<StickyNote size={13} />} label="Sticky" onClick={onAddSticky} />
      <NoteCardPill onPick={onAddNote} />
      <ToolPill icon={<Type size={13} />} label="Text" onClick={onAddText} />
      <ToolPill
        icon={<ArrowRight size={13} />}
        label="Arrow"
        title="Drag from a card edge to connect"
      />
      <ToolPill icon={<PencilLine size={13} />} label="Pen" title="Coming soon" disabled />
    </div>
  );
}

function ToolPill({
  icon,
  label,
  active,
  onClick,
  title,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      disabled={disabled}
      className={cn(
        'press flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px]',
        active && 'bg-text text-bg font-medium',
        !active && !disabled && 'text-text-muted hover:bg-bg-hover hover:text-text',
        disabled && 'text-text-subtle cursor-not-allowed opacity-60'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function NoteCardPill({ onPick }: { onPick: (rel: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <ToolPill
        icon={<FileText size={13} />}
        label="Note card"
        onClick={() => setOpen((v) => !v)}
      />
      {open && (
        <div onMouseLeave={() => setOpen(false)}>
          <NoteCardSearch
            onPick={(rel) => {
              onPick(rel);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function NoteCardSearch({ onPick }: { onPick: (rel: string) => void }) {
  const files = useVault((s) => s.files);
  const [q, setQ] = useState('');
  const matches = useMemo(() => {
    const arr = [...files.values()].filter((f) => !f.rel.endsWith('.canvas'));
    const query = q.trim().toLowerCase();
    if (!query) return arr.slice(0, 12);
    return arr.filter((f) => (f.title || f.name).toLowerCase().includes(query)).slice(0, 12);
  }, [files, q]);
  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 rounded-lg border border-border bg-bg-elevated shadow-2xl py-1">
      <input
        autoFocus
        placeholder="Search notes…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full bg-transparent outline-none px-3 py-2 text-sm border-b border-border placeholder:text-text-subtle"
      />
      <div className="max-h-64 overflow-y-auto">
        {matches.length === 0 ? (
          <div className="px-3 py-3 text-xs text-text-subtle">No notes</div>
        ) : (
          matches.map((f) => (
            <button
              key={f.rel}
              onClick={() => onPick(f.rel)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-bg-hover"
            >
              <FileText size={13} className="text-text-subtle shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-text truncate">{f.title || f.name}</div>
                <div className="text-[10px] text-text-subtle truncate">{f.rel}</div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

const STICKY_STYLES: Record<StickyColor, { bg: string; border: string; ink: string; tab: string }> = {
  yellow: {
    bg: 'bg-[#f5e7a8]',
    border: 'border-[#d4ba5a]',
    ink: 'text-[#3a2f12]',
    tab: 'text-[#7a6520]',
  },
  pink: {
    bg: 'bg-[#f0c8c0]',
    border: 'border-[#c9968b]',
    ink: 'text-[#3a1f1a]',
    tab: 'text-[#824840]',
  },
  blue: {
    bg: 'bg-[#cfdcef]',
    border: 'border-[#9bb1cd]',
    ink: 'text-[#16223a]',
    tab: 'text-[#3e5374]',
  },
};

function StickyCard({
  data,
  onChange,
  onColor,
  onRemove,
}: NodeProps & {
  onChange: (s: string) => void;
  onColor: (c: StickyColor) => void;
  onRemove: () => void;
}) {
  const color = ((data.color as StickyColor) ?? 'yellow') as StickyColor;
  const [text, setText] = useState((data.text as string) ?? '');
  useEffect(() => setText((data.text as string) ?? ''), [data.text]);
  const styles = STICKY_STYLES[color] ?? STICKY_STYLES.yellow;
  return (
    <div
      className={cn(
        'anim-drop-in group w-full h-full flex flex-col rounded-lg shadow-md border overflow-hidden',
        styles.bg,
        styles.border
      )}
    >
      <CardHandles color="accent" />
      <div className={cn('flex items-center justify-between px-2.5 py-1 cursor-grab active:cursor-grabbing', styles.tab)}>
        <span className="text-[9.5px] uppercase tracking-[0.12em] font-medium">Sticky</span>
        <div className="flex items-center gap-1">
          {(['yellow', 'pink', 'blue'] as StickyColor[]).map((c) => (
            <button
              key={c}
              onClick={() => onColor(c)}
              title={c}
              className={cn(
                'w-2.5 h-2.5 rounded-full border opacity-0 group-hover:opacity-100 transition-opacity',
                c === color ? 'ring-1 ring-current' : 'border-current/30',
                c === 'yellow' && 'bg-[#e8c95c]',
                c === 'pink' && 'bg-[#d39084]',
                c === 'blue' && 'bg-[#7f9cc6]'
              )}
            />
          ))}
          <button
            className="ml-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
            onClick={onRemove}
            title="Delete"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value);
        }}
        placeholder="Jot a thought…"
        className={cn(
          'flex-1 bg-transparent outline-none px-3 pb-3 pt-1 text-[13px] font-medium leading-snug resize-none nodrag placeholder:opacity-50',
          styles.ink
        )}
      />
    </div>
  );
}

function TextCard({
  data,
  onChange,
  onRemove,
}: NodeProps & { onChange: (s: string) => void; onRemove: () => void }) {
  const [text, setText] = useState((data.text as string) ?? '');
  useEffect(() => setText((data.text as string) ?? ''), [data.text]);
  return (
    <div className="anim-drop-in group w-full h-full flex flex-col rounded-xl bg-bg-elevated border border-border shadow-md hover:border-accent/50 transition-colors overflow-hidden">
      <CardHandles color="accent" />
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-bg cursor-grab active:cursor-grabbing">
        <span className="text-[10px] uppercase tracking-wider text-text-subtle">Text</span>
        <button
          className="text-text-subtle hover:text-red-400 opacity-0 group-hover:opacity-100"
          onClick={onRemove}
          title="Delete"
        >
          <Trash2 size={11} />
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value);
        }}
        placeholder="Type something…"
        className="flex-1 bg-transparent outline-none p-3 text-sm text-text resize-none placeholder:text-text-subtle nodrag"
      />
    </div>
  );
}

/** Each card gets 4 handles (top/right/bottom/left). Each handle id is the side name,
 *  and acts as both source and target — react-flow lets us pass type for both. We do this
 *  by registering two handles per side (target + source) but with the same id, which
 *  works since react-flow distinguishes by type at connect time. */
function CardHandles({ color }: { color: 'accent' | 'link' }) {
  const cls = `!w-2 !h-2 !border-0 !${color === 'accent' ? 'bg-accent' : 'bg-link'}`;
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

function FileCard({ data, onRemove }: NodeProps & { onRemove: () => void }) {
  const fileRel = data.file as string;
  const file = useVault((s) => s.files.get(fileRel));
  const openFile = useVault((s) => s.openFile);
  const setView = useVault((s) => s.setView);
  const vaultPath = useVault((s) => s.vaultPath);
  const [preview, setPreview] = useState('');

  useEffect(() => {
    if (!vaultPath || !file) return;
    let cancelled = false;
    (async () => {
      try {
        const raw = await api.files.read(file.path);
        if (cancelled) return;
        const noFm = raw.replace(/^---\n[\s\S]*?\n---\n?/, '');
        // Strip first heading (used as title), then take first ~140 chars
        const noHeading = noFm.replace(/^#+\s.*\n+/, '').trim();
        setPreview(noHeading.slice(0, 200));
      } catch {
        /* skip */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vaultPath, file]);

  const category = file?.tags?.[0];

  return (
    <div className="anim-drop-in group w-full h-full flex flex-col rounded-xl bg-bg-elevated border border-border shadow-md hover:border-link/60 transition-colors overflow-hidden">
      <CardHandles color="link" />
      {category && (
        <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5">
          <FileText size={11} className="text-accent shrink-0" />
          <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-accent font-medium">
            {category}
          </span>
        </div>
      )}
      <div className={cn('px-3 flex items-center justify-between gap-2', category ? 'pt-0.5 pb-2' : 'pt-3 pb-2')}>
        <button
          onClick={() => {
            if (file) {
              openFile(file.rel);
              setView('editor');
            }
          }}
          className="text-[15px] font-serif font-semibold text-text truncate hover:underline nodrag text-left flex-1 min-w-0"
          title={fileRel}
        >
          {file?.title || basenameNoExt(fileRel)}
        </button>
        <button
          className="text-text-subtle hover:text-red-400 opacity-0 group-hover:opacity-100 shrink-0"
          onClick={onRemove}
          title="Remove from canvas"
        >
          <Trash2 size={11} />
        </button>
      </div>
      <div className="flex-1 overflow-hidden px-3 pb-3 text-xs text-text-muted leading-relaxed">
        {file ? preview || <span className="italic text-text-subtle">empty note</span> : (
          <span className="italic text-tag">missing: {fileRel}</span>
        )}
      </div>
    </div>
  );
}

// ---- conversion: canvas-file format <-> react-flow ----
function canvasNodesToFlow(nodes: CanvasNode[]): Node[] {
  return nodes.map((n) => {
    const base: Node = {
      id: n.id,
      position: { x: n.x, y: n.y },
      style: { width: n.width, height: n.height },
      data: {},
    };
    if (n.type === 'text') {
      return { ...base, type: 'textCard', data: { text: n.text } };
    }
    if (n.type === 'sticky') {
      return { ...base, type: 'stickyCard', data: { text: n.text, color: n.color } };
    }
    return { ...base, type: 'fileCard', data: { file: n.file } };
  });
}

function canvasEdgesToFlow(edges: CanvasEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.fromNode,
    target: e.toNode,
    sourceHandle: e.fromSide,
    targetHandle: e.toSide,
    label: e.label,
    type: 'smoothstep',
    style: { stroke: 'rgb(var(--c-accent))', strokeWidth: 1.5 },
  }));
}

function flowNodesToCanvas(nodes: Node[]): CanvasNode[] {
  return nodes.map((n) => {
    const w = (n.style?.width as number) ?? 240;
    const h = (n.style?.height as number) ?? 120;
    if (n.type === 'fileCard') {
      return {
        id: n.id,
        type: 'file',
        x: n.position.x,
        y: n.position.y,
        width: w,
        height: h,
        file: (n.data.file as string) ?? '',
      };
    }
    if (n.type === 'stickyCard') {
      return {
        id: n.id,
        type: 'sticky',
        x: n.position.x,
        y: n.position.y,
        width: w,
        height: h,
        text: (n.data.text as string) ?? '',
        color: ((n.data.color as StickyColor) ?? 'yellow') as StickyColor,
      };
    }
    return {
      id: n.id,
      type: 'text',
      x: n.position.x,
      y: n.position.y,
      width: w,
      height: h,
      text: (n.data.text as string) ?? '',
    };
  });
}

function flowEdgesToCanvas(edges: Edge[]): CanvasEdge[] {
  return edges.map((e) => ({
    id: e.id,
    fromNode: e.source,
    toNode: e.target,
    fromSide: e.sourceHandle ?? undefined,
    toSide: e.targetHandle ?? undefined,
    label: typeof e.label === 'string' ? e.label : undefined,
  }));
}
