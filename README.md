# Side

A quiet, local-first second brain. Notion-easy editor, Obsidian-deep linking. Notes stay as plain markdown files on your Mac — no cloud, no account, no lock-in.

## Highlights

- **TipTap editor** — block-style writing with a slash menu, drag handles, tables, code with syntax highlighting, image paste/drop. Saves as plain markdown on every keystroke.
- **Wikilinks & mentions** — type `[[` for note autocomplete, `@` for a unified picker (notes, tags, dates), `#` for tags. Backlinks panel always visible.
- **Connections graph** — Sigma + WebGL graph of every wikilink in your vault, coloured by folder, with hover highlighting and a local-graph mode.
- **Canvas** — React Flow whiteboard for spatial thinking. Drag notes from the sidebar to embed them as live cards. Saves as `.canvas` JSON (Obsidian-compatible).
- **Daily notes** — date masthead, mood strip, "yesterday's loose ends" auto-pulled from the previous day. ⌘D opens today.
- **Six themes** — Paper, Ink, Forest, Dusk, Carbon, Rose. Each in light + dark. CSS-variable driven so the editor, graph, and canvas all change at once.
- **Local-first** — your vault is just a folder of `.md` files. Move it to iCloud Drive, Dropbox, or Syncthing for sync. The app doesn't run a sync service.
- **Onboarding tour, daily tips, full shortcuts cheatsheet** — opens on first launch and any time after via ⌘K or ⌘/.
- **Export** — PDF (via Electron's print engine), HTML, or plain markdown.

## Repo layout

```
side-deck/
├── electron/          # Electron main + preload (Node side)
├── src/               # React renderer (the app)
│   ├── components/    # Editor, GraphView, CanvasView, Sidebar, ...
│   ├── stores/        # Zustand stores (vault, theme, ui, ...)
│   └── lib/           # Markdown helpers, image saving, export
├── web/               # Astro landing page (separate project)
├── package.json       # Desktop app
└── README.md
```

## Run the desktop app

```bash
npm install
npm run dev
```

Electron opens, you pick a folder for your vault, and you're off. The first launch opens an onboarding tour with the basics.

## Run the landing page

```bash
cd web
npm install
npm run dev
```

Visit http://localhost:4321. Pure static site, deploys cleanly to Vercel/Netlify with the project root set to `web/`.

## Stack

- Electron 33 + Vite 6 + React 18 + TypeScript
- TipTap (editor) with markdown round-trip via `tiptap-markdown`
- Sigma 3 (graph) + Graphology
- React Flow (canvas)
- Tailwind 3 with CSS-variable themes
- Zustand for state
- Astro 5 (landing site)

## Status

`v0.1` — it works, the demo vault has rich linked notes for visualizing the graph and canvas. macOS-only for now; cross-platform Electron builds are mechanical to add. PRs welcome.

## License

MIT.
