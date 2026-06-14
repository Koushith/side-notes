import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Eye, Code2, AlertCircle, Maximize2, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLightbox } from '@/stores/lightbox';
import { useTheme } from '@/stores/theme';

// Tint the diagram with the app's own palette so it reads like part of the note
// (Obsidian does the same) instead of Mermaid's stock lavender-and-yellow. Our `--c-*`
// tokens are "R G B" triples; Mermaid's color parser needs literal rgb()/hex, so we
// resolve them here. Earlier this looked broken only because the diagram wasn't
// re-rendered on theme switch — that's fixed now (see the render effect's deps), and
// the cache key below includes the theme NAME so a same-mode theme change re-inits.

function readThemeColor(varName: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!raw) return fallback;
  const parts = raw.split(/\s+/).map((p) => parseInt(p, 10));
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
  }
  return raw;
}

let lastThemeKey = '';
function ensureMermaidInit() {
  const themeName = document.documentElement.getAttribute('data-theme-name') ?? 'default';
  const mode = document.documentElement.getAttribute('data-mode') ?? 'light';
  const key = `${themeName}:${mode}`;
  if (key === lastThemeKey) return;
  lastThemeKey = key;

  const canvas = readThemeColor('--c-bg', mode === 'dark' ? '#1e1e1e' : '#faf8f3');
  const nodeFill = readThemeColor('--c-bg-hover', mode === 'dark' ? '#2a2a2a' : '#efe9df');
  const text = readThemeColor('--c-text', mode === 'dark' ? '#ededed' : '#2b2620');
  const accent = readThemeColor('--c-accent', '#7c6f5b');
  const line = readThemeColor('--c-text-muted', mode === 'dark' ? '#9a9a9a' : '#6b6357');
  const clusterBg = readThemeColor('--c-bg-elevated', mode === 'dark' ? '#262626' : '#f4efe6');
  const clusterBorder = readThemeColor('--c-border', mode === 'dark' ? '#3a3a3a' : '#ddd4c5');

  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    // The vault is local + trusted, so 'loose' is safe and renders more diagram types.
    securityLevel: 'loose',
    // htmlLabels:false renders labels as native SVG <text>, which Mermaid measures
    // precisely. With htmlLabels:true the labels are HTML in a <foreignObject> that
    // inherits the editor's line-height, so text grew taller than its box and got
    // clipped. useMaxWidth keeps each diagram at its natural size, only scaling down
    // to fit the column (no upscaling small diagrams into giant blurry boxes).
    htmlLabels: false,
    flowchart: { htmlLabels: false, curve: 'basis', useMaxWidth: true, padding: 16, nodeSpacing: 55, rankSpacing: 60 },
    fontFamily: 'Inter Variable, system-ui, sans-serif',
    themeVariables: {
      fontSize: '14px',
      background: canvas,
      // Nodes: a subtle raised surface with an accent-tinted border + theme text.
      mainBkg: nodeFill,
      primaryColor: nodeFill,
      primaryTextColor: text,
      primaryBorderColor: accent,
      nodeBorder: accent,
      nodeTextColor: text,
      textColor: text,
      lineColor: line,
      // Edge labels sit on the canvas, so match it (no stock light-gray pill).
      edgeLabelBackground: canvas,
      tertiaryTextColor: text,
      // Subgraphs / notes: a quiet elevated wash, not Mermaid's yellow.
      clusterBkg: clusterBg,
      clusterBorder: clusterBorder,
      secondaryColor: clusterBg,
      tertiaryColor: clusterBg,
      noteBkgColor: clusterBg,
      noteTextColor: text,
      noteBorderColor: clusterBorder,
      titleColor: text,
    },
  });
}

// For the lightbox: pin the SVG to its intrinsic pixel size (from the viewBox) so
// the text renders at its designed point size — readable — and the user pans/zooms
// around a large diagram instead of squinting at a shrunk-to-fit overview.
function naturalSvg(svg: string): string {
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/i);
  let s = svg
    .replace(/style="max-width:[^"]*"/i, '')
    .replace(/(<svg[^>]*?)\swidth="[^"]*"/i, '$1')
    .replace(/(<svg[^>]*?)\sheight="[^"]*"/i, '$1');
  if (vb) {
    s = s.replace(/<svg /i, `<svg width="${vb[1]}" height="${vb[2]}" style="display:block" `);
  }
  return s;
}

let mermaidIdCounter = 0;

