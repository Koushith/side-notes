export interface VaultFile {
  path: string;
  rel: string;
  name: string;
  mtime: number;
  links: string[];
  tags: string[];
  title: string;
}

export interface FileTreeNode {
  type: 'file' | 'folder';
  name: string;
  path: string;
  rel: string;
  children?: FileTreeNode[];
  /** Display-only grouping node (e.g. virtual Year/Month buckets inside Daily Notes).
   *  Disk operations like rename/delete/move/create-here are suppressed for these. */
  virtual?: boolean;
  /** Hint to the tree renderer for the initial expanded state. Defaults to true. */
  defaultOpen?: boolean;
}

export type ViewMode = 'editor' | 'graph' | 'all' | 'git';

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

export type GitResult<T> = ({ ok: true } & T) | { ok: false; error: string };
export type GitVoid = { ok: true } | { ok: false; error: string };

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

// Mirror of electron/preload.ts API surface (kept in sync manually).
export interface ApiBridge {
  vault: {
    pick: () => Promise<string | null>;
    get: () => Promise<string | null>;
    close: () => Promise<boolean>;
    getRecents: () => Promise<string[]>;
    openRecent: (path: string) => Promise<string | null>;
  };
  files: {
    list: (vaultPath: string) => Promise<{ path: string; rel: string; mtime: number }[]>;
    read: (filePath: string) => Promise<string>;
    write: (filePath: string, content: string) => Promise<boolean>;
    create: (vaultPath: string, relPath: string, content?: string) => Promise<string>;
    rename: (oldPath: string, newPath: string) => Promise<string>;
    delete: (filePath: string) => Promise<boolean>;
    mkdir: (dirPath: string) => Promise<boolean>;
    rmdir: (dirPath: string) => Promise<boolean>;
    reveal: (p: string) => Promise<boolean>;
    duplicate: (vaultPath: string, rel: string) => Promise<string>;
    writeAsset: (
      vaultPath: string,
      relPath: string,
      data: { type: 'buffer'; bytes: ArrayBuffer } | { type: 'path'; src: string }
    ) => Promise<string>;
  };
  watch: {
    start: (vaultPath: string) => Promise<boolean>;
    stop: () => Promise<boolean>;
    onEvent: (handler: (e: { type: string; path: string }) => void) => () => void;
  };
  exportNote: (
    kind: 'md' | 'html' | 'pdf',
    defaultName: string,
    payload: string
  ) => Promise<string | null>;
  git: {
    hasRepo: (vaultPath: string) => Promise<GitResult<{ has: boolean }>>;
    init: (vaultPath: string) => Promise<GitVoid>;
    status: (vaultPath: string) => Promise<GitResult<{ status: GitStatus }>>;
    stage: (vaultPath: string, paths: string[]) => Promise<GitVoid>;
    unstage: (vaultPath: string, paths: string[]) => Promise<GitVoid>;
    discard: (vaultPath: string, paths: string[]) => Promise<GitVoid>;
    commit: (vaultPath: string, message: string) => Promise<GitResult<{ commit: string }>>;
    push: (vaultPath: string) => Promise<GitVoid>;
    pull: (vaultPath: string) => Promise<GitVoid>;
    fetch: (vaultPath: string) => Promise<GitVoid>;
    diff: (vaultPath: string, filePath: string, staged: boolean) => Promise<GitResult<{ diff: string }>>;
    log: (vaultPath: string, count: number) => Promise<GitResult<{ log: { hash: string; message: string; date: string; author: string }[] }>>;
  };
  ai: {
    getSettings: () => Promise<AISettingsView>;
    setSettings: (update: AISettingsUpdate) => Promise<AISettingsView>;
    listOllamaModels: (baseUrl: string) => Promise<string[]>;
    generate: (
      id: string,
      payload: { system: string; user: string }
    ) => Promise<{ ok: true } | { ok: false; error: string }>;
    cancel: (id: string) => Promise<boolean>;
    onChunk: (id: string, handler: (delta: string) => void) => () => void;
    onDone: (id: string, handler: () => void) => () => void;
    onError: (id: string, handler: (msg: string) => void) => () => void;
  };
  voice: {
    getSettings: () => Promise<VoiceSettingsView>;
    setSettings: (update: VoiceSettingsUpdate) => Promise<VoiceSettingsView>;
    requestMic: () => Promise<boolean>;
    transcribe: (
      id: string,
      payload:
        | { kind: 'cloud'; audio: ArrayBuffer; mimeType: string }
        | { kind: 'local'; pcm: Float32Array }
    ) => Promise<{ ok: true; text: string } | { ok: false; error: string }>;
    cancel: (id: string) => Promise<boolean>;
    onProgress: (id: string, handler: (msg: string) => void) => () => void;
  };
  whisper: {
    getModels: () => Promise<WhisperModelView[]>;
    download: (modelId: string) => Promise<{ ok: boolean; error?: string }>;
    cancelDownload: (modelId: string) => Promise<boolean>;
    deleteModel: (modelId: string) => Promise<boolean>;
    getModelsDir: () => Promise<string>;
    onDownloadProgress: (handler: (p: WhisperDownloadProgress) => void) => () => void;
  };
}

export interface WhisperModelView {
  id: string;
  name: string;
  size: string;
  sizeBytes: number;
  languages: string;
  speed: string;
  recommended?: boolean;
  downloaded: boolean;
}

export interface WhisperDownloadProgress {
  modelId: string;
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
  status: 'downloading' | 'done' | 'error';
  error?: string;
}

declare global {
  interface Window {
    api: ApiBridge;
  }
}
