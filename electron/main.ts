import { app, BrowserWindow, ipcMain, dialog, shell, session, protocol, net, safeStorage, systemPreferences, Menu, MenuItem } from 'electron';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import chokidar, { FSWatcher } from 'chokidar';
import pkg from 'electron-updater';
import { simpleGit, type SimpleGit } from 'simple-git';
import { generate as aiGenerate, listOllamaModels, type AIProvider } from './ai';
import { transcribeCloud, transcribeLocal } from './voice';
import { WHISPER_MODELS, isModelDownloaded, downloadModel, deleteModel, cancelDownload, listDownloadedModels, getModelsDir, isWhisperBinaryInstalled } from './whisperModels';
const { autoUpdater } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, '..');

// Brand the dev process. electron-builder handles this for packaged builds
// (productName = "SideNotes") but during `npm run dev` Electron defaults to its
// generic name + atom icon. Set both before anything reads `getPath('userData')`.
app.setName('SideNotes');

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

// Vite dev needs eval for HMR; production CSP below is strict. Silence the
// dev-only "Insecure Content-Security-Policy" console warning.
if (VITE_DEV_SERVER_URL) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
}
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');
const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
const ICON_PATH = path.join(process.env.APP_ROOT, 'build', 'icon.png');

const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json');

let win: BrowserWindow | null = null;
let watcher: FSWatcher | null = null;
let currentVault: string | null = null;

interface AISettingsStored {
  provider: AIProvider;
  ollama: { baseUrl: string; model: string };
  openai: { baseUrl: string; model: string; encKey?: string };
  anthropic: { baseUrl: string; model: string; encKey?: string };
  bedrock: {
    region: string;
    model: string;
    encAccessKeyId?: string;
    encSecretAccessKey?: string;
  };
}

type VoiceEngine = 'cloud' | 'local';

interface VoiceSettingsStored {
  engine: VoiceEngine;
  /** OpenAI-compatible STT endpoint (OpenAI, Groq, …). */
  cloud: { baseUrl: string; model: string; encKey?: string };
  local: { model: string };
  /** ISO-639-1 hint, '' = auto-detect. */
  language: string;
  /** Proper-noun / jargon bias passed to the model. */
  vocab: string;
  /** Run the transcript through the AI provider for filler-removal + punctuation. */
  cleanup: boolean;
}

interface Settings {
  vaultPath?: string;
  recentVaults?: string[];
  ai?: AISettingsStored;
  voice?: VoiceSettingsStored;
}