function MermaidNodeView(props: NodeViewProps) {
  const language: string = props.node.attrs.language ?? '';
  const isMermaid = language?.toLowerCase() === 'mermaid';
  const [view, setView] = useState<'preview' | 'source'>(isMermaid ? 'preview' : 'source');
  const [svg, setSvg] = useState<string>('');
  const [err, setErr] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const renderId = useRef(`mermaid-${++mermaidIdCounter}`);
  // Re-render when the app theme/mode changes so a diagram rendered in dark mode
  // gets re-rendered with the light palette (and vice versa).
  const mode = useTheme((s) => s.mode);
  const themeKey = useTheme((s) => s.theme);

  const source = props.node.textContent;

  // Re-render the diagram whenever the source or theme changes (debounced).
  useEffect(() => {
    if (!isMermaid) return;
    if (view !== 'preview') return;
    if (!source.trim()) {
      setSvg('');
      setErr(null);
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      try {
        ensureMermaidInit();
        const { svg } = await mermaid.render(renderId.current, source);
        if (cancelled) return;
        setSvg(svg);
        setErr(null);
      } catch (e) {
        if (cancelled) return;
        setSvg('');
        setErr((e as Error).message ?? 'Failed to render diagram');
      }
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [source, view, isMermaid, mode, themeKey]);

  // Non-mermaid blocks render as a framed code block: a header with the language
  // label and a copy button, and the lowlight-highlighted source below.
  if (!isMermaid) {
    return <CodeBlockView language={language} text={source} />;
  }

  return (
    <NodeViewWrapper
      as="div"
      className="my-4 rounded-lg border border-border bg-bg-elevated overflow-hidden not-prose"
    >
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b border-border-subtle bg-bg text-[11px]"
        contentEditable={false}
      >
        <span className="font-mono uppercase tracking-[0.1em] text-text-subtle">mermaid</span>
        <div className="flex items-center gap-0.5">
          {view === 'preview' && svg && !err && (
            <ToggleBtn
              active={false}
              onClick={() => useLightbox.getState().open({ kind: 'svg', svg: naturalSvg(svg), title: 'mermaid' })}
              icon={<Maximize2 size={11} />}
              label="Enlarge"
            />
          )}
          <ToggleBtn active={view === 'preview'} onClick={() => setView('preview')} icon={<Eye size={11} />} label="Preview" />
          <ToggleBtn active={view === 'source'} onClick={() => setView('source')} icon={<Code2 size={11} />} label="Source" />
        </div>
      </div>

      {/* Source pane — kept mounted but hidden so NodeViewContent remains in the DOM
          and ProseMirror can keep tracking edits. tiptap loses the content otherwise. */}
      <div className={view === 'source' ? 'block' : 'hidden'}>
        <pre className="m-0 p-3 text-[12.5px] leading-[1.55] font-mono overflow-x-auto bg-transparent">
          <NodeViewContent as="code" className="language-mermaid" />
        </pre>
      </div>

      {view === 'preview' && (
        <div ref={previewRef} className="p-5 bg-bg min-h-[120px] flex items-center justify-center overflow-x-auto" contentEditable={false}>
          {err ? (
            <div className="flex items-start gap-2 text-[12px] text-red-500 max-w-full">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <pre className="whitespace-pre-wrap font-mono text-[11.5px]">{err}</pre>
            </div>
          ) : svg ? (
            // Raw Mermaid SVG: its own `max-width` keeps the diagram at natural size,
            // scaling down only to fit the column. Enlarge opens the full-size, pannable view.
            <div
              className="max-w-full cursor-zoom-in [&_svg]:h-auto [&_svg]:max-w-full"
              title="Click to enlarge"
              onClick={() => useLightbox.getState().open({ kind: 'svg', svg: naturalSvg(svg), title: 'mermaid' })}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div className="text-[12px] text-text-subtle italic">
              {source.trim() ? 'Rendering…' : 'Empty diagram — switch to Source and start typing.'}
            </div>
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
}

function ToggleBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        // Prevent ProseMirror from stealing focus.
        e.preventDefault();
        onClick();
      }}
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-[3px] rounded text-[10.5px] transition-colors',
        active
          ? 'bg-bg-elevated text-text border border-border'
          : 'text-text-subtle hover:text-text border border-transparent'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// A framed code block: header with the language + a copy button, and the
// lowlight-highlighted source (NodeViewContent keeps ProseMirror in control of
// editing + decorations).
function CodeBlockView({ language, text }: { language: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const label = language && language !== 'null' ? language : 'code';
  const onCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    });
  };
  return (
    <NodeViewWrapper as="div" className="my-4 rounded-lg border border-border bg-bg-elevated overflow-hidden not-prose">
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b border-border-subtle bg-bg text-[11px]"
        contentEditable={false}
      >
        <span className="font-mono uppercase tracking-[0.1em] text-text-subtle">{label}</span>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onCopy();
          }}
          className="inline-flex items-center gap-1 px-1.5 py-[3px] rounded text-[10.5px] text-text-subtle hover:text-text transition-colors"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="hljs m-0 p-3 text-[12.5px] leading-[1.55] font-mono overflow-x-auto bg-transparent">
        <NodeViewContent as="code" className={language ? `language-${language}` : undefined} />
      </pre>
    </NodeViewWrapper>
  );
}

/** Drop-in replacement for `CodeBlockLowlight` that swaps in a Mermaid preview
 *  whenever the language is `mermaid`. All other languages render normally. */
export const MermaidCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(MermaidNodeView);
  },
});
