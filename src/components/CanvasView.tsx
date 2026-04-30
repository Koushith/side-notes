import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { FileText, Plus, StickyNote, Type, Trash2 } from 'lucide-react';

interface CanvasFile {
  version: 1;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}
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

  const addCard = useCallback(
    (kind: 'text' | 'file', file?: string) => {
      // Place near the center of the current viewport
      const { x, y, zoom } = flow.getViewport();
      const w = window.innerWidth / 2;
      const h = window.innerHeight / 2;
      const px = (w - x) / zoom;
      const py = (h - y) / zoom;
      const id = `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const node: Node =
        kind === 'text'
          ? {
              id,
              type: 'textCard',
              position: { x: px - 120, y: py - 60 },
              data: { text: '' },
              style: { width: 240, height: 120 },
            }
          : {
              id,
              type: 'fileCard',
              position: { x: px - 140, y: py - 70 },
              data: { file },
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

  const nodeTypes = useMemo(
    () => ({
      textCard: (p: NodeProps) => (
        <TextCard
          {...p}
          onChange={(text) => updateNodeData(p.id, { text })}
          onRemove={() => removeNode(p.id)}
        />
      ),
      fileCard: (p: NodeProps) => <FileCard {...p} onRemove={() => removeNode(p.id)} />,
    }),
    [updateNodeData, removeNode]
  );

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
        nodeTypes={nodeTypes}
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
        <Background gap={24} size={1} color="rgb(var(--c-border) / 0.5)" />
        <Controls position="bottom-right" />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => (n.type === 'fileCard' ? 'rgb(var(--c-link))' : 'rgb(var(--c-accent))')}
          maskColor="rgb(var(--c-bg) / 0.7)"
          style={{ background: 'rgb(var(--c-bg-elevated))', borderRadius: 8 }}
        />
      </ReactFlow>

      {/* Floating toolbar */}
      <div className="absolute top-3 left-3 flex gap-2 z-10">
        <button
          onClick={() => addCard('text')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-elevated/90 backdrop-blur border border-border text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
        >
          <Type size={13} />
          Text card
        </button>
        <FileCardPicker onPick={(rel) => addCard('file', rel)} />
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
  );
}

function FileCardPicker({ onPick }: { onPick: (rel: string) => void }) {
  const files = useVault((s) => s.files);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const matches = useMemo(() => {
    const arr = [...files.values()].filter((f) => !f.rel.endsWith('.canvas'));
    const query = q.trim().toLowerCase();
    if (!query) return arr.slice(0, 12);
    return arr.filter((f) => (f.title || f.name).toLowerCase().includes(query)).slice(0, 12);
  }, [files, q]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-elevated/90 backdrop-blur border border-border text-sm text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
      >
        <StickyNote size={13} />
        Note card
        <Plus size={11} className="text-text-subtle" />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 w-72 rounded-lg border border-border bg-bg-elevated shadow-2xl py-1"
          onMouseLeave={() => setOpen(false)}
        >
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
                  onClick={() => {
                    onPick(f.rel);
                    setOpen(false);
                    setQ('');
                  }}
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
      )}
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
    <div className="group w-full h-full flex flex-col rounded-xl bg-bg-elevated border border-border shadow-md hover:border-accent/50 transition-colors overflow-hidden">
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

  return (
    <div className="group w-full h-full flex flex-col rounded-xl bg-bg-elevated border border-border shadow-md hover:border-link/60 transition-colors overflow-hidden">
      <CardHandles color="link" />
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-bg">
        <div className="flex items-center gap-1.5 min-w-0">
          <FileText size={12} className="text-link shrink-0" />
          <button
            onClick={() => {
              if (file) {
                openFile(file.rel);
                setView('editor');
              }
            }}
            className="text-sm font-medium text-text truncate hover:underline nodrag"
            title={fileRel}
          >
            {file?.title || basenameNoExt(fileRel)}
          </button>
        </div>
        <button
          className="text-text-subtle hover:text-red-400 opacity-0 group-hover:opacity-100"
          onClick={onRemove}
          title="Remove from canvas"
        >
          <Trash2 size={11} />
        </button>
      </div>
      <div className="flex-1 overflow-hidden p-3 text-xs text-text-muted leading-relaxed">
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
