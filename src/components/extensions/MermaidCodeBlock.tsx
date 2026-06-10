import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Eye, Code2, AlertCircle, Maximize2, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLightbox } from '@/stores/lightbox';

// Mermaid wants literal color values (hex / rgb()), not CSS var references — its color
// parser blows up on `rgb(var(--c-bg) / 1)`. We resolve our `--c-*` vars (which hold
// "r g b" triples) to real `rgb(r, g, b)` strings and re-init when the theme changes.

function readThemeColor(varName: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!raw) return fallback;
  // Our vars are stored as "R G B" (e.g. "247 243 236"). Convert to a proper rgb().
  const parts = raw.split(/\s+/).map((p) => parseInt(p, 10));
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
  }
  return raw; // Whatever it is, hope it parses.
}

let lastThemeKey = '';
function ensureMermaidInit() {
  const themeKey = document.documentElement.getAttribute('data-theme-name') ?? 'default';
  const mode = document.documentElement.getAttribute('data-mode') ?? 'light';
  const key = `${themeKey}:${mode}`;
  if (key === lastThemeKey) return;
  lastThemeKey = key;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    // 'loose' lets HTML labels, links, and a wider range of diagram types render.
    // The vault is local + trusted, so this is safe and renders far more diagrams.
    securityLevel: 'loose',
    flowchart: { htmlLabels: true, curve: 'basis' },
    fontFamily: 'Inter Variable, system-ui, sans-serif',
    themeVariables: {
      background: readThemeColor('--c-bg-elevated', '#ffffff'),
      primaryColor: readThemeColor('--c-bg-elevated', '#ffffff'),
      primaryTextColor: readThemeColor('--c-text', '#111111'),
      primaryBorderColor: readThemeColor('--c-border', '#cccccc'),
      lineColor: readThemeColor('--c-text-muted', '#666666'),
      secondaryColor: readThemeColor('--c-bg-hover', '#f0f0f0'),
      tertiaryColor: readThemeColor('--c-bg', '#fafafa'),
      noteBkgColor: readThemeColor('--c-bg-hover', '#f0f0f0'),
      noteTextColor: readThemeColor('--c-text', '#111111'),
    },
  });
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

  const source = props.node.textContent;

  // Re-render the diagram whenever the source changes (debounced).
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
  }, [source, view, isMermaid]);

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
              onClick={() => useLightbox.getState().open({ kind: 'svg', svg, title: 'mermaid' })}
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
        <div ref={previewRef} className="p-4 grid place-items-center min-h-[80px]" contentEditable={false}>
          {err ? (
            <div className="flex items-start gap-2 text-[12px] text-red-500 max-w-full">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <pre className="whitespace-pre-wrap font-mono text-[11.5px]">{err}</pre>
            </div>
          ) : svg ? (
            <div
              className="max-w-full overflow-x-auto cursor-zoom-in"
              title="Click to enlarge"
              onClick={() => useLightbox.getState().open({ kind: 'svg', svg, title: 'mermaid' })}
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