async function readSettings(): Promise<Settings> {
  try {
    const raw = await fs.readFile(SETTINGS_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeSettings(data: Settings) {
  await fs.mkdir(path.dirname(SETTINGS_PATH), { recursive: true });
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(data, null, 2));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'SideNotes',
    backgroundColor: '#0f1115',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 14 },
    icon: existsSync(ICON_PATH) ? ICON_PATH : undefined,
    webPreferences: {
      preload: path.join(MAIN_DIST, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // Enable Chromium's built-in PDF viewer for in-tab PDF rendering. No extra deps.
      plugins: true,
      // Allow <webview> tags in the renderer for the spatial browser canvas.
      webviewTag: true,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Native spell-check + standard editing context menu. Electron flags misspellings
  // automatically (you see the red squiggle); we surface the OS dictionary suggestions
  // via `replaceMisspelling`, plus cut/copy/paste/select-all so right-click is useful
  // everywhere in the editor.
  win.webContents.on('context-menu', (_event, params) => {
    const menu = new Menu();
    const hasMisspelling = !!params.misspelledWord && params.dictionarySuggestions.length > 0;

    if (hasMisspelling) {
      for (const suggestion of params.dictionarySuggestions) {
        menu.append(
          new MenuItem({
            label: suggestion,
            click: () => win?.webContents.replaceMisspelling(suggestion),
          })
        );
      }
      menu.append(
        new MenuItem({
          label: `Add "${params.misspelledWord}" to dictionary`,
          click: () =>
            win?.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord),
        })
      );
      menu.append(new MenuItem({ type: 'separator' }));
    }

    if (params.isEditable || params.selectionText) {
      if (params.editFlags.canCut) menu.append(new MenuItem({ role: 'cut' }));
      if (params.editFlags.canCopy) menu.append(new MenuItem({ role: 'copy' }));
      if (params.editFlags.canPaste) menu.append(new MenuItem({ role: 'paste' }));
      if (params.editFlags.canSelectAll) menu.append(new MenuItem({ role: 'selectAll' }));
    }

    if (menu.items.length > 0) menu.popup({ window: win ?? undefined });
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

/** Resolve a vault-relative asset path to a concrete disk path, with fallbacks for
 *  common publish-site conventions. Returns null when nothing matches. */
async function resolveAssetPath(vaultRoot: string, rel: string): Promise<string | null> {
  const root = path.normalize(vaultRoot);
  const tryPath = (candidate: string): string | null => {
    const full = path.normalize(path.join(root, candidate));
    if (!full.startsWith(root)) return null; // sandbox guard
    return existsSync(full) ? full : null;
  };

  // 1. Literal path.
  const direct = tryPath(rel);
  if (direct) return direct;

  // 2. Strip a leading publish-site URL prefix like `blog/` or `blogs/`. Authors often
  //    keep markdown references in their site's URL shape (`blog/<slug>/foo.png`) while
  //    the on-disk layout doesn't actually nest under `blog/`.
  const stripped = rel.replace(/^(blogs?|posts?|articles?|public)\//i, '');
  if (stripped !== rel) {
    const alt = tryPath(stripped);
    if (alt) return alt;
  }

  // 3. Try the conventional Obsidian-style attachments folders.
  const basename = rel.split('/').pop() ?? rel;
  const slug = rel.split('/').slice(-2, -1)[0]; // parent folder of the file
  const candidates: string[] = [];
  if (slug) {
    candidates.push(
      `blogs/images/${slug}/${basename}`,
      `blog/images/${slug}/${basename}`,
      `images/${slug}/${basename}`,
      `assets/${slug}/${basename}`
    );
  }
  candidates.push(`assets/${basename}`, `images/${basename}`);
  for (const c of candidates) {
    const hit = tryPath(c);
    if (hit) return hit;
  }
  return null;
}

// Register the vault:// scheme as privileged so it can be fetched, streamed, and bypass CSP for media.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'vault',
    privileges: { secure: true, supportFetchAPI: true, stream: true, standard: true },
  },
]);

app.whenReady().then(() => {
  // Replace the default Electron atom icon in the macOS dock with our brand mark.
  if (process.platform === 'darwin' && app.dock && existsSync(ICON_PATH)) {
    try {
      app.dock.setIcon(ICON_PATH);
    } catch (err) {
      console.warn('Failed to set dock icon:', err);
    }
  }

  // Map vault://<rel-path> → <vaultPath>/<rel-path> on disk.
  // Falls back to a few common conventions (publish-site URL prefixes, sibling
  // image folders) when the literal path doesn't exist, so authors don't have to
  // rewrite published references like `blog/<slug>/foo.png` for local editing.
  protocol.handle('vault', async (req) => {
    try {
      if (!currentVault) return new Response('No vault open', { status: 404 });
      const u = new URL(req.url);
      const rel = decodeURIComponent(u.hostname + u.pathname).replace(/^\/+/, '');
      const resolved = await resolveAssetPath(currentVault, rel);
      if (!resolved) return new Response('Not found', { status: 404 });
      return net.fetch(pathToFileURL(resolved).toString());
    } catch (err) {
      return new Response(String(err), { status: 500 });
    }
  });

  // Auto-update for direct-distribution builds (DMG / NSIS). The Mac App Store
  // and Microsoft Store update their bundles themselves, so we skip the
  // electron-updater path when running under either — its sandbox blocks
  // self-modification anyway. Also skip in dev / when unpackaged.
  // (Apple sets `process.mas`, Microsoft Store sets `process.windowsStore`.)
  const isStoreBuild =
    (process as NodeJS.Process & { mas?: boolean; windowsStore?: boolean }).mas ||
    (process as NodeJS.Process & { mas?: boolean; windowsStore?: boolean }).windowsStore;
  if (app.isPackaged && !isStoreBuild) {
    autoUpdater.logger = console;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.warn('auto-update check failed:', err);
    });
  }

  if (!VITE_DEV_SERVER_URL) {
    session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
      cb({
        responseHeaders: {
          ...details.responseHeaders,
          // Fonts are bundled into the renderer, so the production CSP has no
          // remote allow-list — the app makes zero outbound network requests.
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: vault:; connect-src 'self' blob:; worker-src 'self' blob:; frame-src *;",
          ],
        },
      });
    });
  }

  // Microphone access for voice dictation. The renderer's getUserMedia triggers a
  // 'media' permission request; grant it (the OS still shows its own prompt on
  // macOS, gated by NSMicrophoneUsageDescription in the Info.plist).
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => {
    cb(permission === 'media' || permission === 'mediaKeySystem');
  });
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => {
    return permission === 'media';
  });

  // Allow webview tags to attach (spatial browser on canvas).
  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-attach-webview', (_e, webPreferences, _params) => {
      // Strip away dangerous preferences but allow the webview to load
      delete (webPreferences as Record<string, unknown>).preload;
      webPreferences.nodeIntegration = false;
      webPreferences.contextIsolation = true;
    });
  });

  createWindow();
});

// Ask macOS for microphone access up front when the renderer requests it, so the
// system prompt appears the first time the user tries to dictate.
ipcMain.handle('voice:requestMic', async (): Promise<boolean> => {
  if (process.platform !== 'darwin') return true;
  try {
    const status = systemPreferences.getMediaAccessStatus('microphone');
    if (status === 'granted') return true;
    return await systemPreferences.askForMediaAccess('microphone');
  } catch {
    return false;
  }
});

