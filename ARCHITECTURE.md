# SideNotes — Technical Architecture & System Design

A local-first note-taking app built on Electron, React, and plain markdown files. No cloud backend, no database, no sync service. Your vault is a folder on disk.

---

## Stack

| Layer | Tech | Why |
|-------|------|-----|
| Desktop shell | Electron 33 | Cross-platform, native menu/file access, `<webview>` for spatial browser |
| Renderer | React 18 + TypeScript | Component model, hooks for state, fast HMR |
| Build | Vite 6 + vite-plugin-electron | Sub-second hot reload, tree-shaking, ESM-native |
| Editor | TipTap 2 (ProseMirror) | Block editor with plugin system, markdown round-trip |
| State | Zustand 5 | Zero-boilerplate stores, no providers, selector-based re-renders |
| Styling | Tailwind CSS 3 + CSS custom properties | Utility classes with theme variables for 6 themes x 2 modes |
| Graph | Sigma.js 3 + graphology + ForceAtlas2 | WebGL rendering handles 1000+ nodes at 60fps |
| Canvas | React Flow (@xyflow/react) | Mature node/edge canvas with zoom, pan, resize, connection handles |
| Diagrams | Mermaid 11 | Renders flowcharts/sequences inside code blocks with live preview |
| Drawing | Excalidraw 0.18 | Embedded `.excalidraw` file type, offline fonts |
| Git | simple-git | Thin wrapper around the system git binary for source control |
| AI | Ollama / OpenAI / Anthropic / Bedrock | Streaming via main process, keys stored in OS keychain |
| Voice | OpenAI Whisper (cloud) or Transformers.js (local) | Hold-to-talk dictation |

---

## Process Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Main Process (Node.js)                            │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  ┌───────────┐ │
│  │ File I/O     │  │ Chokidar     │  │ simple-git    │  │ AI Engine │ │
│  │ read/write/  │  │ Watcher      │  │ status/stage/ │  │ streaming │ │
│  │ create/del   │  │ add/change/  │  │ commit/push/  │  │ ollama/   │ │
│  │              │  │ unlink events│  │ pull/diff/log │  │ openai/   │ │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │ anthropic │ │
│         │                  │                   │          │ bedrock   │ │
│         │                  │                   │          └─────┬─────┘ │
│         │                  │                   │                │       │
│  ┌──────┴──────────────────┴───────────────────┴────────────────┴────┐  │
│  │                     IPC Handler Layer                              │  │
│  │  ipcMain.handle('files:read')  ipcMain.handle('git:status')       │  │
│  │  ipcMain.handle('files:write') ipcMain.handle('ai:generate')      │  │
│  │  webContents.send('watch:event') webContents.send('ai:chunk')     │  │
│  └───────────────────────────┬───────────────────────────────────────┘  │
│                              │                                           │
│  ┌───────────────────────────┴───────────────────────────────────────┐  │
│  │              preload.ts (contextBridge)                            │  │
│  │  Exposes window.api = { vault, files, watch, git, ai, voice }     │  │
│  │  Every method returns a Promise. Events use callback registration.│  │
│  └───────────────────────────┬───────────────────────────────────────┘  │
├──────────────────────────────┼──────────────────────────────────────────┤
│                              │                                           │
│              Renderer Process (Chromium sandbox)                          │
│                                                                         │
│  ┌───────────────────────────┴───────────────────────────────────────┐  │
│  │  React App                                                        │  │
│  │                                                                   │  │
│  │  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌────────────────────┐ │  │
│  │  │ Zustand │  │ TipTap  │  │  Sigma   │  │   React Flow       │ │  │
│  │  │ Stores  │  │ Editor  │  │  Graph   │  │   Canvas/Browser   │ │  │
│  │  │         │  │         │  │  (WebGL) │  │                    │ │  │
│  │  └─────────┘  └─────────┘  └──────────┘  └────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Webview Processes (one per browser node on canvas)                │  │
│  │  - partition: "persist:browse" (shared session, isolated from app) │  │
│  │  - contextIsolation: true, nodeIntegration: false                 │  │
│  │  - communicates back via DOM events (will-navigate, new-window)   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Why this split matters:** API keys never enter the renderer. Network requests (AI, git push/pull) happen in Node.js where there's no CSP. The renderer only sees structured results piped over IPC. If the renderer is compromised (XSS in a webview that escapes), it can't read keys or touch the filesystem directly.

