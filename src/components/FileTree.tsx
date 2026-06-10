import { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  ChevronsDownUp,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  FilePlus,
  LayoutGrid,
  PenTool,
  MoreHorizontal,
  Pencil,
  Trash2,
  ExternalLink,
  Copy,
  ClipboardCopy,
  ArrowUpRightFromSquare,
  Pin,
  PinOff,
  Star,
} from 'lucide-react';
import { useVault } from '@/stores/vault';
import { cn, basenameNoExt, joinPath, MARKDOWN_EXT_RE } from '@/lib/utils';
import { api } from '@/lib/api';
import type { FileTreeNode } from '@/types';
import { ContextMenu, MenuSection } from './ContextMenu';
import { promptUser } from './PromptDialog';
import { confirmUser } from './ConfirmDialog';
import { toast } from './Toast';

interface CreatingState {
  kind: 'file' | 'folder' | 'drawing';
  parent: string;
}

export function FileTree() {
  const files = useVault((s) => s.files);
  const folders = useVault((s) => s.folders);
  const search = useVault((s) => s.search).trim().toLowerCase();
  const selectedTag = useVault((s) => s.selectedTag);
  const pinned = useVault((s) => s.pinned);
  const pinnedOnly = useVault((s) => s.pinnedOnly);
  const createFile = useVault((s) => s.createFile);
  const createExcalidraw = useVault((s) => s.createExcalidraw);
  const createFolder = useVault((s) => s.createFolder);
  const moveFile = useVault((s) => s.moveFile);

  const tree = useMemo(() => regroupDailyNotes(buildTree(files, folders)), [files, folders]);

  const [creating, setCreating] = useState<CreatingState | null>(null);
  const [creatingValue, setCreatingValue] = useState('');
  const [rootDragOver, setRootDragOver] = useState(false);
  const [collapseEpoch, setCollapseEpoch] = useState(0);
  const collapseAll = () => setCollapseEpoch((n) => n + 1);

  // Filter mode: when search, tag, or pinnedOnly is active, render flat list
  if (search || selectedTag || pinnedOnly) {
    let filtered = [...files.values()];
    if (search) {
      filtered = filtered.filter(
        (f) => f.name.toLowerCase().includes(search) || f.title.toLowerCase().includes(search)
      );
    }
    if (selectedTag) {
      filtered = filtered.filter((f) => f.tags.includes(selectedTag));
    }
    if (pinnedOnly) {
      filtered = filtered.filter((f) => pinned.has(f.rel));
    }
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    return (
      <div className="px-1 py-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-text-subtle">
            {pinnedOnly ? 'No pinned notes yet' : 'No matches'}
          </div>
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
            toast.error((err as Error).message);
          }
        }
      }}
    >
      {creating && creating.parent === '' && (
        <InlineInput
          icon={
            creating.kind === 'folder' ? (
              <Folder size={13} />
            ) : creating.kind === 'drawing' ? (
              <PenTool size={13} />
            ) : (
              <FileText size={13} />
            )
          }
          placeholder={
            creating.kind === 'folder'
              ? 'Folder name'
              : creating.kind === 'drawing'
                ? 'Drawing name'
                : 'Note name'
          }
          value={creatingValue}
          onChange={setCreatingValue}
          onCommit={async (v) => {
            if (!v.trim()) return setCreating(null);
            try {
              if (creating.kind === 'folder') {
                await createFolder(v.trim());
              } else if (creating.kind === 'drawing') {
                await createExcalidraw(v.trim());
              } else {
                await createFile(v.trim());
              }
            } catch (err) {
              toast.error((err as Error).message);
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
          collapseEpoch={collapseEpoch}
          onCollapseAll={collapseAll}
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
  // Bumped to collapse every folder at once. Folders watch it and close.
  collapseEpoch: number;
  onCollapseAll: () => void;
}

function NodeDispatcher(props: NodeDispatchProps) {
  if (props.node.type === 'file') {
    return <FileRow rel={props.node.rel} name={props.node.name} depth={props.depth} />;
  }
  return <FolderNode {...props} />;
}

function FolderNode({
  node,
  depth,
  creating,
  creatingValue,
  setCreating,
  setCreatingValue,
  collapseEpoch,
  onCollapseAll,
}: NodeDispatchProps) {
  const [open, setOpen] = useState(node.defaultOpen ?? true);
  const [dragOver, setDragOver] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const moveFile = useVault((s) => s.moveFile);
  const createFile = useVault((s) => s.createFile);
  const createExcalidraw = useVault((s) => s.createExcalidraw);
  const createFolder = useVault((s) => s.createFolder);
  const deleteFolder = useVault((s) => s.deleteFolder);
  const renameFolder = useVault((s) => s.renameFolder);
  const vaultPath = useVault((s) => s.vaultPath);

  // Collapse-all: when the epoch bumps, every folder closes. Guard on > 0 so the
  // initial mount keeps each folder's defaultOpen.
  useEffect(() => {
    if (collapseEpoch > 0) setOpen(false);
  }, [collapseEpoch]);
  // Virtual folders (e.g. Year/Month buckets inside Daily Notes) only exist in the UI —
  // no disk path to rename, no drop target, no context menu actions.
  const isVirtual = node.virtual === true;

  const sections: MenuSection[] = [
    {
      label: 'Create',
      items: [
        {
          label: 'New Note Here',
          icon: <FilePlus size={13} />,
          onClick: () => {
            setCreating({ kind: 'file', parent: node.rel });
            setCreatingValue('');
            setOpen(true);
          },
        },
        {
          label: 'New Drawing Here',
          icon: <PenTool size={13} />,
          onClick: () => {
            setCreating({ kind: 'drawing', parent: node.rel });
            setCreatingValue('');
            setOpen(true);
          },
        },
        {
          label: 'New Subfolder',
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
          label: 'Rename',
          icon: <Pencil size={13} />,
          onClick: async () => {
            const next = await promptUser({
              title: 'Rename folder',
              message: node.rel,
              defaultValue: node.name,
              okLabel: 'Rename',
            });
            if (next && next.trim() && next.trim() !== node.name) {
              try {
                await renameFolder(node.rel, next.trim());
              } catch (err) {
                toast.error(`Rename failed: ${(err as Error).message}`);
              }
            }
          },
        },
        {
          label: 'Collapse all',
          icon: <ChevronsDownUp size={13} />,
          onClick: onCollapseAll,
        },
        {
          label: 'Reveal in Finder',
          icon: <ExternalLink size={13} />,
          onClick: () => {
            if (vaultPath) api.files.reveal(joinPath(vaultPath, node.rel));
          },
        },
        {
          label: 'Copy Folder Path',
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
          label: 'Delete Folder',
          icon: <Trash2 size={13} />,
          danger: true,
          onClick: async () => {
            const ok = await confirmUser({
              title: `Move "${node.name}" to trash?`,
              message: 'The folder and everything inside it will go to the system trash.',
              okLabel: 'Move to Trash',
              destructive: true,
            });
            if (ok) deleteFolder(node.rel).catch((err) => toast.error(err.message));
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
          if (isVirtual) return;
          if (e.dataTransfer.types.includes('text/x-rel')) {
            e.preventDefault();
            setDragOver(true);
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={async (e) => {
          if (isVirtual) return;
          e.preventDefault();
          setDragOver(false);
          const rel = e.dataTransfer.getData('text/x-rel');
          if (rel && rel !== node.rel) {
            try {
              await moveFile(rel, node.rel);
              setOpen(true);
            } catch (err) {
              toast.error((err as Error).message);
            }
          }
        }}
      >
        <button
          onClick={() => setOpen(!open)}
          onContextMenu={(e) => {
            if (isVirtual) return;
            e.preventDefault();
            setMenu({ x: e.clientX, y: e.clientY });
          }}
          className={cn(
            'w-full flex items-center gap-2 py-[5px] px-2 rounded text-[12.5px] font-medium hover:bg-bg-hover transition-colors',
            isVirtual ? 'text-text-muted' : 'text-text',
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
        {!isVirtual && (
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
        )}
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
              icon={
                creating.kind === 'folder' ? (
                  <Folder size={13} />
                ) : creating.kind === 'drawing' ? (
                  <PenTool size={13} />
                ) : (
                  <FileText size={13} />
                )
              }
              placeholder={
                creating.kind === 'folder'
                  ? 'Folder name'
                  : creating.kind === 'drawing'
                    ? 'Drawing name'
                    : 'Note name'
              }
              value={creatingValue}
              onChange={setCreatingValue}
              onCommit={async (v) => {
                if (!v.trim()) return setCreating(null);
                try {
                  const path = `${node.rel}/${v.trim()}`;
                  if (creating.kind === 'folder') {
                    await createFolder(path);
                  } else if (creating.kind === 'drawing') {
                    await createExcalidraw(path);
                  } else {
                    await createFile(path);
                  }
                } catch (err) {
                  toast.error((err as Error).message);
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
              collapseEpoch={collapseEpoch}
              onCollapseAll={onCollapseAll}
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
  const isPinned = useVault((s) => s.pinned.has(rel));
  const togglePin = useVault((s) => s.togglePin);
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
        {
          label: isPinned ? 'Unpin' : 'Pin',
          icon: isPinned ? <PinOff size={13} /> : <Pin size={13} />,
          onClick: () => togglePin(rel),
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
          label: 'Copy File Path',
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
              toast.error((err as Error).message);
            }
          },
        },
        {
          label: 'Rename',
          icon: <Pencil size={13} />,
          onClick: async () => {
            const stripped = rel.replace(MARKDOWN_EXT_RE, '').replace(/\.canvas$/i, '');
            const next = await promptUser({
              title: 'Rename',
              message: rel,
              defaultValue: stripped,
              okLabel: 'Rename',
            });
            if (next && next.trim() && next.trim() !== stripped) {
              try {
                await renameFile(rel, next.trim());
              } catch (err) {
                console.error(err);
                toast.error(`Rename failed: ${(err as Error).message}`);
              }
            }
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
          onClick: async () => {
            const ok = await confirmUser({
              title: `Move "${name}" to trash?`,
              message: 'You can restore it from the system trash.',
              okLabel: 'Move to Trash',
              destructive: true,
            });
            if (ok) deleteFile(rel).catch((err) => toast.error((err as Error).message));
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
        <span className="truncate flex-1 text-left">{name}</span>
        {isPinned && <Star size={11} className="shrink-0 text-accent fill-accent/40 anim-pop" />}
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

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Display-only: group `Daily Notes/YYYY-MM-DD.md` files under virtual Year/Month buckets.
 *  Files themselves keep their flat rel paths on disk, so opening, saving, linking, and
 *  the watcher all stay correct. The virtual nodes carry `virtual: true` so the renderer
 *  hides destructive actions (rename/delete/drop) on them. */
function regroupDailyNotes(tree: FileTreeNode[]): FileTreeNode[] {
  return tree.map((node) => {
    if (node.type !== 'folder' || node.rel !== 'Daily Notes' || !node.children) return node;
    return { ...node, children: groupDailyChildren(node.children) };
  });
}

function groupDailyChildren(children: FileTreeNode[]): FileTreeNode[] {
  // Year → Month → file list. Untouched: existing subfolders + non-dated files.
  const byYear = new Map<string, Map<number, FileTreeNode[]>>();
  const passthrough: FileTreeNode[] = [];
  for (const c of children) {
    // Preserve real user-created subfolders (e.g. Daily Notes/Todos) as-is.
    if (c.type === 'folder') {
      passthrough.push(c);
      continue;
    }
    const m = c.name.match(/^(\d{4})-(\d{2})-\d{2}$/);
    if (!m) {
      passthrough.push(c); // README, scratch files, etc.
      continue;
    }
    const year = m[1];
    const monthIdx = parseInt(m[2], 10) - 1;
    if (!byYear.has(year)) byYear.set(year, new Map());
    const months = byYear.get(year)!;
    if (!months.has(monthIdx)) months.set(monthIdx, []);
    months.get(monthIdx)!.push(c);
  }
  const years = [...byYear.keys()].sort().reverse(); // most recent first
  const yearNodes: FileTreeNode[] = years.map((year, yi) => {
    const months = byYear.get(year)!;
    const monthIdxs = [...months.keys()].sort((a, b) => b - a); // newest month first
    const monthNodes: FileTreeNode[] = monthIdxs.map((idx, mi) => {
      const files = months.get(idx)!.sort((a, b) => b.name.localeCompare(a.name)); // newest day first
      return {
        type: 'folder',
        name: MONTH_NAMES[idx],
        path: '',
        rel: `__virtual__/Daily Notes/${year}/${MONTH_NAMES[idx]}`,
        children: files,
        virtual: true,
        // Only the most-recent month of the most-recent year opens by default; the rest
        // collapse so the sidebar stays short.
        defaultOpen: yi === 0 && mi === 0,
      };
    });
    return {
      type: 'folder',
      name: year,
      path: '',
      rel: `__virtual__/Daily Notes/${year}`,
      children: monthNodes,
      virtual: true,
      defaultOpen: yi === 0,
    };
  });
  return [...passthrough, ...yearNodes];
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
