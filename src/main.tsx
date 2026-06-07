import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Tell Excalidraw to load its self-hosted fonts from the directory that contains
// index.html (fonts copied there by scripts/copy-excalidraw-assets.mjs). Using a
// fully-resolved absolute URL — rather than "/" — keeps it working under both the
// dev server (http://) and the packaged app (file://), where "/" would resolve to
// the filesystem root. Must be set before Excalidraw is imported.
(window as unknown as { EXCALIDRAW_ASSET_PATH: string }).EXCALIDRAW_ASSET_PATH = new URL(
  '.',
  window.location.href
).href;
// Bundled fonts — keeps the app fully offline (no Google CDN call at runtime).
// Variable woff2s ship every weight + style in one file, ~30KB per family.
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/source-serif-4';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/shift-away.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