---

## Data Flow: Opening a Note

```
User clicks file in sidebar
        │
        ▼
useVault.openFile(rel)
  → sets activeFile = rel
  → sets view = 'editor'
  → adds to tabs[] if not present
        │
        ▼
<Editor key={rel}> mounts (key forces remount on file switch)
        │
        ▼
useEffect([rel, editor]) fires
  → api.files.read(joinPath(vaultPath, rel))
  → IPC to main process
  → fs.readFile(fullPath, 'utf-8')
  → returns raw markdown string
        │
        ▼
Preprocessing pipeline:
  1. Strip YAML frontmatter (regex: /^---\n[\s\S]*?\n---\n?/)
  2. If daily note: extract first H1 as title, separate from body
  3. rewriteImagePaths(): convert relative paths to vault:/// protocol URLs
  4. preprocessWikilinks(): [[Target|Label]] → <a class="wikilink" data-target="Target">Label</a>
  5. preprocessTags(): #tag → <span class="tag" data-name="tag">#tag</span>
        │
        ▼
markdownToDoc(editor, processedMarkdown):
  → Gets markdown-it instance from editor.storage.markdown.parser.md
  → Renders markdown to HTML (clean, no tiptap-markdown bug)
  → Parses HTML into DOM via DOMParser
  → Strips inter-block newlines (mirrors tiptap-markdown's normalizeDOM)
  → Strips trailing newline in <pre><code> blocks
  → ProseMirrorDOMParser.fromSchema(editor.schema).parse(body)
  → Returns JSON doc
        │
        ▼
editor.commands.setContent(doc, false, { preserveWhitespace: 'full' })
  → ProseMirror state transaction replaces document
  → Cursor moves to end (setTimeout 50ms for render settle)
        │
        ▼
lastSavedRaw.current = raw (used for no-op detection + external change detection)
```

---

## Data Flow: Saving a Note

```
User types in the editor
        │
        ▼
onUpdate callback fires (TipTap)
  → Clears existing saveTimer
  → Sets new 400ms setTimeout
        │
        ▼ (400ms later, no more typing)

editor.storage.markdown.getMarkdown()
  → tiptap-markdown serializes ProseMirror doc back to markdown
  → Wikilink nodes serialize as [[target]] via addStorage().markdown.serialize
  → Tag nodes serialize as #name
        │
        ▼
unrewriteImagePaths(md, noteRel)
  → Converts vault:///rel/path.png back to ./path.png (relative to note)
  → Only operates outside code blocks (split on ``` fences)
        │
        ▼
For daily notes: prependDailyTitle(title, body)
  → Prepends "# Title\n\n" back to the body
        │
        ▼
No-op check: if (finalMd === lastSavedRaw.current) return
  → Skips write if nothing actually changed
  → Prevents the watcher from echo-firing on our own writes
        │
        ▼
lastSavedRaw.current = finalMd
api.files.write(joinPath(vaultPath, rel), finalMd)
  → IPC to main: fs.writeFile(fullPath, content)
        │
        ▼
Chokidar watcher fires 'change' event
  → Main process: webContents.send('watch:event', {type: 'change', path})
  → Renderer: vault store's watcher handler runs
  → Compares changedRel to currentRelRef.current
  → If same file: reads fresh content, compares to lastSavedRaw
  → If matches (our own write echo): silently ignores
  → If different (external edit): checks for unsaved local edits
    → No local edits: hot-reloads editor content
    → Has local edits: shows toast warning, keeps user's version
```

---

## Data Flow: Vault Indexing

```
App starts / vault selected
        │
        ▼
api.files.list(vaultPath)
  → Main: recursive directory walk
  → Returns [{path, rel, mtime}] for all files matching known extensions
        │
        ▼