app.on('window-all-closed', () => {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ---- IPC: Vault ----
function addToRecents(settings: Settings, vaultPath: string): string[] {
  const existing = settings.recentVaults ?? [];
  return [vaultPath, ...existing.filter((p) => p !== vaultPath)].slice(0, 8);
}

ipcMain.handle('vault:pick', async () => {
  const result = await dialog.showOpenDialog(win!, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Pick your vault folder',
    defaultPath: path.join(os.homedir(), 'Documents'),
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const vaultPath = result.filePaths[0];
  const settings = await readSettings();
  await writeSettings({ ...settings, vaultPath, recentVaults: addToRecents(settings, vaultPath) });
  return vaultPath;
});

ipcMain.handle('vault:get', async () => {
  const settings = await readSettings();
  if (settings.vaultPath && existsSync(settings.vaultPath as string)) return settings.vaultPath;
  return null;
});

ipcMain.handle('vault:getRecents', async () => {
  const settings = await readSettings();
  const recents = Array.isArray(settings.recentVaults) ? (settings.recentVaults as string[]) : [];
  return recents.filter((p) => existsSync(p));
});

ipcMain.handle('vault:openRecent', async (_e, vaultPath: string) => {
  if (!existsSync(vaultPath)) return null;
  const settings = await readSettings();
  await writeSettings({ ...settings, vaultPath, recentVaults: addToRecents(settings, vaultPath) });
  return vaultPath;
});

ipcMain.handle('vault:close', async () => {
  if (watcher) {
    await watcher.close();
    watcher = null;
  }
  currentVault = null;
  const settings = await readSettings();
  delete settings.vaultPath;
  await writeSettings(settings);
  return true;
});

// ---- IPC: Files ----
// Extensions surfaced in the file tree — matches the set Obsidian shows by default.
// Markdown + canvas are editable; the rest are visible as attachments (image previews,
// design files, PDFs, etc.) so folders aren't mysteriously empty.
const INDEXED_EXTS = new Set([
  // Markdown variants — all editable in the markdown editor.
  '.md', '.markdown', '.mdx', '.mdown', '.mkd', '.mkdn', '.mdwn',
  '.canvas', '.base', '.excalidraw',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.avif',
  '.pdf', '.pen',
  '.mp3', '.mp4', '.webm', '.ogg', '.wav', '.m4a', '.mov',
  '.csv', '.json', '.html', '.txt',
  // Code / config files
  '.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.rb', '.java',
  '.css', '.scss', '.yaml', '.yml', '.toml', '.xml', '.sh', '.zsh',
  '.sql', '.graphql', '.env', '.gitignore', '.dockerfile',
]);

async function walkVault(root: string): Promise<{ path: string; rel: string; mtime: number }[]> {
  const out: { path: string; rel: string; mtime: number }[] = [];
  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!INDEXED_EXTS.has(ext)) continue;
        const stat = await fs.stat(full);
        out.push({
          path: full,
          rel: path.relative(root, full),
          mtime: stat.mtimeMs,
        });
      }
    }
  }
  await walk(root);
  return out;
}

ipcMain.handle('files:list', async (_e, vaultPath: string) => {
  return walkVault(vaultPath);
});

ipcMain.handle('files:read', async (_e, filePath: string) => {
  return fs.readFile(filePath, 'utf-8');
});

ipcMain.handle('files:write', async (_e, filePath: string, content: string) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
  return true;
});

ipcMain.handle('files:create', async (_e, vaultPath: string, relPath: string, content = '') => {
  const full = path.join(vaultPath, relPath);
  if (existsSync(full)) throw new Error('File already exists');
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, 'utf-8');
  return full;
});

ipcMain.handle('files:rename', async (_e, oldPath: string, newPath: string) => {
  await fs.mkdir(path.dirname(newPath), { recursive: true });
  await fs.rename(oldPath, newPath);
  return newPath;
});

ipcMain.handle('files:delete', async (_e, filePath: string) => {
  await shell.trashItem(filePath);
  return true;
});

ipcMain.handle('files:mkdir', async (_e, dirPath: string) => {
  await fs.mkdir(dirPath, { recursive: true });
  return true;
});

ipcMain.handle('files:rmdir', async (_e, dirPath: string) => {
  await shell.trashItem(dirPath);
  return true;
});

ipcMain.handle('files:reveal', async (_e, p: string) => {
  shell.showItemInFolder(p);
  return true;
});

ipcMain.handle('files:duplicate', async (_e, vaultPath: string, rel: string) => {
  const src = path.join(vaultPath, rel);
  const dir = path.dirname(src);
  const ext = path.extname(src);
  const base = path.basename(src, ext);
  let n = 1;
  let dest = path.join(dir, `${base} copy${ext}`);
  while (existsSync(dest)) {
    n++;
    dest = path.join(dir, `${base} copy ${n}${ext}`);
  }
  await fs.copyFile(src, dest);
  return path.relative(vaultPath, dest);
});

ipcMain.handle(
  'files:writeAsset',
  async (
    _e,
    vaultPath: string,
    relPath: string,
    data: { type: 'buffer'; bytes: ArrayBuffer } | { type: 'path'; src: string }
  ) => {
    const full = path.join(vaultPath, relPath);
    await fs.mkdir(path.dirname(full), { recursive: true });
    if (data.type === 'buffer') {
      await fs.writeFile(full, Buffer.from(data.bytes));
    } else {
      await fs.copyFile(data.src, full);
    }
    return full;
  }
);

