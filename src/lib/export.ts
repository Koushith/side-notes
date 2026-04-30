import { api } from '@/lib/api';
import { joinPath, basenameNoExt } from '@/lib/utils';

const STYLE = `
:root { color-scheme: light; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif;
  color: #1f2330;
  background: #ffffff;
  line-height: 1.65;
  max-width: 760px;
  margin: 32px auto;
  padding: 0 24px 64px;
  font-size: 15px;
}
h1 { font-size: 2em; margin: 1.2em 0 0.4em; line-height: 1.2; }
h2 { font-size: 1.5em; margin: 1.2em 0 0.3em; line-height: 1.25; }
h3 { font-size: 1.2em; margin: 1em 0 0.25em; }
p, ul, ol, blockquote, pre, table { margin: 0.5em 0; }
ul, ol { padding-left: 1.4em; }
blockquote { border-left: 3px solid #c9d3ff; padding-left: 1em; color: #5a6378; }
code { background: #f3f3ee; color: #b06a1f; padding: 0.1em 0.3em; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.9em; }
pre { background: #f6f6f1; border: 1px solid #e6e6dc; border-radius: 8px; padding: 12px 14px; overflow-x: auto; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.9em; }
pre code { background: transparent; color: #1f2330; padding: 0; }
hr { border: none; border-top: 1px solid #e6e6dc; margin: 1.4em 0; }
img { max-width: 100%; border-radius: 6px; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #d8d8d0; padding: 6px 10px; vertical-align: top; }
th { background: #f3f3ee; font-weight: 600; text-align: left; }
a { color: #2a59c4; }
a.wikilink { color: #1f2330; background: #eaf0ff; padding: 0.05em 0.35em; border-radius: 4px; text-decoration: none; }
.tag { color: #b06a1f; background: #faedd6; padding: 0.05em 0.4em; border-radius: 999px; font-size: 0.85em; font-weight: 500; }
ul[data-type="taskList"] { list-style: none; padding-left: 0.5em; }
ul[data-type="taskList"] li { display: flex; gap: 0.5em; align-items: flex-start; }
@media print {
  body { margin: 0; padding: 0 8mm; max-width: none; }
  pre, blockquote, img { page-break-inside: avoid; }
}
`;

function buildExportHtml(title: string, bodyHtml: string): string {
  // The body HTML may contain vault:// image URLs which won't load outside Electron;
  // for export we strip image tags or leave as-is (PDF goes through Electron so they work).
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escape(title)}</title>
<style>${STYLE}</style></head>
<body>
<h1>${escape(title)}</h1>
${bodyHtml}
</body></html>`;
}

function escape(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
}

export async function exportMarkdown(vaultPath: string, rel: string) {
  const full = joinPath(vaultPath, rel);
  const md = await api.files.read(full);
  return api.exportNote('md', basenameNoExt(rel) + '.md', md);
}

export async function exportHtml(rel: string, title: string, bodyHtml: string) {
  const html = buildExportHtml(title, bodyHtml);
  return api.exportNote('html', basenameNoExt(rel) + '.html', html);
}

export async function exportPdf(rel: string, title: string, bodyHtml: string) {
  // For PDF the print window has access to vault:// since it's an Electron BrowserWindow,
  // so images render fine.
  const html = buildExportHtml(title, bodyHtml);
  return api.exportNote('pdf', basenameNoExt(rel) + '.pdf', html);
}
