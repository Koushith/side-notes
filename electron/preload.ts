import { contextBridge, ipcRenderer } from 'electron';

export interface GitFileEntry {
  path: string;
  index: string;
  working: string;
}

export interface GitStatus {
  branch: string | null;
  ahead: number;
  behind: number;
  tracking: string | null;
  files: GitFileEntry[];
  hasRemote: boolean;
}

type GitResult<T> = ({ ok: true } & T) | { ok: false; error: string };
type GitVoid = { ok: true } | { ok: false; error: string };

export type AIProvider = 'ollama' | 'openai' | 'anthropic' | 'bedrock';

export interface AISettingsView {
  provider: AIProvider;
  ollama: { baseUrl: string; model: string };
  openai: { baseUrl: string; model: string; hasKey: boolean };
  anthropic: { baseUrl: string; model: string; hasKey: boolean };
  bedrock: { region: string; model: string; hasCreds: boolean };
}

export interface AISettingsUpdate {
  provider?: AIProvider;
  ollama?: { baseUrl?: string; model?: string };
  openai?: { baseUrl?: string; model?: string; apiKey?: string | null };
  anthropic?: { baseUrl?: string; model?: string; apiKey?: string | null };
  bedrock?: {
    region?: string;
    model?: string;
    accessKeyId?: string | null;
    secretAccessKey?: string | null;
  };
}

export type VoiceEngine = 'cloud' | 'local';

export interface VoiceSettingsView {
  engine: VoiceEngine;
  cloud: { baseUrl: string; model: string; hasKey: boolean };
  local: { model: string };
  language: string;
  vocab: string;
  cleanup: boolean;
}

export interface VoiceSettingsUpdate {
  engine?: VoiceEngine;
  cloud?: { baseUrl?: string; model?: string; apiKey?: string | null };
  local?: { model?: string };
  language?: string;
  vocab?: string;
  cleanup?: boolean;
}

const api = {
  vault: {
    pick: () => ipcRenderer.invoke('vault:pick') as Promise<string | null>,
    get: () => ipcRenderer.invoke('vault:get') as Promise<string | null>,
    close: () => ipcRenderer.invoke('vault:close') as Promise<boolean>,
    getRecents: () => ipcRenderer.invoke('vault:getRecents') as Promise<string[]>,
    openRecent: (p: string) => ipcRenderer.invoke('vault:openRecent', p) as Promise<string | null>,
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
  git: {
    hasRepo: (vaultPath: string) =>
      ipcRenderer.invoke('git:hasRepo', vaultPath) as Promise<GitResult<{ has: boolean }>>,
    init: (vaultPath: string) =>
      ipcRenderer.invoke('git:init', vaultPath) as Promise<GitVoid>,
    status: (vaultPath: string) =>
      ipcRenderer.invoke('git:status', vaultPath) as Promise<GitResult<{ status: GitStatus }>>,
    stage: (vaultPath: string, paths: string[]) =>
      ipcRenderer.invoke('git:stage', vaultPath, paths) as Promise<GitVoid>,
    unstage: (vaultPath: string, paths: string[]) =>
      ipcRenderer.invoke('git:unstage', vaultPath, paths) as Promise<GitVoid>,
    discard: (vaultPath: string, paths: string[]) =>
      ipcRenderer.invoke('git:discard', vaultPath, paths) as Promise<GitVoid>,
    commit: (vaultPath: string, message: string) =>
      ipcRenderer.invoke('git:commit', vaultPath, message) as Promise<GitResult<{ commit: string }>>,
    push: (vaultPath: string) =>
      ipcRenderer.invoke('git:push', vaultPath) as Promise<GitVoid>,
    pull: (vaultPath: string) =>
      ipcRenderer.invoke('git:pull', vaultPath) as Promise<GitVoid>,
  },
  ai: {
    getSettings: () => ipcRenderer.invoke('ai:settings:get') as Promise<AISettingsView>,
    setSettings: (update: AISettingsUpdate) =>
      ipcRenderer.invoke('ai:settings:set', update) as Promise<AISettingsView>,
    listOllamaModels: (baseUrl: string) =>
      ipcRenderer.invoke('ai:ollama:models', baseUrl) as Promise<string[]>,
    generate: (id: string, payload: { system: string; user: string }) =>
      ipcRenderer.invoke('ai:generate', id, payload) as Promise<
        { ok: true } | { ok: false; error: string }
      >,
    cancel: (id: string) => ipcRenderer.invoke('ai:cancel', id) as Promise<boolean>,
    onChunk: (id: string, handler: (delta: string) => void) => {
      const channel = `ai:chunk:${id}`;
      const listener = (_: unknown, delta: string) => handler(delta);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    },
    onDone: (id: string, handler: () => void) => {
      const channel = `ai:done:${id}`;
      const listener = () => handler();
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    },
    onError: (id: string, handler: (msg: string) => void) => {
      const channel = `ai:error:${id}`;
      const listener = (_: unknown, msg: string) => handler(msg);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    },
  },
  voice: {
    getSettings: () => ipcRenderer.invoke('voice:settings:get') as Promise<VoiceSettingsView>,
    setSettings: (update: VoiceSettingsUpdate) =>
      ipcRenderer.invoke('voice:settings:set', update) as Promise<VoiceSettingsView>,
    requestMic: () => ipcRenderer.invoke('voice:requestMic') as Promise<boolean>,
    transcribe: (
      id: string,
      payload:
        | { kind: 'cloud'; audio: ArrayBuffer; mimeType: string }
        | { kind: 'local'; pcm: Float32Array }
    ) =>
      ipcRenderer.invoke('voice:transcribe', id, payload) as Promise<
        { ok: true; text: string } | { ok: false; error: string }
      >,
    cancel: (id: string) => ipcRenderer.invoke('voice:cancel', id) as Promise<boolean>,
    onProgress: (id: string, handler: (msg: string) => void) => {
      const channel = `voice:progress:${id}`;
      const listener = (_: unknown, msg: string) => handler(msg);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    },
  },
};

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
