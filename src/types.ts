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

export type ViewMode = 'editor' | 'graph' | 'all';

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
}

declare global {
  interface Window {
    api: ApiBridge;
  }
}