// ---- IPC: Watcher ----
ipcMain.handle('watch:start', async (_e, vaultPath: string) => {
  if (watcher) await watcher.close();
  currentVault = vaultPath;
  watcher = chokidar.watch(vaultPath, {
    ignored: (p: string) => /(^|[\\/])\../.test(path.basename(p)),
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
  });
  const matchExt = (p: string) => INDEXED_EXTS.has(path.extname(p).toLowerCase());
  watcher
    .on('add', (p) => matchExt(p) && win?.webContents.send('watch:event', { type: 'add', path: p }))
    .on('change', (p) => matchExt(p) && win?.webContents.send('watch:event', { type: 'change', path: p }))
    .on('unlink', (p) => matchExt(p) && win?.webContents.send('watch:event', { type: 'unlink', path: p }))
    .on('addDir', (p) => win?.webContents.send('watch:event', { type: 'addDir', path: p }))
    .on('unlinkDir', (p) => win?.webContents.send('watch:event', { type: 'unlinkDir', path: p }));
  return true;
});

ipcMain.handle('watch:stop', async () => {
  if (watcher) {
    await watcher.close();
    watcher = null;
  }
  return true;
});

// ---- IPC: Git ----
// Shell out to the user's installed `git` binary via simple-git. Auth (SSH keys,
// OS credential helpers) is whatever the user already has configured — we don't
// reinvent any of it. All handlers return { ok, ... } / { ok: false, error } so
// IPC never throws across the boundary.

type GitErr = { ok: false; error: string };
type GitResult<T> = ({ ok: true } & T) | GitErr;
type GitVoid = { ok: true } | GitErr;

function gitFor(vaultPath: string): SimpleGit {
  return simpleGit(vaultPath);
}

function gitErr(e: unknown): GitErr {
  const raw = e instanceof Error ? e.message : String(e);
  // Surface to the dev terminal so the underlying git stderr is visible while iterating.
  console.warn('[git] error:', raw);
  return { ok: false, error: friendlyGitError(raw) };
}

// Map noisy git stderr into a short, actionable message. Falls back to the raw
// text (trimmed) when nothing matches.
function friendlyGitError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('could not resolve host') || m.includes('failed to connect') || m.includes('network is unreachable')) {
    return 'Network error — can’t reach the remote. Check your internet connection.';
  }
  if (
    m.includes('authentication failed') ||
    m.includes('could not read username') ||
    m.includes('terminal prompts disabled') ||
    m.includes('permission denied (publickey)') ||
    m.includes('invalid credentials')
  ) {
    return 'Authentication failed. For HTTPS remotes, set up a git credential helper (e.g. `git config --global credential.helper osxkeychain` and authenticate once in Terminal); for SSH, make sure your key is loaded.';
  }
  if (m.includes('no upstream') || m.includes('no configured push destination') || m.includes('set-upstream')) {
    return 'This branch has no upstream yet. Push once to set it up.';
  }
  if (m.includes('rejected') && (m.includes('non-fast-forward') || m.includes('fetch first'))) {
    return 'Remote has changes you don’t have yet. Pull first, then push.';
  }
  if (m.includes('merge conflict') || m.includes('conflict')) {
    return 'Merge conflict — resolve it in your editor or Terminal, then commit.';
  }
  if (m.includes('not found') && m.includes('git')) {
    return 'Git isn’t available to the app. Install the Xcode Command Line Tools (`xcode-select --install`) or ensure git is on your PATH.';
  }
  if (m.includes('please tell me who you are') || m.includes('empty ident') || m.includes('user.email')) {
    return 'Git identity not set. Run `git config --global user.name "…"` and `git config --global user.email "…"` once.';
  }
  // Trim simple-git's wrapper prefix for a cleaner message.
  return raw.replace(/^Error:\s*/i, '').split('\n')[0].slice(0, 300);
}

export interface GitFileEntry {
  path: string;          // repo-relative
  index: string;         // staged status: 'M' | 'A' | 'D' | 'R' | '?' | ' '
  working: string;       // unstaged status
}

export interface GitStatus {
  branch: string | null;
  ahead: number;
  behind: number;
  tracking: string | null;
  files: GitFileEntry[];
  hasRemote: boolean;
}

ipcMain.handle('git:hasRepo', async (_e, vaultPath: string): Promise<GitResult<{ has: boolean }>> => {
  try {
    const has = existsSync(path.join(vaultPath, '.git'));
    return { ok: true, has };
  } catch (e) {
    return gitErr(e);
  }
});

ipcMain.handle('git:init', async (_e, vaultPath: string): Promise<GitVoid> => {
  try {
    await gitFor(vaultPath).init();
    return { ok: true };
  } catch (e) {
    return gitErr(e);
  }
});

ipcMain.handle('git:status', async (_e, vaultPath: string): Promise<GitResult<{ status: GitStatus }>> => {
  try {
    const git = gitFor(vaultPath);
    const s = await git.status();
    const remotes = await git.getRemotes(false);
    return {
      ok: true,
      status: {
        branch: s.current,
        ahead: s.ahead,
        behind: s.behind,
        tracking: s.tracking,
        hasRemote: remotes.length > 0,
        files: s.files.map((f) => ({ path: f.path, index: f.index, working: f.working_dir })),
      },
    };
  } catch (e) {
    return gitErr(e);
  }
});

