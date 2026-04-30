import { useMemo, useState } from 'react';
import {
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  FilePlus,
  LayoutGrid,
  MoreHorizontal,
  Pencil,
  Trash2,
  ExternalLink,
  Copy,
  ClipboardCopy,
  ArrowUpRightFromSquare,
} from 'lucide-react';
import { useVault } from '@/stores/vault';
import { cn, basenameNoExt, joinPath } from '@/lib/utils';
import { api } from '@/lib/api';
import type { FileTreeNode } from '@/types';
import { ContextMenu, MenuSection } from './ContextMenu';

interface CreatingState {
  kind: 'file' | 'folder';
  parent: string;
}

export function FileTree() {
  const files = useVault((s) => s.files);
  const folders = useVault((s) => s.folders);
  const search = useVault((s) => s.search).trim().toLowerCase();
  const selectedTag = useVault((s) => s.selectedTag);
  const createFile = useVault((s) => s.createFile);
  const createCanvas = useVault((s) => s.createCanvas);
  const createFolder = useVault((s) => s.createFolder);
  const moveFile = useVault((s) => s.moveFile);

  const tree = useMemo(() => buildTree(files, folders), [files, folders]);

  const [creating, setCreating] = useState<CreatingState | null>(null);
  const [creatingValue, setCreatingValue] = useState('');
  const [rootDragOver, setRootDragOver] = useState(false);

  // Filter mode: when search or tag is active, render flat list
  if (search || selectedTag) {
    let filtered = [...files.values()];
    if (search) {
      filtered = filtered.filter(
        (f) => f.name.toLowerCase().includes(search) || f.title.toLowerCase().includes(search)
      );
    }
    if (selectedTag) {
      filtered = filtered.filter((f) => f.tags.includes(selectedTag));
    }
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    return (
      <div className="px-1 py-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-text-subtle">No matches</div>
        ) : (
          filtered.map((f) => <FileRow key={f.rel} rel={f.rel} name={f.title || f.name} depth={0} />)
        )}
      </div>
    );
  }

  return (
    <div
      className={cn('px-1 py-1 transition-colors rounded', rootDragOver && 'bg-accent/10 ring-1 ring-accent/30')}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('text/x-rel')) {
          e.preventDefault();
          setRootDragOver(true);
        }
      }}
      onDragLeave={() => setRootDragOver(false)}
      onDrop={async (e) => {
        setRootDragOver(false);
        const rel = e.dataTransfer.getData('text/x-rel');
        if (rel) {
          try {
            await moveFile(rel, '');
          } catch (err) {
            window.alert((err as Error).message);
          }
        }
      }}
    >
      <div className="flex gap-1 px-2 mb-1">
        <ToolbarButton
          onClick={() => {
            setCreating({ kind: 'file', parent: '' });
            setCreatingValue('');
          }}
          title="New note"
        >
          <FilePlus size={13} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            setCreating({ kind: 'folder', parent: '' });
            setCreatingValue('');
          }}
          title="New folder"
        >
          <FolderPlus size={13} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            const name = window.prompt('Canvas name:', 'Untitled canvas');
            if (name && name.trim()) createCanvas(name.trim()).catch(console.error);
          }}
          title="New canvas"
        >
          <LayoutGrid size={13} />
        </ToolbarButton>
      </div>

      {creating && creating.parent === '' && (
        <InlineInput
          icon={creating.kind === 'folder' ? <Folder size={13} /> : <FileText size={13} />}
          placeholder={creating.kind === 'folder' ? 'Folder name' : 'Note name'}
          value={creatingValue}
          onChange={setCreatingValue}
          onCommit={async (v) => {
            if (!v.trim()) return setCreating(null);
            try {
              if (creating.kind === 'folder') {
                await createFolder(v.trim());
              } else {
                await createFile(v.trim());
              }
            } catch (err) {
              window.alert((err as Error).message);
            }
            setCreating(null);
          }}
          onCancel={() => setCreating(null)}
          depth={0}
        />
      )}

      {tree.map((node) => (
        <NodeDispatcher
          key={(node.type === 'folder' ? 'd:' : 'f:') + node.rel}
          node={node}
          depth={0}
          creating={creating}
          creatingValue={creatingValue}
          setCreating={setCreating}
          setCreatingValue={setCreatingValue}
        />
      ))}
    </div>
  );
}

interface NodeDispatchProps {
  node: FileTreeNode;
  depth: number;
  creating: CreatingState | null;
  creatingValue: string;
  setCreating: (v: CreatingState | null) => void;
  setCreatingValue: (v: string) => void;
}

function NodeDispatcher(props: NodeDispatchProps) {
  if (props.node.type === 'file') {
    return <FileRow rel={props.node.rel} name={props.node.name} depth={props.depth} />;
  }
  return <FolderNode {...props} />;
}

function ToolbarButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded hover:bg-bg-hover text-text-muted hover:text-text transition-colors"
    >
      {children}
    </button>
  );
}