For each file where isMarkdownPath(rel):
  indexFile(vaultPath, rel, mtime):
    → api.files.read(fullPath)
    → parseNote(raw):
      → Extract frontmatter (title from fm.title or first H1)
      → Extract wikilinks: /\[\[([^\]\n|]+?)(?:\|([^\]\n]+))?\]\]/g
      → Extract markdown links: /!?\[[^\]\n]*\]\(([^)\s"]+)\)/g
      → Extract tags: /(^|[\s(>])#([A-Za-z][A-Za-z0-9_\-/]{0,63})\b/g
      → Returns {title, links[], tags[]}
    → Returns VaultFile: {path, rel, name, mtime, links, tags, title}
        │
        ▼
For non-markdown files (images, canvas, excalidraw):
  → Indexed with empty links/tags, basename as title
        │
        ▼
All files stored in Map<string, VaultFile> keyed by rel path
  → This is the single source of truth for the vault
  → Graph view, search, backlinks, autocomplete all derive from this map
        │
        ▼
Watcher started: api.watch.start(vaultPath)
  → Chokidar watches the vault folder recursively
  → On add/change: re-indexes the affected file, updates the map
  → On unlink: removes from map, closes tab if open
  → On addDir/unlinkDir: updates folder set
```

---

## Data Flow: AI Streaming

```
User triggers AI (Cmd+J → types instruction → Enter)
        │
        ▼
InlineAI captures:
  - Selection text (or current paragraph if no selection)
  - Cursor position for UI placement
  - System prompt (from preset or custom)
        │
        ▼
useAI.runCustom(systemPrompt, userContent)
  → Generates unique request ID: `ai-${Date.now()}-${random}`
  → Sets state: busy=true, output='', activeRequestId=id
  → Registers 3 event listeners keyed by ID:
    - api.ai.onChunk(id, delta => output += delta)
    - api.ai.onDone(id, () => busy=false)
    - api.ai.onError(id, msg => lastError=msg)
        │
        ▼
api.ai.generate(id, {system, user})
  → IPC to main: ipcMain.handle('ai:generate')
        │
        ▼
Main process:
  1. Loads settings from disk (provider, model, keys)
  2. Decrypts API key via safeStorage.decryptString()
  3. Creates AbortController (stored by ID for cancellation)
  4. Calls generate() from electron/ai.ts with provider-specific logic:

     OLLAMA:
       fetch(`${baseUrl}/api/chat`, {stream: true, messages: [...]})
       → Response is NDJSON: each line is {"message":{"content":"..."}}
       → readNdjson() parses line by line, calls onChunk(delta)

     OPENAI:
       fetch(`${baseUrl}/chat/completions`, {stream: true, ...})
       → Response is SSE: "data: {choices:[{delta:{content:'...'}}]}"
       → readSSE() extracts data lines, parses JSON, calls onChunk

     ANTHROPIC:
       fetch(`${baseUrl}/v1/messages`, {stream: true, ...})
       → Response is SSE with event types
       → Only content_block_delta events have text: obj.delta.text
       → readSSE() filters for these, calls onChunk

     BEDROCK:
       BedrockRuntimeClient.send(InvokeModelWithResponseStreamCommand)
       → Response is AWS event-stream binary frames
       → SDK decodes to JSON matching Anthropic's format
       → Same content_block_delta extraction
        │
        ▼
For each chunk:
  win.webContents.send(`ai:chunk:${id}`, delta)
  → Renderer: onChunk listener fires
  → Zustand set: output = prev.output + delta
  → React re-renders the streaming preview
        │
        ▼
When stream ends:
  win.webContents.send(`ai:done:${id}`)
  → Renderer: cleanup listeners, set busy=false
  → InlineAI shows Accept/Insert/Discard buttons
```

---

## Data Flow: Spatial Browser (Link Spawning)

```
User adds a web page via Cmd+K or "+ Page" button
        │
        ▼
addWebNode(url):
  → normalizeUrl(): "koushith.in" → "https://koushith.in"
  → Creates React Flow node: {type: 'webCard', data: {url, color: 'none'}}
  → Position: center of current viewport
  → Size: 560x400
        │
        ▼
WebCardNode mounts → WebPageCard renders
  → useEffect creates webview imperatively:
    const wv = document.createElement('webview')
    wv.setAttribute('src', url)
    wv.setAttribute('partition', 'persist:browse')
    container.appendChild(wv)
        │
        ▼
Webview starts loading:
  → 'did-start-loading' event → setLoading(true)
  → Electron spawns a new renderer process for this webview
  → Page loads in isolation (separate process, separate V8 context)
        │
        ▼
Page loaded:
  → 'dom-ready' event → wv.setZoomFactor(0.75)
  → 'did-stop-loading' event → setLoading(false)
  → 'did-navigate' event → update URL bar display
        │
        ▼
User clicks a link inside the page:
  → 'will-navigate' event fires BEFORE navigation happens
  → Check isBarNavRef.current:
    - true: this was our loadURL() call, let it proceed, reset flag
    - false: this was a user click on a link
        │
        ▼ (user link click)

  setTimeout(() => wv.stop(), 0)  ← halt navigation in this webview
  onLinkClick(newUrl)  ← callback to parent
        │
        ▼
spawnChildWeb(parentId, newUrl):
  → normalizeUrl(newUrl)
  → Calculate position: parent.x + parent.width + 80px gap, same Y + 40px
  → Create new node: {type: 'webCard', data: {url: normalizedUrl}}
  → Create edge: {source: parentId, target: newNodeId, smoothstep}
  → setNodes([...cur, newNode])
  → setEdges([...cur, newEdge])
  → queueSave() ← debounced 350ms write to .canvas file
        │
        ▼
New WebPageCard mounts → new webview loads the URL
Layers panel updates (tree rebuilds from edges)
```

---

## Data Flow: Graph View Physics

```
GraphView mounts
        │
        ▼
Build graph from vault index:
  for each VaultFile in files Map:
    → graph.addNode(rel, {label, x: random, y: random, size, color, age})
  for each file's links:
    → resolveWikilink(link, filesArr) → find target file
    → graph.addEdge(source, target, {size: 1.4})
    → Deduplication via seen Set (canonical key: sorted pair)
        │
        ▼
Community detection:
  communities = louvain(graph)
  → Returns Record<nodeId, communityIndex>
  → buildCommunityColors maps community IDs to palette colors
  → graph.setNodeAttribute(node, 'color', communityColor)
        │
        ▼
Initial layout:
  settings = forceAtlas2.inferSettings(graph)  ← auto-tunes gravity/scaling
  forceAtlas2.assign(graph, {iterations: 100, settings: {...settings, slowDown: 1}})
  → 100 iterations with fast movement to roughly place nodes
        │
        ▼
RAF loop starts (tick function):
  Every 2nd frame (30Hz physics, 60Hz render):
    IF not converged AND not dragging:
      → Save positions to Float64Array (pre-allocated, no GC)
      → forceAtlas2.assign(graph, {iterations: 1, settings})
      → Calculate total squared displacement
      → If disp < 0.0025 * nodeCount for 30 consecutive frames → converged = true
    renderer.refresh()

  Every frame:
    IF showParticles:
      → For each particle in pool (min(edgeCount*2, 200)):
        → Interpolate position along edge: lerp(source, target, progress)
        → graphToViewport() → convert graph coords to canvas pixels
        → ctx.arc() → draw 1.5px circle
        → progress += speed (0.002-0.006 per frame)
        → If progress >= 1: recycle to random edge from cachedEdges[]
        │
        ▼
  requestAnimationFrame(tick)

On unmount:
  cancelled = true
  cancelAnimationFrame(rafId)
  renderer.kill()  ← cleans up Sigma's WebGL context
```

---

## Data Flow: External File Change Detection

This is critical for sync (iCloud, Dropbox, git checkout). Without it, the editor's stale in-memory state overwrites external changes on the next keystroke.

```
External change happens (another editor, iCloud sync, git pull)
        │
        ▼
Chokidar watcher detects 'change' event on the file
  → Main process: webContents.send('watch:event', {type: 'change', path})
        │
        ▼
Renderer: api.watch.onEvent handler fires
  → Compute changedRel from absolute path
  → If changedRel !== currentRelRef.current → ignore (different file)
        │
        ▼
Read fresh content: api.files.read(path)
        │
        ▼
Echo detection: if (fresh === lastSavedRaw.current) → return
  (This was our own write bouncing back through the watcher)
        │
        ▼
Check for unsaved local edits:
  → Serialize current editor state to markdown
  → Compare against lastSavedRaw.current
  → If they match → no unsaved edits → safe to reload
        │
        ▼
SAFE PATH (no local edits):
  → Strip frontmatter, rewrite image paths, preprocess wikilinks/tags
  → markdownToDoc() → editor.commands.setContent(doc)
  → lastSavedRaw.current = fresh
  → User sees updated content seamlessly

CONFLICT PATH (has unsaved edits):
  → toast.error("file was modified on disk while you had unsaved edits")
  → Keep the user's local version intact
  → They can re-open the tab to get the disk version
```

---

## State Management Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Zustand Stores                            │
│                                                             │
│  vault.ts ─────────────────────────────────────────────────│
│  │ files: Map<rel, VaultFile>    ← single source of truth  │
│  │ activeFile: string | null     ← which file is open      │
│  │ tabs: string[]                ← open tab order          │
│  │ view: ViewMode                ← editor|graph|all|git    │
│  │ search, selectedTag, pinned   ← filtering state         │
│  │                                                         │
│  │ Methods: openFile, saveFile, createFile, deleteFile,    │
│  │ renameFile, reloadIndex, getBacklinks, getAllTags,       │
│  │ searchContent, openOrCreateDaily                        │
│  └─────────────────────────────────────────────────────────│
│                                                             │
│  theme.ts ─────────────────────────────────────────────────│
│  │ theme: 'paper'|'ink'|'forest'|'dusk'|'carbon'|'rose'  │
│  │ mode: 'light'|'dark'                                    │
│  │ setTheme(), setMode(), toggleMode()                     │
│  └─────────────────────────────────────────────────────────│
│                                                             │
│  ui.ts ────────────────────────────────────────────────────│
│  │ focusMode, rawMode, sidebarCollapsed, aiSettingsOpen    │
│  │ All persisted to localStorage                           │
│  └─────────────────────────────────────────────────────────│
│                                                             │
│  git.ts ───────────────────────────────────────────────────│
│  │ hasRepo, branch, tracking, ahead, behind, files[]       │
│  │ Methods: refresh, stage, unstage, discard, commit,      │
│  │ push, pull, fetchRemote                                 │
│  └─────────────────────────────────────────────────────────│
│                                                             │
│  ai.ts ────────────────────────────────────────────────────│
│  │ settings, busy, output, lastError, activeRequestId      │
│  │ Methods: run(kind, source), runCustom(system, user),    │
│  │ cancel(), clearOutput()                                 │
│  └─────────────────────────────────────────────────────────│
│                                                             │
│  noteIntelligence.ts ──────────────────────────────────────│
│  │ enabled, features{}, tags, title, todos, links,         │
│  │ continuation                                            │
│  │ Methods: analyzeContent(rel, content, allNotes),        │
│  │ onPause(rel, content), dismiss*()                       │
│  └─────────────────────────────────────────────────────────│
│                                                             │
│  editorRef.ts ─────────────────────────────────────────────│
│  │ editor: TipTap Editor | null                            │
│  │ Exposed globally so titlebar/export can reach it        │
│  └─────────────────────────────────────────────────────────│
└─────────────────────────────────────────────────────────────┘
```

Each store is independent. Components subscribe to specific slices via selectors: `useVault(s => s.files)` only re-renders when that specific value changes. No context providers, no prop drilling.

---

## TipTap Extension Architecture

The editor loads 15+ extensions. Here's how the custom ones work:

**Wikilink (atom node):**
- `parseHTML`: matches `<a class="wikilink" data-target="...">` from preprocessing
- `renderHTML`: outputs the same shape so round-trip is stable
- `addInputRules`: `[[target]]` typed in the editor creates the node inline
- `addStorage.markdown.serialize`: outputs `[[target]]` or `[[target|label]]`
- Click handler via DOM event listener on the editor view

**Tag (atom node):**
- Same pattern as Wikilink but for `<span class="tag" data-name="...">`
- Input rule: `#tagname ` (space terminates) converts to atom node
- Serialize: `#tagname`

**SlashMenu (plugin):**
- ProseMirror plugin watches transactions for `/` typed at line start
- Computes popup position via `view.coordsAtPos()`
- Exposes state via `onStateChange` callback to React
- React renders the floating menu; selections dispatch editor commands

**MermaidCodeBlock (NodeView):**
- Extends CodeBlockLowlight with a React NodeView renderer
- Detects `language === 'mermaid'` to show preview/source toggle
- Renders via `mermaid.render()` with theme-tinted variables
- Non-mermaid blocks get a framed code view with copy button + language header

---

## Image Handling Pipeline

```
User pastes/drops an image into the editor
        │
        ▼
handlePaste / handleDrop intercepts the file
  → Checks: item.type.startsWith('image/')
        │
        ▼
saveImageToVault(vaultPath, file, currentRel):
  → Generates path: assets/image-YYYY-MM-DD_HH-MM-SS.ext
  → Converts File to ArrayBuffer
  → api.files.writeAsset(vaultPath, assetRel, {type: 'buffer', bytes})
  → Main process: writes bytes to disk
  → Returns {assetRel, mdPath} (mdPath is relative from the note)
        │
        ▼
editor.chain().focus().setImage({src: `vault:///${assetRel}`}).run()
  → Image displays in editor via custom protocol
        │
        ▼
On save:
  unrewriteImagePaths() converts vault:///... back to relative ./assets/...
  → Stored in markdown as: ![alt](./assets/image-2026-06-28_14-30-22.png)

On load:
  rewriteImagePaths() converts relative paths back to vault:///...
  → Electron's protocol handler serves the file from disk

Why vault:// protocol?
  → file:// has CORS restrictions in Electron's sandboxed renderer
  → Relative paths break because the HTML isn't loaded from the vault dir
  → vault:// registers via protocol.handle(), reads from disk, returns response
```

---

## Theme System Internals

```
CSS Custom Properties (src/index.css):
  :root, [data-theme="light"] {
    --c-bg: 247 243 236;        /* stored as R G B triples */
    --c-text: 31 29 26;
    --c-accent: 196 98 58;
    ...
  }
  [data-theme="dark"] {
    --c-bg: 28 26 23;
    ...
  }

Tailwind mapping (tailwind.config.js):
  colors: {
    bg: { DEFAULT: 'rgb(var(--c-bg) / <alpha-value>)' }
  }
  → Enables: bg-bg, bg-bg/80, text-text, border-border, etc.
  → Alpha values work because we store raw "R G B" not "rgb(R,G,B)"

Theme switch:
  document.documentElement.setAttribute('data-theme', themeName)
  document.documentElement.setAttribute('data-mode', 'dark')
  → All CSS variables re-resolve instantly
  → No JS re-rendering needed for colors

Graph/Mermaid re-render:
  → useTheme store triggers via dependency array
  → Graph reads CSS vars at render time: getComputedStyle(doc).getPropertyValue('--c-bg')
  → isBgDark() detects luminance to pick light/dark palette regardless of mode label
```

---

## Security Model

**Process isolation:**
- `contextIsolation: true` separates preload world from renderer world
- `nodeIntegration: false` means no `require()` or `process` in page scripts
- `sandbox: false` only for the preload script (needed for `ipcRenderer` access)
- Webview tags get `will-attach-webview` handler that strips any `preload` and enforces `contextIsolation`

**Content Security Policy (production):**
```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
font-src 'self' data:;
img-src 'self' data: blob: vault:;
connect-src 'self' blob:;
worker-src 'self' blob:;
frame-src *;
```
- No remote scripts, no remote fonts, no remote connections from the renderer
- `frame-src *` allows webview tags to load any URL (they're in their own process anyway)
- AI/git network calls happen in main process (not subject to renderer CSP)

**Credential storage:**
- API keys encrypted via `safeStorage.encryptString()` (uses OS keychain: macOS Keychain, Windows DPAPI, Linux libsecret)
- Stored as encrypted buffers in `settings.json`
- Decrypted only when needed for a request, never sent to renderer
- "Clear key" action overwrites with null

**Webview sandboxing:**
- Each webview runs in a separate process with `contextIsolation: true`
- Partition `persist:browse` isolates cookies/localStorage from the app
- The app's IPC bridge is not exposed to webview content
- `new-window` events are intercepted (spawn child node, don't open native window)

---

## Performance Considerations

**Graph view:**
- ForceAtlas2 convergence detection: pre-allocated `Float64Array` for positions, squared displacement comparison (avoids `Math.sqrt` per node per frame), stops after 30 frames below threshold
- Particle system: single `fillStyle` set per frame, cached `graph.edges()` array for random reassignment, no object allocation in the hot loop
- Rendering-only state (pathNodes, showAge, showParticles) stored in refs to avoid destroying + rebuilding the graph on toggle

**Editor:**
- 400ms debounced saves prevent disk thrash during fast typing
- No-op write detection skips filesystem writes when content hasn't changed
- `preserveWhitespace: 'full'` avoids ProseMirror stripping intentional whitespace
- File load uses cancellation flag to prevent stale async responses from overwriting

**Vault indexing:**
- Only markdown files get full content parsing (links, tags, title)
- Non-text files indexed with metadata only (no read)
- Incremental re-indexing via watcher (single file at a time, not full re-scan)

**Canvas:**
- Webview zoom factor 0.75 reduces rendering cost (fewer pixels to composite)
- Debounced 350ms save prevents disk writes during rapid drag/resize
- Nodes use refs for parent tracking (avoid React Flow re-computing node types)

---

## File Structure

```
electron/
  main.ts          — app lifecycle, window, IPC handlers, watcher, protocols, git, updater
  preload.ts       — contextBridge exposing typed API surface to renderer
  ai.ts            — streaming AI providers (ollama, openai, anthropic, bedrock)
  voice.ts         — transcription handlers (cloud whisper, local transformers.js)

src/
  App.tsx           — root layout, view routing, global keyboard shortcuts (Cmd+1/2/3/4)
  main.tsx          — React mount, font imports, Excalidraw asset path setup
  types.ts          — shared TypeScript interfaces (VaultFile, GitStatus, AISettings, etc.)

  components/
    Editor.tsx               — TipTap editor mount, all extensions, file load/save lifecycle
    GraphView.tsx            — Sigma + ForceAtlas2, community detection, particles, path finder
    CanvasView.tsx           — React Flow spatial browser with webview nodes
    InlineAI.tsx             — floating AI command bar (Cmd+J)
    SourceControlPanel.tsx   — git UI with diff viewer + commit history
    Sidebar.tsx              — main nav, file tree, vault header, collapse toggle
    EditorBubbleMenu.tsx     — floating format toolbar on text selection
    TableBubbleMenu.tsx      — table-specific toolbar (add/remove rows/cols)
    IntelligenceHints.tsx    — dismissable AI suggestions below editor
    CommandPalette.tsx       — Cmd+K global search/action palette
    FileTree.tsx             — recursive folder/file tree with drag, rename, context menu
    AllNotesView.tsx         — table view of all notes with sort/filter
    Onboarding.tsx           — first-run tour
    WhatsNew.tsx             — changelog modal (shows after updates)
    ...30+ more components

    extensions/
      Wikilink.ts            — [[link]] atom node (parse, render, input rule, serialize)
      Tag.ts                 — #tag atom node
      SlashMenu.ts           — / command detection ProseMirror plugin
      WikilinkSuggest.ts     — [[ autocomplete popup state
      MentionSuggest.ts      — @ mention autocomplete
      MermaidCodeBlock.tsx    — code block NodeView with Mermaid live preview

  stores/
    vault.ts                 — file index, tabs, open/save/create, search, backlinks
    theme.ts                 — theme name + mode, persisted to localStorage
    ui.ts                    — sidebar collapse, focus mode, raw mode
    git.ts                   — git operations, status cache, error state
    ai.ts                    — AI generation lifecycle, streaming accumulator
    noteIntelligence.ts      — background AI analysis (debounced, per-feature toggles)
    editorRef.ts             — global editor instance ref
    lightbox.ts              — image/SVG zoom overlay state
    onboarding.ts            — tour completion tracking
    voice.ts                 — voice recording state, settings

  lib/
    api.ts                   — typed wrapper around window.api preload bridge
    markdown.ts              — link/tag extraction, wikilink resolution, parseNote()
    markdownLoader.ts        — clean markdown → ProseMirror doc (bypasses tiptap bug)
    utils.ts                 — joinPath, basenameNoExt, cn(), isMarkdownPath, etc.
    images.ts                — saveImageToVault helper
    recorder.ts              — AudioWorklet PCM recorder, silentWav() for testing
```

---

## Build & Package

```
Development:
  npm run dev
  → Vite dev server (port 5173) + Electron main process
  → HMR for renderer, auto-restart for main process changes
  → CSP disabled in dev (needed for eval/HMR)

Production build:
  npm run build
  → TypeScript check (tsc --noEmit)
  → Vite bundles renderer → dist/
  → Vite bundles electron main → dist-electron/main.js
  → Vite bundles preload → dist-electron/preload.cjs

Package:
  npm run package
  → electron-builder packages for macOS (dmg/zip/mas), Windows (nsis/appx), Linux (AppImage/deb)
  → Code signing via entitlements.mac.plist
  → Auto-updater via electron-updater + GitHub releases
  → Final app size: ~150-200MB (Chromium + Node.js runtime)
```