ipcMain.handle('git:stage', async (_e, vaultPath: string, paths: string[]): Promise<GitVoid> => {
  try {
    await gitFor(vaultPath).add(paths);
    return { ok: true };
  } catch (e) {
    return gitErr(e);
  }
});

ipcMain.handle('git:unstage', async (_e, vaultPath: string, paths: string[]): Promise<GitVoid> => {
  try {
    await gitFor(vaultPath).reset(['--', ...paths]);
    return { ok: true };
  } catch (e) {
    return gitErr(e);
  }
});

ipcMain.handle('git:discard', async (_e, vaultPath: string, paths: string[]): Promise<GitVoid> => {
  try {
    // `git checkout --` restores tracked files; untracked files are removed separately.
    const git = gitFor(vaultPath);
    const s = await git.status();
    const tracked: string[] = [];
    const untracked: string[] = [];
    for (const p of paths) {
      if (s.not_added.includes(p)) untracked.push(p);
      else tracked.push(p);
    }
    if (tracked.length) await git.checkout(['--', ...tracked]);
    for (const u of untracked) {
      const full = path.join(vaultPath, u);
      try {
        await fs.unlink(full);
      } catch {
        /* ignore missing */
      }
    }
    return { ok: true };
  } catch (e) {
    return gitErr(e);
  }
});

ipcMain.handle('git:commit', async (_e, vaultPath: string, message: string): Promise<GitResult<{ commit: string }>> => {
  try {
    const res = await gitFor(vaultPath).commit(message);
    return { ok: true, commit: res.commit };
  } catch (e) {
    return gitErr(e);
  }
});

ipcMain.handle('git:push', async (_e, vaultPath: string): Promise<GitVoid> => {
  try {
    const git = gitFor(vaultPath);
    const status = await git.status();
    if (status.tracking) {
      await git.push();
    } else {
      // First push on this branch — set the upstream so future pushes "just work".
      const remotes = await git.getRemotes(false);
      if (!remotes.length) {
        throw new Error('No remote configured. Add one with: git remote add origin <url>');
      }
      if (!status.current) throw new Error('No current branch to push.');
      await git.push(['-u', remotes[0].name, status.current]);
    }
    return { ok: true };
  } catch (e) {
    return gitErr(e);
  }
});

ipcMain.handle('git:pull', async (_e, vaultPath: string): Promise<GitVoid> => {
  try {
    await gitFor(vaultPath).pull();
    return { ok: true };
  } catch (e) {
    return gitErr(e);
  }
});

// Fetch updates the remote-tracking refs (no merge), so a following git:status
// reports an accurate behind/ahead count. Without this, "behind" stays stale until
// something else fetched. No-op (ok:true) when there's no remote.
ipcMain.handle('git:fetch', async (_e, vaultPath: string): Promise<GitVoid> => {
  try {
    const git = gitFor(vaultPath);
    const remotes = await git.getRemotes(false);
    if (!remotes.length) return { ok: true };
    await git.fetch();
    return { ok: true };
  } catch (e) {
    return gitErr(e);
  }
});