function FolderNode({
  node,
  depth,
  creating,
  creatingValue,
  setCreating,
  setCreatingValue,
}: NodeDispatchProps) {
  const [open, setOpen] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const moveFile = useVault((s) => s.moveFile);
  const createFile = useVault((s) => s.createFile);
  const createFolder = useVault((s) => s.createFolder);
  const deleteFolder = useVault((s) => s.deleteFolder);
  const vaultPath = useVault((s) => s.vaultPath);

  const sections: MenuSection[] = [
    {
      label: 'Create',
      items: [
        {
          label: 'New note here',
          icon: <FilePlus size={13} />,
          onClick: () => {
            setCreating({ kind: 'file', parent: node.rel });
            setCreatingValue('');
            setOpen(true);
          },
        },
        {
          label: 'New subfolder',
          icon: <FolderPlus size={13} />,
          onClick: () => {
            setCreating({ kind: 'folder', parent: node.rel });
            setCreatingValue('');
            setOpen(true);
          },
        },
      ],
    },
    {
      label: 'Folder',
      items: [
        {
          label: 'Reveal in Finder',
          icon: <ExternalLink size={13} />,
          onClick: () => {
            if (vaultPath) api.files.reveal(joinPath(vaultPath, node.rel));
          },
        },
        {
          label: 'Copy folder path',
          icon: <ClipboardCopy size={13} />,
          onClick: () => {
            navigator.clipboard.writeText(node.rel).catch(() => {});
          },
        },
      ],
    },
    {
      items: [
        {
          label: 'Delete folder',
          icon: <Trash2 size={13} />,
          danger: true,
          onClick: () => {
            if (window.confirm(`Move folder "${node.name}" and its contents to trash?`)) {
              deleteFolder(node.rel).catch((err) => window.alert(err.message));
            }
          },
        },
      ],
    },
  ];

  return (
    <div>
      <div
        className="relative group"
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('text/x-rel')) {
            e.preventDefault();
            setDragOver(true);
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setDragOver(false);
          const rel = e.dataTransfer.getData('text/x-rel');
          if (rel && rel !== node.rel) {
            try {
              await moveFile(rel, node.rel);
              setOpen(true);
            } catch (err) {
              window.alert((err as Error).message);
            }
          }
        }}
      >
        <button
          onClick={() => setOpen(!open)}
          onContextMenu={(e) => {
            e.preventDefault();
            setMenu({ x: e.clientX, y: e.clientY });
          }}
          className={cn(
            'w-full flex items-center gap-2 py-[5px] px-2 rounded text-[12.5px] font-medium text-text hover:bg-bg-hover transition-colors',
            dragOver && 'bg-accent-subtle ring-1 ring-accent/40'
          )}
          style={{ paddingLeft: 8 + depth * 12 }}
        >
          <ChevronRight size={12} className={cn('transition-transform shrink-0', open && 'rotate-90')} />
          {open ? <FolderOpen size={14} className="shrink-0" /> : <Folder size={14} className="shrink-0" />}
          <span className="truncate">{node.name}</span>
          <span className="ml-auto text-[10px] text-text-subtle opacity-0 group-hover:opacity-100">
            {node.children?.length ?? 0}
          </span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setMenu({ x: r.right, y: r.bottom });
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-bg-active text-text-muted"
        >
          <MoreHorizontal size={12} />
        </button>
        {menu && (
          <ContextMenu
            x={menu.x}
            y={menu.y}
            sections={sections}
            onClose={() => setMenu(null)}
            width={220}
          />
        )}
      </div>
      {open && (
        <div>
          {creating && creating.parent === node.rel && (
            <InlineInput
              icon={creating.kind === 'folder' ? <Folder size={13} /> : <FileText size={13} />}
              placeholder={creating.kind === 'folder' ? 'Folder name' : 'Note name'}
              value={creatingValue}
              onChange={setCreatingValue}
              onCommit={async (v) => {
                if (!v.trim()) return setCreating(null);
                try {
                  const path = `${node.rel}/${v.trim()}`;
                  if (creating.kind === 'folder') {
                    await createFolder(path);
                  } else {
                    await createFile(path);
                  }
                } catch (err) {
                  window.alert((err as Error).message);
                }
                setCreating(null);
              }}
              onCancel={() => setCreating(null)}
              depth={depth + 1}
            />
          )}
          {node.children?.map((c) => (
            <NodeDispatcher
              key={(c.type === 'folder' ? 'd:' : 'f:') + c.rel}
              node={c}
              depth={depth + 1}
              creating={creating}
              creatingValue={creatingValue}
              setCreating={setCreating}
              setCreatingValue={setCreatingValue}
            />
          ))}
          {(!node.children || node.children.length === 0) && (
            <div
              className="text-[11px] text-text-subtle px-2 py-1 italic"
              style={{ paddingLeft: 8 + (depth + 1) * 12 + 14 }}
            >
              empty
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FileRow({ rel, name, depth }: { rel: string; name: string; depth: number }) {
  const activeFile = useVault((s) => s.activeFile);
  const openFile = useVault((s) => s.openFile);
  const renameFile = useVault((s) => s.renameFile);
  const deleteFile = useVault((s) => s.deleteFile);
  const vaultPath = useVault((s) => s.vaultPath);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const isCanvas = rel.endsWith('.canvas');

  const sections: MenuSection[] = [
    {
      items: [
        {
          label: 'Open',
          icon: <ArrowUpRightFromSquare size={13} />,
          hint: '↵',
          onClick: () => openFile(rel),
        },
      ],
    },
    {
      label: 'File',
      items: [
        {
          label: 'Reveal in Finder',
          icon: <ExternalLink size={13} />,
          onClick: () => {
            if (vaultPath) api.files.reveal(joinPath(vaultPath, rel));
          },
        },
        {
          label: 'Copy file path',
          icon: <ClipboardCopy size={13} />,
          onClick: () => {
            navigator.clipboard.writeText(rel).catch(() => {});
          },
        },
        {
          label: 'Duplicate',
          icon: <Copy size={13} />,
          onClick: async () => {
            if (!vaultPath) return;
            try {
              const newRel = await api.files.duplicate(vaultPath, rel);
              // Refresh index by reloading
              await useVault.getState().reloadIndex();
              useVault.getState().openFile(newRel);
            } catch (err) {
              window.alert((err as Error).message);
            }
          },
        },
        {
          label: 'Rename',
          icon: <Pencil size={13} />,
          onClick: () => {
            const next = window.prompt('Rename to:', rel.replace(/\.(md|canvas)$/i, ''));
            if (next && next.trim()) renameFile(rel, next.trim()).catch(console.error);
          },
        },
      ],
    },
    {
      items: [
        {
          label: 'Delete',
          icon: <Trash2 size={13} />,
          danger: true,
          onClick: () => {
            if (window.confirm(`Move "${name}" to trash?`)) {
              deleteFile(rel).catch(console.error);
            }
          },
        },
      ],
    },
  ];

  return (
    <div
      className="relative group"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/x-rel', rel);
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      <button
        onClick={() => openFile(rel)}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY });
        }}
        className={cn(
          'w-full flex items-center gap-2 py-[5px] px-2 rounded text-[12.5px] transition-colors',
          activeFile === rel
            ? 'bg-accent-subtle text-accent-ink font-medium'
            : 'text-text-muted hover:bg-bg-hover hover:text-text'
        )}
        style={{ paddingLeft: 8 + depth * 12 + 14 }}
      >
        {isCanvas ? (
          <LayoutGrid size={13} className="shrink-0 text-accent" />
        ) : (
          <FileText size={13} className="shrink-0 opacity-70" />
        )}
        <span className="truncate">{name}</span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setMenu({ x: r.right, y: r.bottom });
        }}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-bg-active text-text-muted"
      >
        <MoreHorizontal size={12} />
      </button>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          sections={sections}
          onClose={() => setMenu(null)}
          width={220}
        />
      )}
    </div>
  );
}


