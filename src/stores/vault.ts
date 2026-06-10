import { api } from '@/lib/api';
import { parseNote } from '@/lib/markdown';
import { basenameNoExt, isExcalidrawPath, isMarkdownPath, isViewablePath, joinPath, stripMarkdownExt } from '@/lib/utils';
import type { FileTreeNode, VaultFile, ViewMode } from '@/types';
import { create } from 'zustand';

interface VaultState {
  vaultPath: string | null;
  recentVaults: string[];
  files: Map<string, VaultFile>; // keyed by rel
  folders: Set<string>; // explicitly tracked rel folders (so empty folders show)
  activeFile: string | null; // rel
  tabs: string[]; // open file rels in order
  view: ViewMode;
  loading: boolean;
  search: string;
  selectedTag: string | null;
  pinned: Set<string>; // rels of pinned notes (per-vault, persisted)
  pinnedOnly: boolean; // when true, file tree filters to pinned files

  init: () => Promise<void>;
  pickVault: () => Promise<void>;
  openVault: (path: string) => Promise<void>;
  closeVault: () => Promise<void>;
  reloadIndex: () => Promise<void>;
  openFile: (rel: string) => void;
  closeTab: (rel: string) => void;
  reorderTabs: (next: string[]) => void;
  saveFile: (rel: string, content: string) => Promise<void>;
  createFile: (relPath: string) => Promise<string>;
  createCanvas: (relPath: string) => Promise<string>;
  createExcalidraw: (relPath: string) => Promise<string>;
  renameFile: (rel: string, newRel: string) => Promise<void>;
  renameFolder: (rel: string, newName: string) => Promise<void>;
  deleteFile: (rel: string) => Promise<void>;
  createFolder: (relPath: string) => Promise<void>;
  deleteFolder: (relPath: string) => Promise<void>;
  moveFile: (rel: string, newFolder: string) => Promise<void>;
  setView: (view: ViewMode) => void;
  setSearch: (s: string) => void;
  setSelectedTag: (tag: string | null) => void;
  togglePin: (rel: string) => void;
  isPinned: (rel: string) => boolean;
  setPinnedOnly: (v: boolean) => void;
  getFileTree: () => FileTreeNode[];
  getBacklinks: (rel: string) => VaultFile[];
  getAllTags: () => { tag: string; count: number }[];
  openOrCreateDaily: () => Promise<void>;
  searchContent: (query: string) => Promise<{ rel: string; title: string; snippet: string }[]>;
  getTemplates: () => VaultFile[];
  createFromTemplate: (templateRel: string, newName?: string) => Promise<string>;
}

const PINNED_KEY_PREFIX = 'side:pinned:';

