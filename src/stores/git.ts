import { api } from '@/lib/api';
import type { GitFileEntry, GitStatus } from '@/types';
import { create } from 'zustand';
import { useVault } from './vault';

interface GitState {
  hasRepo: boolean;
  hasRemote: boolean;
  branch: string | null;
  tracking: string | null;
  ahead: number;
  behind: number;
  files: GitFileEntry[];
  busy: boolean;
  checking: boolean;
  lastError: string | null;
  loaded: boolean;

  refresh: () => Promise<void>;
  fetchRemote: () => Promise<void>;
  initRepo: () => Promise<void>;
  stage: (paths: string[]) => Promise<void>;
  unstage: (paths: string[]) => Promise<void>;
  discard: (paths: string[]) => Promise<void>;
  commit: (message: string) => Promise<boolean>;
  push: () => Promise<boolean>;
  pull: () => Promise<boolean>;
}

function vaultPath(): string | null {
  return useVault.getState().vaultPath;
}

function applyStatus(set: (p: Partial<GitState>) => void, status: GitStatus) {
  set({
    hasRepo: true,
    hasRemote: status.hasRemote,
    branch: status.branch,
    tracking: status.tracking,
    ahead: status.ahead,
    behind: status.behind,
    files: status.files,
    loaded: true,
  });
}

export const useGit = create<GitState>((set, get) => ({
  hasRepo: false,
  hasRemote: false,
  branch: null,
  tracking: null,
  ahead: 0,
  behind: 0,
  files: [],
  busy: false,
  checking: false,
  lastError: null,
  loaded: false,

  async refresh() {
    const vp = vaultPath();
    if (!vp) return;
    const repoCheck = await api.git.hasRepo(vp);
    if (!repoCheck.ok || !repoCheck.has) {
      set({
        hasRepo: false,
        hasRemote: false,
        branch: null,
        tracking: null,
        ahead: 0,
        behind: 0,
        files: [],
        loaded: true,
        lastError: repoCheck.ok ? null : repoCheck.error,
      });
      return;
    }
    const res = await api.git.status(vp);
    if (!res.ok) {
      set({ lastError: res.error, loaded: true });
      return;
    }
    applyStatus(set, res.status);
    set({ lastError: null });
  },

  // Hit the network to update remote-tracking refs, then refresh status so the
  // ahead/behind counts are accurate. Used by the manual "Check for updates" action.
  async fetchRemote() {
    const vp = vaultPath();
    if (!vp || get().checking || get().busy) return;
    set({ checking: true, lastError: null });
    const res = await api.git.fetch(vp);
    set({ checking: false });
    if (!res.ok) {
      set({ lastError: res.error });
      return;
    }
    await get().refresh();
  },

  async initRepo() {
    const vp = vaultPath();
    if (!vp || get().busy) return;
    set({ busy: true, lastError: null });
    const res = await api.git.init(vp);
    set({ busy: false });
    if (!res.ok) {
      set({ lastError: res.error });
      return;
    }
    await get().refresh();
  },

  async stage(paths) {
    const vp = vaultPath();
    if (!vp || !paths.length) return;
    const res = await api.git.stage(vp, paths);
    if (!res.ok) set({ lastError: res.error });
    await get().refresh();
  },

  async unstage(paths) {
    const vp = vaultPath();
    if (!vp || !paths.length) return;
    const res = await api.git.unstage(vp, paths);
    if (!res.ok) set({ lastError: res.error });
    await get().refresh();
  },

  async discard(paths) {
    const vp = vaultPath();
    if (!vp || !paths.length) return;
    const res = await api.git.discard(vp, paths);
    if (!res.ok) set({ lastError: res.error });
    await get().refresh();
  },

  async commit(message) {
    const vp = vaultPath();
    if (!vp || !message.trim() || get().busy) return false;
    set({ busy: true, lastError: null });
    const res = await api.git.commit(vp, message.trim());
    set({ busy: false });
    if (!res.ok) {
      set({ lastError: res.error });
      return false;
    }
    await get().refresh();
    return true;
  },

  async push() {
    const vp = vaultPath();
    if (!vp || get().busy) return false;
    set({ busy: true, lastError: null });
    const res = await api.git.push(vp);
    set({ busy: false });
    if (!res.ok) {
      set({ lastError: res.error });
      return false;
    }
    await get().refresh();
    return true;
  },

  async pull() {
    const vp = vaultPath();
    if (!vp || get().busy) return false;
    set({ busy: true, lastError: null });
    const res = await api.git.pull(vp);
    set({ busy: false });
    if (!res.ok) {
      set({ lastError: res.error });
      return false;
    }
    // The pull just wrote files into the vault; the existing chokidar watcher will
    // pick those up and reindex via the vault store. We just refresh git status.
    await get().refresh();
    return true;
  },
}));
