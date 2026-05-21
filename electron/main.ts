import { app, BrowserWindow, ipcMain, dialog, shell, session, protocol, net } from 'electron';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import chokidar, { FSWatcher } from 'chokidar';
import pkg from 'electron-updater';
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

interface Settings {
  vaultPath?: string;
  recentVaults?: string[];
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
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
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
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: vault:; connect-src 'self';",
          ],
        },
      });
    });
  }
  createWindow();
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
  '.canvas', '.base',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp',
  '.pdf', '.pen',
  '.mp3', '.mp4', '.webm', '.ogg', '.wav', '.m4a', '.mov',
  '.csv', '.json', '.html', '.txt',
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
