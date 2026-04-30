import { contextBridge, ipcRenderer } from 'electron';

const api = {
  vault: {
    pick: () => ipcRenderer.invoke('vault:pick') as Promise<string | null>,
    get: () => ipcRenderer.invoke('vault:get') as Promise<string | null>,
    close: () => ipcRenderer.invoke('vault:close') as Promise<boolean>,
  },
  files: {
    list: (vaultPath: string) =>
      ipcRenderer.invoke('files:list', vaultPath) as Promise<
        { path: string; rel: string; mtime: number }[]
      >,
    read: (filePath: string) => ipcRenderer.invoke('files:read', filePath) as Promise<string>,
    write: (filePath: string, content: string) =>
      ipcRenderer.invoke('files:write', filePath, content) as Promise<boolean>,
    create: (vaultPath: string, relPath: string, content?: string) =>
      ipcRenderer.invoke('files:create', vaultPath, relPath, content) as Promise<string>,
    rename: (oldPath: string, newPath: string) =>
      ipcRenderer.invoke('files:rename', oldPath, newPath) as Promise<string>,
    delete: (filePath: string) => ipcRenderer.invoke('files:delete', filePath) as Promise<boolean>,
    mkdir: (dirPath: string) => ipcRenderer.invoke('files:mkdir', dirPath) as Promise<boolean>,
    rmdir: (dirPath: string) => ipcRenderer.invoke('files:rmdir', dirPath) as Promise<boolean>,
    reveal: (p: string) => ipcRenderer.invoke('files:reveal', p) as Promise<boolean>,
    duplicate: (vaultPath: string, rel: string) =>
      ipcRenderer.invoke('files:duplicate', vaultPath, rel) as Promise<string>,
    writeAsset: (
      vaultPath: string,
      relPath: string,
      data: { type: 'buffer'; bytes: ArrayBuffer } | { type: 'path'; src: string }
    ) => ipcRenderer.invoke('files:writeAsset', vaultPath, relPath, data) as Promise<string>,
  },
  watch: {
    start: (vaultPath: string) => ipcRenderer.invoke('watch:start', vaultPath) as Promise<boolean>,
    stop: () => ipcRenderer.invoke('watch:stop') as Promise<boolean>,
    onEvent: (handler: (e: { type: string; path: string }) => void) => {
      const listener = (_: unknown, payload: { type: string; path: string }) => handler(payload);
      ipcRenderer.on('watch:event', listener);
      return () => ipcRenderer.removeListener('watch:event', listener);
    },
  },
  exportNote: (kind: 'md' | 'html' | 'pdf', defaultName: string, payload: string) =>
    ipcRenderer.invoke('export:save', kind, defaultName, payload) as Promise<string | null>,
};

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