function InlineInput({
  icon,
  placeholder,
  value,
  onChange,
  onCommit,
  onCancel,
  depth,
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onCommit: (v: string) => void;
  onCancel: () => void;
  depth: number;
}) {
  return (
    <div
      className="flex items-center gap-1.5 py-1 px-2 mx-0.5 rounded bg-bg border border-accent/40"
      style={{ paddingLeft: 8 + depth * 12 + 14 }}
    >
      <span className="text-text-subtle shrink-0">{icon}</span>
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommit(value);
          else if (e.key === 'Escape') onCancel();
        }}
        onBlur={() => onCommit(value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-sm placeholder:text-text-subtle"
      />
    </div>
  );
}

function buildTree(
  files: Map<string, import('@/types').VaultFile>,
  folders: Set<string>
): FileTreeNode[] {
  const root: FileTreeNode = { type: 'folder', name: '', path: '', rel: '', children: [] };

  const ensureFolder = (rel: string): FileTreeNode => {
    if (rel === '') return root;
    const parts = rel.split('/');
    let cur = root;
    let acc = '';
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      let child = cur.children!.find((c) => c.type === 'folder' && c.name === part);
      if (!child) {
        child = { type: 'folder', name: part, path: '', rel: acc, children: [] };
        cur.children!.push(child);
      }
      cur = child;
    }
    return cur;
  };

  const sorted = [...files.values()].sort((a, b) => a.rel.localeCompare(b.rel));
  for (const f of sorted) {
    const parts = f.rel.split('/');
    const fileName = parts.pop()!;
    const parentRel = parts.join('/');
    const parent = ensureFolder(parentRel);
    parent.children!.push({
      type: 'file',
      name: basenameNoExt(fileName),
      path: f.path,
      rel: f.rel,
    });
  }
  for (const folderRel of folders) {
    ensureFolder(folderRel);
  }

  function sortNode(n: FileTreeNode) {
    if (!n.children) return;
    n.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    n.children.forEach(sortNode);
  }
  sortNode(root);
  return root.children ?? [];
}