function loadPinned(vaultPath: string | null): Set<string> {
  if (!vaultPath) return new Set();
  try {
    const raw = localStorage.getItem(PINNED_KEY_PREFIX + vaultPath);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function persistPinned(vaultPath: string | null, pinned: Set<string>) {
  if (!vaultPath) return;
  try {
    localStorage.setItem(PINNED_KEY_PREFIX + vaultPath, JSON.stringify([...pinned]));
  } catch {
    /* ignore quota errors */
  }
}

async function indexFile(vaultPath: string, rel: string, mtime: number): Promise<VaultFile> {
  const full = joinPath(vaultPath, rel);
  const fallback = basenameNoExt(rel);
  // Only markdown files have text content worth parsing for links/tags/title.
  // Canvas and attachments (images, PDFs, .pen, .base, …) are name-only entries
  // so the sidebar can show them without us reading binary data.
  if (!isMarkdownPath(rel)) {
    return { path: full, rel, name: fallback, mtime, links: [], tags: [], title: fallback };
  }
  const raw = await api.files.read(full);
  const parsed = parseNote(raw, fallback, rel);
  return {
    path: full,
    rel,
    name: fallback,
    mtime,
    links: parsed.links,
    tags: parsed.tags,
    title: parsed.title,
  };
}

export const useVault = create<VaultState>((set, get) => ({
  vaultPath: null,
  recentVaults: [],
  files: new Map(),
  folders: new Set(),
  activeFile: null,
  tabs: [],
  view: 'editor',
  loading: false,
  search: '',
  selectedTag: null,
  pinned: new Set(),
  pinnedOnly: false,

  async init() {
    const [existing, recents] = await Promise.all([api.vault.get(), api.vault.getRecents()]);
    set({ recentVaults: recents });
    if (existing) {
      set({ vaultPath: existing, pinned: loadPinned(existing) });
      await get().reloadIndex();
      await api.watch.start(existing);
    }
    api.watch.onEvent(async (e: { type: string; path: string }) => {
      const vp = get().vaultPath;
      if (!vp) return;
      if (e.type === 'add' || e.type === 'change') {
        const rel = e.path.replace(vp, '').replace(/^[\\/]+/, '');
        try {
          const indexed = await indexFile(vp, rel, Date.now());
          set((s) => {
            const m = new Map(s.files);
            m.set(rel, indexed);
            return { files: m };
          });
        } catch {
          // ignore transient read errors
        }
      } else if (e.type === 'unlink') {
        const rel = e.path.replace(vp, '').replace(/^[\\/]+/, '');
        set((s) => {
          const m = new Map(s.files);
          m.delete(rel);
          const tabs = s.tabs.filter((t) => t !== rel);
          return { files: m, tabs, activeFile: s.activeFile === rel ? (tabs[tabs.length - 1] ?? null) : s.activeFile };
        });
      } else if (e.type === 'addDir') {
        const rel = e.path.replace(vp, '').replace(/^[\\/]+/, '');
        if (rel)
          set((s) => {
            const folders = new Set(s.folders);
            folders.add(rel);
            return { folders };
          });
      } else if (e.type === 'unlinkDir') {
        const rel = e.path.replace(vp, '').replace(/^[\\/]+/, '');
        set((s) => {
          const folders = new Set(s.folders);
          folders.delete(rel);
          return { folders };
        });
      }
    });
  },

  async pickVault() {
    const picked = await api.vault.pick();
    if (!picked) return;
    set({
      vaultPath: picked,
      files: new Map(),
      activeFile: null,
      pinned: loadPinned(picked),
      pinnedOnly: false,
    });
    const recents = await api.vault.getRecents();
    set({ vaultPath: picked, recentVaults: recents, files: new Map(), activeFile: null, tabs: [] });
    await get().reloadIndex();
    await api.watch.start(picked);
  },

  async openVault(vaultPath) {
    const confirmed = await api.vault.openRecent(vaultPath);
    if (!confirmed) return;
    if (get().vaultPath) await api.watch.stop();
    const recents = await api.vault.getRecents();
    set({ vaultPath: confirmed, recentVaults: recents, files: new Map(), activeFile: null, tabs: [] });
    await get().reloadIndex();
    await api.watch.start(confirmed);
  },

  async closeVault() {
    await api.vault.close();
    await api.watch.stop();
    set({
      vaultPath: null,
      files: new Map(),
      activeFile: null,
      pinned: new Set(),
      pinnedOnly: false,
    });
  },

  async reloadIndex() {
    const vp = get().vaultPath;
    if (!vp) return;
    set({ loading: true });
    try {
      const list = await api.files.list(vp);
      const m = new Map<string, VaultFile>();
      await Promise.all(
        list.map(async (entry: { rel: string; mtime: number }) => {
          try {
            const indexed = await indexFile(vp, entry.rel, entry.mtime);
            m.set(entry.rel, indexed);
          } catch {
            /* skip */
          }
        })
      );
      set({ files: m });
    } finally {
      set({ loading: false });
    }
  },

  openFile(rel) {
    // Markdown + canvas go to their editors; images and PDFs open in the AttachmentViewer.
    // Anything else (.pen, .base, …) stays click-no-op until a dedicated viewer exists.
    const lower = rel.toLowerCase();
    if (
      !isMarkdownPath(lower) &&
      !lower.endsWith('.canvas') &&
      !isExcalidrawPath(lower) &&
      !isViewablePath(lower)
    )
      return;
    set((s) => {
      const tabs = s.tabs.includes(rel) ? s.tabs : [...s.tabs, rel];
      return { activeFile: rel, view: 'editor', tabs };
    });
  },

  closeTab(rel) {
    set((s) => {
      const idx = s.tabs.indexOf(rel);
      if (idx === -1) return {};
      const tabs = s.tabs.filter((t) => t !== rel);
      let activeFile = s.activeFile;
      if (s.activeFile === rel) {
        activeFile = tabs[Math.min(idx, tabs.length - 1)] ?? null;
      }
      return { tabs, activeFile };
    });
  },

  reorderTabs(next) {
    set({ tabs: next });
  },

  async saveFile(rel, content) {
    const vp = get().vaultPath;
    if (!vp) return;
    const full = joinPath(vp, rel);
    await api.files.write(full, content);
    const indexed = await indexFile(vp, rel, Date.now());
    set((s) => {
      const m = new Map(s.files);
      m.set(rel, indexed);
      return { files: m };
    });
  },

  async createCanvas(relPath: string) {
    const vp = get().vaultPath;
    if (!vp) throw new Error('No vault');
    let rel = relPath.endsWith('.canvas') ? relPath : `${relPath}.canvas`;
    let i = 1;
    while (get().files.has(rel)) {
      const base = relPath.replace(/\.canvas$/i, '');
      rel = `${base} ${i}.canvas`;
      i++;
    }
    const initial = JSON.stringify({ version: 1, nodes: [], edges: [] }, null, 2);
    await api.files.create(vp, rel, initial);
    const indexed = await indexFile(vp, rel, Date.now());
    set((s) => {
      const m = new Map(s.files);
      m.set(rel, indexed);
      const tabs = s.tabs.includes(rel) ? s.tabs : [...s.tabs, rel];
      return { files: m, activeFile: rel, view: 'editor', tabs };
    });
    return rel;
  },

  async createExcalidraw(relPath: string) {
    const vp = get().vaultPath;
    if (!vp) throw new Error('No vault');
    let rel = relPath.endsWith('.excalidraw') ? relPath : `${relPath}.excalidraw`;
    let i = 1;
    while (get().files.has(rel)) {
      const base = relPath.replace(/\.excalidraw$/i, '');
      rel = `${base} ${i}.excalidraw`;
      i++;
    }
    // The standard .excalidraw scene format — an empty drawing.
    const initial = JSON.stringify(
      { type: 'excalidraw', version: 2, source: 'SideNotes', elements: [], appState: {}, files: {} },
      null,
      2
    );
    await api.files.create(vp, rel, initial);
    const indexed = await indexFile(vp, rel, Date.now());
    set((s) => {
      const m = new Map(s.files);
      m.set(rel, indexed);
      const tabs = s.tabs.includes(rel) ? s.tabs : [...s.tabs, rel];
      return { files: m, activeFile: rel, view: 'editor', tabs };
    });
    return rel;
  },

  async createFile(relPath) {
    const vp = get().vaultPath;
    if (!vp) throw new Error('No vault');
    let rel = relPath.endsWith('.md') ? relPath : `${relPath}.md`;
    let i = 1;
    while (get().files.has(rel)) {
      const base = relPath.replace(/\.md$/i, '');
      rel = `${base} ${i}.md`;
      i++;
    }
    const title = basenameNoExt(rel);
    // Todo files get a starter template so the header chrome has something to render.
    // Dated todos use a "focus + quick wins + rolled over + done" shape that maps to how
    // most people actually plan a day. Project todos use a priority cascade (now/next/later).
    const isTodo = /(^|\/)todos?\//i.test(rel) || /(^|\/)todos?\.md$/i.test(rel);
    const isDatedTodo = isTodo && /^\d{4}-\d{2}-\d{2}$/.test(title);
    let initial: string;
    if (isDatedTodo) {
      // Header chrome already shows the date prominently, so no H1 — would just duplicate.
      initial =
        `> What's on my plate today.\n\n` +
        `## Focus\n_The 1–3 things that matter most._\n\n- [ ] \n\n` +
        `## Quick wins\n- [ ] \n\n` +
        `## Rolled over\n- [ ] \n\n` +
        `## Done\n`;
    } else if (isTodo) {
      initial =
        `# ${title}\n\n` +
        `## Now\n_What I'm actively working on._\n\n- [ ] \n\n` +
        `## Next\n- [ ] \n\n` +
        `## Later\n- [ ] \n\n` +
        `## Done\n`;
    } else {
      initial = `# ${title}\n\n`;
    }
    await api.files.create(vp, rel, initial);
    const indexed = await indexFile(vp, rel, Date.now());
    set((s) => {
      const m = new Map(s.files);
      m.set(rel, indexed);
      const tabs = s.tabs.includes(rel) ? s.tabs : [...s.tabs, rel];
      return { files: m, activeFile: rel, view: 'editor', tabs };
    });
    return rel;
  },

  async renameFile(rel, newRel) {
    const vp = get().vaultPath;
    if (!vp) return;
    // Preserve the file's existing extension (.md, .mdx, .canvas, …) unless the caller
    // supplied one explicitly. Forcing .md here previously broke renaming non-md files.
    const hasExt = /\.[A-Za-z0-9]{1,8}$/.test(newRel);
    const origExtMatch = rel.match(/\.[A-Za-z0-9]+$/);
    const finalRel = hasExt ? newRel : `${newRel}${origExtMatch ? origExtMatch[0] : '.md'}`;
    if (finalRel === rel) return;
    const oldFull = joinPath(vp, rel);
    const newFull = joinPath(vp, finalRel);
    await api.files.rename(oldFull, newFull);
    await get().reloadIndex();
    set((s) => {
      const pinned = new Set(s.pinned);
      if (pinned.delete(rel)) {
        pinned.add(finalRel);
        persistPinned(s.vaultPath, pinned);
      }
      return {
        activeFile: s.activeFile === rel ? finalRel : s.activeFile,
        tabs: s.tabs.map((t) => (t === rel ? finalRel : t)),
        pinned,
      };
    });
  },

  async deleteFile(rel) {
    const vp = get().vaultPath;
    if (!vp) return;
    const full = joinPath(vp, rel);
    await api.files.delete(full);
    set((s) => {
      const m = new Map(s.files);
      m.delete(rel);
      const tabs = s.tabs.filter((t) => t !== rel);
      let activeFile = s.activeFile;
      if (s.activeFile === rel) {
        activeFile = tabs[tabs.length - 1] ?? null;
      }
      const pinned = new Set(s.pinned);
      if (pinned.delete(rel)) persistPinned(s.vaultPath, pinned);
      return { files: m, tabs, activeFile, pinned };
    });
  },

  async createFolder(relPath) {
    const vp = get().vaultPath;
    if (!vp) return;
    const clean = relPath.replace(/^[\\/]+|[\\/]+$/g, '');
    if (!clean) return;
    await api.files.mkdir(joinPath(vp, clean));
    set((s) => {
      const folders = new Set(s.folders);
      folders.add(clean);
      return { folders };
    });
  },

  async deleteFolder(relPath) {
    const vp = get().vaultPath;
    if (!vp) return;
    const clean = relPath.replace(/^[\\/]+|[\\/]+$/g, '');
    await api.files.rmdir(joinPath(vp, clean));
    // remove all files under this folder from state
    set((s) => {
      const m = new Map(s.files);
      const folders = new Set(s.folders);
      const removed: string[] = [];
      for (const rel of m.keys()) {
        if (rel === clean || rel.startsWith(clean + '/')) {
          removed.push(rel);
        }
      }
      for (const r of removed) m.delete(r);
      for (const f of [...folders]) {
        if (f === clean || f.startsWith(clean + '/')) folders.delete(f);
      }
      const tabs = s.tabs.filter((t) => !removed.includes(t));
      const activeFile = removed.includes(s.activeFile ?? '') ? (tabs[tabs.length - 1] ?? null) : s.activeFile;
      return { files: m, folders, tabs, activeFile };
    });
  },

  async moveFile(rel, newFolder) {
    const vp = get().vaultPath;
    if (!vp) return;
    const clean = newFolder.replace(/^[\\/]+|[\\/]+$/g, '');
    const base = rel.split(/[\\/]/).pop()!;
    const newRel = clean ? `${clean}/${base}` : base;
    if (newRel === rel) return;
    if (get().files.has(newRel)) {
      throw new Error(`A note named "${base}" already exists in that folder.`);
    }
    const oldFull = joinPath(vp, rel);
    const newFull = joinPath(vp, newRel);
    await api.files.rename(oldFull, newFull);
    await get().reloadIndex();
    set((s) => {
      const pinned = new Set(s.pinned);
      if (pinned.delete(rel)) {
        pinned.add(newRel);
        persistPinned(s.vaultPath, pinned);
      }
      return {
        activeFile: s.activeFile === rel ? newRel : s.activeFile,
        tabs: s.tabs.map((t) => (t === rel ? newRel : t)),
        pinned,
      };
    });
  },

  async renameFolder(rel, newName) {
    const vp = get().vaultPath;
    if (!vp) return;
    const trimmed = newName.replace(/^[\\/]+|[\\/]+$/g, '').trim();
    if (!trimmed || trimmed.includes('/')) {
      throw new Error('Enter a valid folder name (no slashes).');
    }
    const slash = rel.lastIndexOf('/');
    const parent = slash >= 0 ? rel.slice(0, slash) : '';
    const newRel = parent ? `${parent}/${trimmed}` : trimmed;
    if (newRel === rel) return;
    if (get().folders.has(newRel) || get().files.has(newRel)) {
      throw new Error(`"${trimmed}" already exists here.`);
    }
    await api.files.rename(joinPath(vp, rel), joinPath(vp, newRel));
    // reloadIndex rebuilds files + folders from disk; we only remap the UI-only
    // state (open tabs, active file, pins) that points inside the renamed folder.
    await get().reloadIndex();
    const prefix = rel + '/';
    const remap = (p: string) =>
      p === rel ? newRel : p.startsWith(prefix) ? newRel + '/' + p.slice(prefix.length) : p;
    set((s) => {
      const pinned = new Set<string>();
      for (const p of s.pinned) pinned.add(remap(p));
      persistPinned(s.vaultPath, pinned);
      return {
        activeFile: s.activeFile ? remap(s.activeFile) : s.activeFile,
        tabs: s.tabs.map(remap),
        pinned,
      };
    });
  },

  setView(view) {
    set({ view });
  },

  setSearch(s) {
    set({ search: s });
  },

  setSelectedTag(tag) {
    set({ selectedTag: tag });
  },

  togglePin(rel) {
    set((s) => {
      const next = new Set(s.pinned);
      if (next.has(rel)) next.delete(rel);
      else next.add(rel);
      persistPinned(s.vaultPath, next);
      return { pinned: next };
    });
  },

  isPinned(rel) {
    return get().pinned.has(rel);
  },

  setPinnedOnly(v) {
    set({ pinnedOnly: v });
  },

  getFileTree() {
    const root: FileTreeNode = { type: 'folder', name: '', path: '', rel: '', children: [] };
    const sorted = [...get().files.values()].sort((a, b) => a.rel.localeCompare(b.rel));
    for (const f of sorted) {
      const parts = f.rel.split(/[\\/]/);
      let cur = root;
      for (let i = 0; i < parts.length; i++) {
        const isFile = i === parts.length - 1;
        const name = parts[i];
        if (isFile) {
          cur.children!.push({
            type: 'file',
            name: basenameNoExt(name),
            path: f.path,
            rel: f.rel,
          });
        } else {
          let child = cur.children!.find((c) => c.type === 'folder' && c.name === name);
          if (!child) {
            child = {
              type: 'folder',
              name,
              path: '',
              rel: parts.slice(0, i + 1).join('/'),
              children: [],
            };
            cur.children!.push(child);
          }
          cur = child;
        }
      }
    }
    // sort folders before files at each level
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
  },

  getBacklinks(rel) {
    const targetName = basenameNoExt(rel).toLowerCase();
    return [...get().files.values()].filter((f) => {
      if (f.rel === rel) return false;
      return f.links.some(
        (l) => l.toLowerCase() === targetName || l.toLowerCase() === stripMarkdownExt(rel).toLowerCase()
      );
    });
  },

  getAllTags() {
    const counts = new Map<string, number>();
    for (const f of get().files.values()) {
      for (const t of f.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);
  },

  async openOrCreateDaily() {
    const vp = get().vaultPath;
    if (!vp) return;
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const rel = `Daily Notes/${dateStr}.md`;
    if (get().files.has(rel)) {
      get().openFile(rel);
      return;
    }
    const human = today.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const initial = `# ${dateStr}\n\n*${human}*\n\n`;
    await api.files.create(vp, rel, initial);
    const indexed = await indexFile(vp, rel, Date.now());
    set((s) => {
      const m2 = new Map(s.files);
      m2.set(rel, indexed);
      const tabs = s.tabs.includes(rel) ? s.tabs : [...s.tabs, rel];
      return { files: m2, activeFile: rel, view: 'editor', tabs };
    });
  },

  getTemplates() {
    return [...get().files.values()].filter((f) => f.rel.startsWith('templates/'));
  },

  async createFromTemplate(templateRel, newName) {
    const vp = get().vaultPath;
    if (!vp) throw new Error('No vault');
    const tplFull = joinPath(vp, templateRel);
    const raw = await api.files.read(tplFull);
    const noFm = raw.replace(/^---\n[\s\S]*?\n---\n?/, '');

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const titleVal = newName?.trim() || 'Untitled';
    const filled = noFm
      .replace(/\{\{\s*date\s*\}\}/g, `${y}-${m}-${d}`)
      .replace(/\{\{\s*time\s*\}\}/g, `${hh}:${mm}`)
      .replace(/\{\{\s*datetime\s*\}\}/g, `${y}-${m}-${d} ${hh}:${mm}`)
      .replace(/\{\{\s*title\s*\}\}/g, titleVal)
      .replace(/\{\{\s*weekday\s*\}\}/g, now.toLocaleDateString(undefined, { weekday: 'long' }));

    const baseName = newName?.trim() || `New from ${basenameNoExt(templateRel)}`;
    let rel = `${baseName}.md`;
    let i = 1;
    while (get().files.has(rel)) {
      rel = `${baseName} ${i}.md`;
      i++;
    }
    await api.files.create(vp, rel, filled);
    const indexed = await indexFile(vp, rel, Date.now());
    set((s) => {
      const m2 = new Map(s.files);
      m2.set(rel, indexed);
      const tabs = s.tabs.includes(rel) ? s.tabs : [...s.tabs, rel];
      return { files: m2, activeFile: rel, view: 'editor', tabs };
    });
    return rel;
  },

  async searchContent(query) {
    const vp = get().vaultPath;
    if (!vp || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    const out: { rel: string; title: string; snippet: string; score: number }[] = [];
    for (const f of get().files.values()) {
      const titleHit = (f.title || f.name).toLowerCase().includes(q);
      let snippet = '';
      let bodyHit = false;
      try {
        const raw = await api.files.read(f.path);
        const noFm = raw.replace(/^---\n[\s\S]*?\n---\n?/, '');
        const idx = noFm.toLowerCase().indexOf(q);
        if (idx >= 0) {
          bodyHit = true;
          const start = Math.max(0, idx - 40);
          const end = Math.min(noFm.length, idx + q.length + 60);
          snippet =
            (start > 0 ? '…' : '') +
            noFm.slice(start, end).replace(/\n+/g, ' ').trim() +
            (end < noFm.length ? '…' : '');
        }
      } catch {
        /* skip */
      }
      if (!titleHit && !bodyHit) continue;
      out.push({
        rel: f.rel,
        title: f.title || f.name,
        snippet,
        score: (titleHit ? 100 : 0) + (bodyHit ? 50 : 0),
      });
    }
    return out
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map(({ rel, title, snippet }) => ({ rel, title, snippet }));
  },
}));