ipcMain.handle('git:diff', async (_e, vaultPath: string, filePath: string, staged: boolean): Promise<GitResult<{ diff: string }>> => {
  try {
    const git = gitFor(vaultPath);
    const args = staged ? ['diff', '--cached', '--', filePath] : ['diff', '--', filePath];
    const diff = await git.raw(args);
    if (diff) return { ok: true, diff };
    // Untracked or newly added files won't have a diff. Show as new file with /dev/null.
    try {
      const fullPath = path.join(vaultPath, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n').map((l) => `+${l}`).join('\n');
      return { ok: true, diff: `--- /dev/null\n+++ b/${filePath}\n@@ -0,0 +1,${content.split('\n').length} @@\n${lines}` };
    } catch {
      return { ok: true, diff: '(binary or unreadable file)' };
    }
  } catch (e) {
    return gitErr(e) as { ok: false; error: string } & { diff?: string };
  }
});

ipcMain.handle('git:log', async (_e, vaultPath: string, count: number): Promise<GitResult<{ log: { hash: string; message: string; date: string; author: string }[] }>> => {
  try {
    const git = gitFor(vaultPath);
    const result = await git.log({ maxCount: count || 20 });
    const log = result.all.map((c) => ({
      hash: c.hash.slice(0, 7),
      message: c.message,
      date: c.date,
      author: c.author_name,
    }));
    return { ok: true, log };
  } catch (e) {
    return gitErr(e) as { ok: false; error: string } & { log?: unknown };
  }
});

// ---- IPC: AI ----
// All AI calls run in the main process so API keys never enter the renderer
// (and so we sidestep the prod CSP `connect-src 'self'`). Streaming is done by
// pushing 'ai:chunk' events to the renderer keyed by a request id.

const DEFAULT_AI_SETTINGS: AISettingsStored = {
  provider: 'ollama',
  ollama: { baseUrl: 'http://localhost:11434', model: '' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  anthropic: { baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-4-6' },
  bedrock: {
    region: 'us-east-1',
    model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  },
};

const DEFAULT_VOICE_SETTINGS: VoiceSettingsStored = {
  engine: 'cloud',
  cloud: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-transcribe' },
  local: { model: 'Xenova/whisper-base.en' },
  language: '',
  vocab: '',
  cleanup: true,
};

function encryptKey(plain: string): string | undefined {
  if (!plain) return undefined;
  if (!safeStorage.isEncryptionAvailable()) {
    // Fall back to plain base64 with a marker so we can detect on read. Better than
    // refusing to save; user systems without keyring (e.g. headless linux) still work.
    return 'plain:' + Buffer.from(plain, 'utf8').toString('base64');
  }
  return 'enc:' + safeStorage.encryptString(plain).toString('base64');
}

function decryptKey(stored: string | undefined): string {
  if (!stored) return '';
  if (stored.startsWith('plain:')) {
    return Buffer.from(stored.slice(6), 'base64').toString('utf8');
  }
  if (stored.startsWith('enc:')) {
    try {
      return safeStorage.decryptString(Buffer.from(stored.slice(4), 'base64'));
    } catch {
      return '';
    }
  }
  return '';
}

/** What we send to the renderer — never includes raw keys, just a hasKey flag. */
interface AISettingsView {
  provider: AIProvider;
  ollama: { baseUrl: string; model: string };
  openai: { baseUrl: string; model: string; hasKey: boolean };
  anthropic: { baseUrl: string; model: string; hasKey: boolean };
  bedrock: { region: string; model: string; hasCreds: boolean };
}

/** Renderer-safe voice view — STT key replaced with a hasKey flag. */
interface VoiceSettingsView {
  engine: VoiceEngine;
  cloud: { baseUrl: string; model: string; hasKey: boolean };
  local: { model: string };
  language: string;
  vocab: string;
  cleanup: boolean;
}

function toView(s: AISettingsStored): AISettingsView {
  return {
    provider: s.provider,
    ollama: { baseUrl: s.ollama.baseUrl, model: s.ollama.model },
    openai: { baseUrl: s.openai.baseUrl, model: s.openai.model, hasKey: !!s.openai.encKey },
    anthropic: { baseUrl: s.anthropic.baseUrl, model: s.anthropic.model, hasKey: !!s.anthropic.encKey },
    bedrock: {
      region: s.bedrock.region,
      model: s.bedrock.model,
      hasCreds: !!(s.bedrock.encAccessKeyId && s.bedrock.encSecretAccessKey),
    },
  };
}

async function readAISettings(): Promise<AISettingsStored> {
  const s = await readSettings();
  // Defensive merge so old settings.json files don't crash the app.
  const ai = s.ai ?? DEFAULT_AI_SETTINGS;
  return {
    provider: ai.provider ?? DEFAULT_AI_SETTINGS.provider,
    ollama: { ...DEFAULT_AI_SETTINGS.ollama, ...ai.ollama },
    openai: { ...DEFAULT_AI_SETTINGS.openai, ...ai.openai },
    anthropic: { ...DEFAULT_AI_SETTINGS.anthropic, ...ai.anthropic },
    bedrock: { ...DEFAULT_AI_SETTINGS.bedrock, ...ai.bedrock },
  };
}

async function readVoiceSettings(): Promise<VoiceSettingsStored> {
  const s = await readSettings();
  const v = s.voice ?? DEFAULT_VOICE_SETTINGS;
  return {
    engine: v.engine ?? DEFAULT_VOICE_SETTINGS.engine,
    cloud: { ...DEFAULT_VOICE_SETTINGS.cloud, ...v.cloud },
    local: { ...DEFAULT_VOICE_SETTINGS.local, ...v.local },
    language: v.language ?? DEFAULT_VOICE_SETTINGS.language,
    vocab: v.vocab ?? DEFAULT_VOICE_SETTINGS.vocab,
    cleanup: v.cleanup ?? DEFAULT_VOICE_SETTINGS.cleanup,
  };
}

function voiceToView(v: VoiceSettingsStored): VoiceSettingsView {
  return {
    engine: v.engine,
    cloud: { baseUrl: v.cloud.baseUrl, model: v.cloud.model, hasKey: !!v.cloud.encKey },
    local: { model: v.local.model },
    language: v.language,
    vocab: v.vocab,
    cleanup: v.cleanup,
  };
}

ipcMain.handle('ai:settings:get', async (): Promise<AISettingsView> => {
  const s = await readAISettings();
  return toView(s);
});

/** Save AI settings. The renderer sends keys as plaintext (rare event, only when
 *  the user types one into the settings dialog); we encrypt before persisting. */
ipcMain.handle(
  'ai:settings:set',
  async (
    _e,
    update: {
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
  ): Promise<AISettingsView> => {
    const settings = await readSettings();
    const cur = await readAISettings();
    // Resolve "send field iff present, null means clear, missing means keep" once
    // per key to keep the next: literal readable.
    const resolveSecret = (
      next: string | null | undefined,
      prev: string | undefined
    ): string | undefined => {
      if (next === undefined) return prev;
      if (next === null) return undefined;
      return next ? encryptKey(next) : prev;
    };
    const nextOut: AISettingsStored = {
      provider: update.provider ?? cur.provider,
      ollama: {
        baseUrl: update.ollama?.baseUrl ?? cur.ollama.baseUrl,
        model: update.ollama?.model ?? cur.ollama.model,
      },
      openai: {
        baseUrl: update.openai?.baseUrl ?? cur.openai.baseUrl,
        model: update.openai?.model ?? cur.openai.model,
        encKey:
          update.openai && 'apiKey' in update.openai
            ? resolveSecret(update.openai.apiKey, cur.openai.encKey)
            : cur.openai.encKey,
      },
      anthropic: {
        baseUrl: update.anthropic?.baseUrl ?? cur.anthropic.baseUrl,
        model: update.anthropic?.model ?? cur.anthropic.model,
        encKey:
          update.anthropic && 'apiKey' in update.anthropic
            ? resolveSecret(update.anthropic.apiKey, cur.anthropic.encKey)
            : cur.anthropic.encKey,
      },
      bedrock: {
        region: update.bedrock?.region ?? cur.bedrock.region,
        model: update.bedrock?.model ?? cur.bedrock.model,
        encAccessKeyId:
          update.bedrock && 'accessKeyId' in update.bedrock
            ? resolveSecret(update.bedrock.accessKeyId, cur.bedrock.encAccessKeyId)
            : cur.bedrock.encAccessKeyId,
        encSecretAccessKey:
          update.bedrock && 'secretAccessKey' in update.bedrock
            ? resolveSecret(update.bedrock.secretAccessKey, cur.bedrock.encSecretAccessKey)
            : cur.bedrock.encSecretAccessKey,
      },
    };
    await writeSettings({ ...settings, ai: nextOut });
    return toView(nextOut);
  }
);

ipcMain.handle('ai:ollama:models', async (_e, baseUrl: string): Promise<string[]> => {
  return listOllamaModels(baseUrl);
});

// Active streaming requests, keyed by request id, so the renderer can cancel.
const aiAborters = new Map<string, AbortController>();

ipcMain.handle(
  'ai:generate',
  async (
    e,
    id: string,
    payload: { system: string; user: string }
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    const s = await readAISettings();
    const abort = new AbortController();
    aiAborters.set(id, abort);

    const sender = e.sender;
    const send = (channel: string, data: unknown) => {
      if (!sender.isDestroyed()) sender.send(channel, data);
    };

    try {
      let baseUrl = '';
      let model = '';
      let apiKey = '';
      let awsRegion: string | undefined;
      let awsAccessKeyId: string | undefined;
      let awsSecretAccessKey: string | undefined;

      if (s.provider === 'ollama') {
        baseUrl = s.ollama.baseUrl;
        model = s.ollama.model;
        if (!model) throw new Error('No Ollama model selected. Open AI settings to pick one.');
      } else if (s.provider === 'openai') {
        baseUrl = s.openai.baseUrl;
        model = s.openai.model;
        apiKey = decryptKey(s.openai.encKey);
        if (!apiKey) throw new Error('OpenAI API key not set. Add one in AI settings.');
      } else if (s.provider === 'anthropic') {
        baseUrl = s.anthropic.baseUrl;
        model = s.anthropic.model;
        apiKey = decryptKey(s.anthropic.encKey);
        if (!apiKey) throw new Error('Anthropic API key not set. Add one in AI settings.');
      } else {
        // bedrock
        model = s.bedrock.model;
        awsRegion = s.bedrock.region;
        awsAccessKeyId = decryptKey(s.bedrock.encAccessKeyId);
        awsSecretAccessKey = decryptKey(s.bedrock.encSecretAccessKey);
        if (!awsAccessKeyId || !awsSecretAccessKey) {
          throw new Error('AWS credentials not set. Add them in AI settings.');
        }
      }

      await aiGenerate({
        provider: s.provider,
        baseUrl,
        model,
        apiKey,
        awsRegion,
        awsAccessKeyId,
        awsSecretAccessKey,
        system: payload.system,
        user: payload.user,
        signal: abort.signal,
        onChunk: (delta) => send(`ai:chunk:${id}`, delta),
      });
      send(`ai:done:${id}`, null);
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // AbortError is the user-cancelled case — quiet, not a real error.
      if (abort.signal.aborted) {
        send(`ai:done:${id}`, null);
        return { ok: true };
      }
      console.warn('[ai] error:', msg);
      send(`ai:error:${id}`, msg);
      return { ok: false, error: msg };
    } finally {
      aiAborters.delete(id);
    }
  }
);

ipcMain.handle('ai:cancel', async (_e, id: string): Promise<boolean> => {
  const a = aiAborters.get(id);
  if (a) {
    a.abort();
    aiAborters.delete(id);
    return true;
  }
  return false;
});

// ---- IPC: Voice (speech-to-text) ----

ipcMain.handle('voice:settings:get', async (): Promise<VoiceSettingsView> => {
  return voiceToView(await readVoiceSettings());
});

ipcMain.handle(
  'voice:settings:set',
  async (
    _e,
    update: {
      engine?: VoiceEngine;
      cloud?: { baseUrl?: string; model?: string; apiKey?: string | null };
      local?: { model?: string };
      language?: string;
      vocab?: string;
      cleanup?: boolean;
    }
  ): Promise<VoiceSettingsView> => {
    const settings = await readSettings();
    const cur = await readVoiceSettings();
    const resolveSecret = (
      next: string | null | undefined,
      prev: string | undefined
    ): string | undefined => {
      if (next === undefined) return prev;
      if (next === null) return undefined;
      return next ? encryptKey(next) : prev;
    };
    const next: VoiceSettingsStored = {
      engine: update.engine ?? cur.engine,
      cloud: {
        baseUrl: update.cloud?.baseUrl ?? cur.cloud.baseUrl,
        model: update.cloud?.model ?? cur.cloud.model,
        encKey:
          update.cloud && 'apiKey' in update.cloud
            ? resolveSecret(update.cloud.apiKey, cur.cloud.encKey)
            : cur.cloud.encKey,
      },
      local: { model: update.local?.model ?? cur.local.model },
      language: update.language ?? cur.language,
      vocab: update.vocab ?? cur.vocab,
      cleanup: update.cleanup ?? cur.cleanup,
    };
    await writeSettings({ ...settings, voice: next });
    return voiceToView(next);
  }
);

const voiceAborters = new Map<string, AbortController>();

ipcMain.handle(
  'voice:transcribe',
  async (
    e,
    id: string,
    payload:
      | { kind: 'cloud'; audio: ArrayBuffer; mimeType: string }
      | { kind: 'local'; pcm: Float32Array }
  ): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
    const v = await readVoiceSettings();
    const abort = new AbortController();
    voiceAborters.set(id, abort);
    const sender = e.sender;
    const progress = (msg: string) => {
      if (!sender.isDestroyed()) sender.send(`voice:progress:${id}`, msg);
    };
    try {
      let text = '';
      if (payload.kind === 'cloud') {
        text = await transcribeCloud({
          baseUrl: v.cloud.baseUrl,
          apiKey: decryptKey(v.cloud.encKey),
          model: v.cloud.model,
          language: v.language || undefined,
          prompt: v.vocab || undefined,
          audio: new Uint8Array(payload.audio),
          mimeType: payload.mimeType,
          signal: abort.signal,
        });
      } else {
        text = await transcribeLocal({
          model: v.local.model,
          language: v.language || undefined,
          pcm: payload.pcm,
          onProgress: progress,
        });
      }
      return { ok: true, text };
    } catch (err) {
      if (abort.signal.aborted) return { ok: true, text: '' };
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[voice] error:', msg);
      return { ok: false, error: msg };
    } finally {
      voiceAborters.delete(id);
    }
  }
);

ipcMain.handle('voice:cancel', async (_e, id: string): Promise<boolean> => {
  const a = voiceAborters.get(id);
  if (a) {
    a.abort();
    voiceAborters.delete(id);
    return true;
  }
  return false;
});

// ---- IPC: Whisper Models ----
ipcMain.handle('whisper:models', async () => {
  const downloaded = listDownloadedModels();
  return WHISPER_MODELS.map((m) => ({
    ...m,
    downloaded: downloaded.includes(m.id),
  }));
});

ipcMain.handle('whisper:download', async (e, modelId: string) => {
  const sender = e.sender;
  try {
    await downloadModel(modelId, (p) => {
      if (!sender.isDestroyed()) {
        sender.send('whisper:download:progress', p);
      }
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
});

ipcMain.handle('whisper:download:cancel', async (_e, modelId: string) => {
  return cancelDownload(modelId);
});

ipcMain.handle('whisper:delete', async (_e, modelId: string) => {
  return deleteModel(modelId);
});

ipcMain.handle('whisper:modelsDir', async () => {
  return getModelsDir();
});

// ---- IPC: Export ----
ipcMain.handle(
  'export:save',
  async (_e, kind: 'md' | 'html' | 'pdf', defaultName: string, payload: string) => {
    const ext = kind;
    const result = await dialog.showSaveDialog(win!, {
      title: `Export as ${kind.toUpperCase()}`,
      defaultPath: defaultName.replace(/\.md$/i, `.${ext}`),
      filters: [{ name: kind.toUpperCase(), extensions: [ext] }],
    });
    if (result.canceled || !result.filePath) return null;

    if (kind === 'md' || kind === 'html') {
      await fs.writeFile(result.filePath, payload, 'utf-8');
      return result.filePath;
    }
    // PDF: payload is full HTML; render in a hidden window then printToPDF
    const printWin = new BrowserWindow({
      show: false,
      webPreferences: { offscreen: false, sandbox: true, contextIsolation: true },
    });
    try {
      await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(payload)}`);
      const pdf = await printWin.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
      });
      await fs.writeFile(result.filePath, pdf);
      return result.filePath;
    } finally {
      printWin.destroy();
    }
  }
);
