# SideNotes — Release Videos

Remotion + Playwright pipeline for release announcement videos.

## Layout

```
remotion/
├─ src/                     # Remotion compositions (motion typography)
│  ├─ Root.tsx              # Composition registry (1920×1080 + vertical)
│  ├─ V030.tsx              # v0.3.0 main composition (~60s)
│  ├─ sections/             # Per-beat section components
│  └─ components/           # Reusable motion primitives
├─ capture/                 # Playwright app-capture rig (opt-in)
│  └─ capture.spec.ts       # Drives the Electron app, writes /public/captures/*.webm
├─ public/                  # Static assets Remotion can reference
└─ release/v0.3.0.mp4       # Rendered output (gitignored)
```

## Render the v0.3.0 video

```bash
cd remotion
npm install
npm run render            # → out/v0.3.0.mp4
npm run render-vertical   # → ../release/v0.3.0-vertical.mp4
```

Preview interactively while editing:

```bash
npm start                 # Remotion Studio at http://localhost:3000
```

A single still for thumbnails:

```bash
npm run still             # → ../release/v0.3.0-frame.png
```

## (Optional) Capture live app footage

The base typography video doesn't require any captures. If you want real Electron
footage layered into a future composition:

```bash
# 1. Build the desktop app from the repo root
cd .. && npm run build

# 2. Run the capture rig
cd remotion && npm run capture
```

This launches the app against a *throwaway temp vault* (your real notes are never
touched) and records a 1920×1080 WebM into `remotion/public/captures/`. You can
then drop `<OffthreadVideo src={staticFile('captures/<name>.webm')} />` into a
section to composite it under the motion text.

## Editing the script

Sections live in `src/sections/`. Reorder, change durations, or add new ones in
`src/V030.tsx`:

```ts
const SCRIPT = [
  { key: 'intro', hold: 130, render: (h) => <Intro hold={h} /> },
  // ...
];
```

`hold` is frames at 30fps — 150 ≈ 5 seconds.

## Color & font tokens

`src/theme.ts` mirrors the Carbon · dark palette from `src/stores/theme.ts` so the
video reads as "this is the app." Keep them in sync if Carbon shifts.
