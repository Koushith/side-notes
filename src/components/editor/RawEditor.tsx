import { useEffect, useRef, useState, useMemo, createElement } from 'react';
import { useVault } from '@/stores/vault';
import { api } from '@/lib/api';
import { joinPath, basenameNoExt, isCodePath } from '@/lib/utils';
import { ViewModeTabs } from '../shared/ViewModeTabs';
import { createLowlight, common } from 'lowlight';

const lowlight = createLowlight(common);

const EXT_TO_LANG: Record<string, string> = {
  json: 'json', html: 'xml', xml: 'xml', css: 'css', scss: 'scss',
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  py: 'python', rs: 'rust', go: 'go', rb: 'ruby', java: 'java',
  yaml: 'yaml', yml: 'yaml', toml: 'ini', sh: 'bash', zsh: 'bash',
  sql: 'sql', graphql: 'graphql',
};

function getLang(rel: string): string | undefined {
  const ext = rel.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_LANG[ext];
}

function hastToReact(node: any, key?: number): React.ReactNode {
  if (node.type === 'text') return node.value;
  if (node.type === 'element') {
    const props: any = { key };
    if (node.properties?.className) {
      props.className = Array.isArray(node.properties.className)
        ? node.properties.className.join(' ')
        : node.properties.className;
    }
    return createElement(
      node.tagName,
      props,
      node.children?.map((c: any, i: number) => hastToReact(c, i))
    );
  }
  if (node.type === 'root') {
    return node.children?.map((c: any, i: number) => hastToReact(c, i));
  }
  return null;
}

interface Props {
  rel: string;
  vaultPath: string;
}

export function RawEditor({ rel, vaultPath }: Props) {
  const files = useVault((s) => s.files);
  const saveFile = useVault((s) => s.saveFile);
  const [content, setContent] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const lastRel = useRef(rel);
  const isCode = isCodePath(rel);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setEditing(false);
    (async () => {
      try {
        const raw = await api.files.read(joinPath(vaultPath, rel));
        if (cancelled) return;
        setContent(raw);
        lastRel.current = rel;
        setLoaded(true);
      } catch (err) {
        console.error('Failed to load file', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rel, vaultPath]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
    };
  }, []);

  function onChange(value: string) {
    setContent(value);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    const targetRel = lastRel.current;
    saveTimer.current = window.setTimeout(() => {
      saveFile(targetRel, value).catch(console.error);
    }, 400);
  }

  const highlighted = useMemo(() => {
    if (!isCode || editing || !content) return null;
    const lang = getLang(rel);
    try {
      const tree = lang ? lowlight.highlight(lang, content) : lowlight.highlightAuto(content);
      return hastToReact(tree);
    } catch {
      return null;
    }
  }, [content, isCode, editing, rel]);

  const file = files.get(rel);
  const title = file?.title ?? (rel.split('/').pop() ?? basenameNoExt(rel));
  const ext = rel.split('.').pop()?.toUpperCase() ?? '';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-16 pt-14 pb-2">
        <div className="max-w-3xl mx-auto">
          {!isCode && (
            <div className="flex justify-end mb-3">
              <ViewModeTabs />
            </div>
          )}
          <h1 className="font-serif text-[40px] font-semibold tracking-tight leading-[1.1] text-text">
            {title}
          </h1>
          <div className="text-[12.5px] text-text-muted mt-2.5 flex items-center gap-2">
            {isCode ? (
              <>
                <span className="px-1.5 py-0.5 rounded bg-bg-hover text-[11px] font-medium uppercase tracking-wide">
                  {ext}
                </span>
                <button
                  onClick={() => setEditing((v) => !v)}
                  className="text-text-muted hover:text-text transition-colors"
                >
                  {editing ? 'View highlighted' : 'Edit source'}
                </button>
              </>
            ) : (
              'Editing raw markdown source'
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-16 pb-10">
        <div className="max-w-3xl mx-auto h-full">
          {isCode && !editing && highlighted ? (
            <pre className="font-mono text-[13px] leading-relaxed text-text whitespace-pre overflow-x-auto hljs">
              <code>{highlighted}</code>
            </pre>
          ) : (
            <textarea
              value={content}
              onChange={(e) => onChange(e.target.value)}
              spellCheck={false}
              disabled={!loaded}
              className="w-full h-full min-h-[60vh] resize-none bg-transparent outline-none border-none font-mono text-[13px] leading-relaxed text-text placeholder:text-text-subtle"
              placeholder={isCode ? '' : '# Start typing markdown…'}
            />
          )}
        </div>
      </div>
    </div>
  );
}
